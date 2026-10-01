import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import { personalApi, rolesPersonalApi, type Empleado } from '../../api/ajustesApi';
import { parseFechaPeru } from '../../api/reportesApi';
import { confirmarBorrado, ListaAdmin } from '../../components/ajustes/ListaAdmin';
import { AppText, Button, Choice, InlineAlert, Sheet, TextField, toast } from '../../components/ui';
import { useCrudAdmin } from '../../hooks/useCrudAdmin';
import type { AppScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, space } from '../../theme';
import { fechaPeru } from '../../utils/format';

const esActivo = (e: Empleado) => e.activo;
const conEstado = (e: Empleado, activo: boolean): Empleado => ({ ...e, activo });

/** Lista de empleados del negocio (no son usuarios del sistema): nombre, documento, celular, cargo y fecha de ingreso. */
export function PersonalScreen({ navigation }: AppScreenProps<'Personal'>) {
  const { query, toggle, refrescar } = useCrudAdmin<Empleado>('personal', personalApi, esActivo, conEstado);
  const [form, setForm] = useState<Empleado | null | undefined>(undefined);
  const lista = [...(query.data ?? [])].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre));
  return (
    <>
      <ListaAdmin<Empleado> titulo="Personal" subtitulo="Tu equipo de trabajo" onBack={navigation.goBack} datos={lista}
        cargando={query.isLoading} error={query.isError} onReintentar={() => void query.refetch()}
        refrescando={query.isRefetching} onRefrescar={() => void query.refetch()}
        vista={(e) => ({
          titulo: e.nombre, activo: e.activo, icono: 'person-outline',
          subtitulo: [e.cargo, e.celular, e.dni ? `DNI ${e.dni}` : null].filter(Boolean).join(' · ') || undefined,
        })}
        onEditar={setForm} onToggle={(e) => toggle.mutate(e)} onNuevo={() => setForm(null)} nuevoLabel="Nuevo empleado"
        vacioTitulo="Sin empleados" vacioTexto="Registra a las personas que trabajan en tu lavandería." />
      {form !== undefined && <EmpleadoSheet empleado={form} onClose={() => setForm(undefined)} onHecho={() => void refrescar()} />}
    </>
  );
}

function EmpleadoSheet({ empleado, onClose, onHecho }: { empleado: Empleado | null; onClose: () => void; onHecho: () => void }) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const cargos = useQuery({ queryKey: ['ajustes', 'roles-personal', negocioId], queryFn: rolesPersonalApi.listar });
  const [nombre, setNombre] = useState(empleado?.nombre ?? '');
  const [dni, setDni] = useState(empleado?.dni ?? '');
  const [celular, setCelular] = useState(empleado?.celular ?? '');
  const [cargo, setCargo] = useState(empleado?.cargo ?? '');
  const [ingreso, setIngreso] = useState(fechaPeru(empleado?.fechaIngreso));
  const [touched, setTouched] = useState(false);
  const fecha = ingreso.trim() ? parseFechaPeru(ingreso) : null;
  const errors = {
    nombre: nombre.trim().length < 2 ? 'Escribe el nombre completo.' : '',
    dni: dni && !/^\d{8}$/.test(dni) ? 'El DNI tiene 8 dígitos.' : '',
    celular: celular && !/^\+?\d{4,20}$/.test(celular) ? 'Solo números (con + y código de país si es del extranjero).' : '',
    ingreso: ingreso.trim() && !fecha ? 'Usa dd/mm/aaaa.' : '',
  };
  const valid = Object.values(errors).every((e) => !e);
  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = {
        nombre: nombre.trim(), dni: dni || null, celular: celular || null, cargo: cargo.trim() || null,
        fechaIngreso: fecha, activo: empleado?.activo ?? true,
      };
      if (empleado) await personalApi.actualizar(empleado.id, cuerpo);
      else await personalApi.crear(cuerpo);
    },
    onSuccess: () => { onHecho(); toast(empleado ? 'Cambios guardados' : 'Empleado registrado'); onClose(); },
  });
  const borrar = useMutation({
    mutationFn: () => personalApi.borrar(empleado!.id),
    onSuccess: (r) => { onHecho(); toast(r.mensaje || 'Listo'); onClose(); },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const cargosActivos = (cargos.data ?? []).filter((c) => c.activo);
  return (
    <Sheet visible onClose={onClose} title={empleado ? 'Editar empleado' : 'Nuevo empleado'}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Nombre completo" icon="person-outline" placeholder="Ej. María Torres" value={nombre} onChangeText={setNombre} maxLength={120}
          autoCapitalize="words" autoFocus={!empleado} error={touched ? errors.nombre : ''} />
        <View style={styles.row}>
          <View style={styles.flex}><TextField label="DNI" optional keyboardType="number-pad" value={dni} onChangeText={(v) => setDni(v.replace(/\D/g, ''))} maxLength={8} placeholder="8 dígitos"
            error={touched ? errors.dni : ''} /></View>
          <View style={styles.flex}><TextField label="Celular" optional keyboardType="phone-pad" value={celular} onChangeText={(v) => setCelular(v.replace(/[^\d+]/g, ''))} maxLength={21}
            placeholder="999 999 999" error={touched ? errors.celular : ''} /></View>
        </View>
        <TextField label="Cargo" optional icon="briefcase-outline" placeholder="Ej. Planchador" value={cargo} onChangeText={setCargo} maxLength={60} autoCapitalize="sentences" />
        {cargosActivos.length > 0 && <View>
          <AppText variant="caption" color={colors.muted} style={styles.label}>O elige uno de tus cargos:</AppText>
          <View style={styles.choices}>{cargosActivos.map((c) => <Choice key={c.id} label={c.nombre} selected={cargo.trim() === c.nombre} onPress={() => setCargo(c.nombre)} />)}</View>
        </View>}
        <TextField label="Fecha de ingreso" optional placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" value={ingreso} onChangeText={setIngreso} maxLength={10}
          error={touched ? errors.ingreso : ''} />
        {guardar.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(guardar.error)} />}
      </ScrollView>
      <Button label={empleado ? 'Guardar cambios' : 'Registrar empleado'} icon="checkmark" busy={guardar.isPending}
        onPress={() => { setTouched(true); if (valid) guardar.mutate(); }} />
      {empleado && <Button label="Desactivar empleado" icon="person-remove-outline" variant="ghost" size="sm" busy={borrar.isPending}
        onPress={() => confirmarBorrado(empleado.nombre, true, () => borrar.mutate())} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { maxHeight: 500 },
  content: { gap: space.md, paddingBottom: space.sm },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  label: { marginBottom: space.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
