import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import { areasApi, type AreaLavado } from '../../api/ajustesApi';
import { confirmarBorrado, ListaAdmin } from '../../components/ajustes/ListaAdmin';
import { AppText, Button, InlineAlert, Sheet, TextField, toast } from '../../components/ui';
import { useCrudAdmin } from '../../hooks/useCrudAdmin';
import type { AppScreenProps } from '../../navigation/types';
import { space } from '../../theme';

const esActiva = (a: AreaLavado) => a.activa;
const conEstado = (a: AreaLavado, activa: boolean): AreaLavado => ({ ...a, activa });

/** Etapas por las que pasa un pedido (recepción, lavado, secado…): su orden y el tiempo estimado de cada una. */
export function AreasScreen({ navigation }: AppScreenProps<'Areas'>) {
  const { query, toggle, refrescar } = useCrudAdmin<AreaLavado>('areas', areasApi, esActiva, conEstado);
  const [form, setForm] = useState<AreaLavado | null | undefined>(undefined);
  const areas = [...(query.data ?? [])].sort((a, b) => Number(b.activa) - Number(a.activa) || a.orden - b.orden);
  const siguienteOrden = Math.min(100, Math.max(0, ...(query.data ?? []).map((a) => a.orden)) + 1);

  return (
    <>
      <ListaAdmin<AreaLavado> titulo="Áreas de lavado" subtitulo="Etapas por las que pasa un pedido" onBack={navigation.goBack} datos={areas}
        cargando={query.isLoading} error={query.isError} onReintentar={() => void query.refetch()}
        refrescando={query.isRefetching} onRefrescar={() => void query.refetch()}
        vista={(a) => ({
          titulo: `${a.orden}. ${a.nombre}`, subtitulo: `Tiempo estimado: ${a.tiempoEstMinutos} min`, activo: a.activa, icono: 'git-branch-outline',
          etiquetas: a.enUso ? [{ label: 'En uso', tone: 'primary' }] : [],
        })}
        encabezado={<AppText variant="caption">Los pedidos avanzan por estas áreas en orden. Desactiva una para saltarla sin perder el historial.</AppText>}
        onEditar={setForm} onToggle={(a) => toggle.mutate(a)} onNuevo={() => setForm(null)} nuevoLabel="Nueva área"
        vacioTitulo="Sin áreas" vacioTexto="Crea las etapas de tu proceso: recepción, lavado, secado, doblado…" />
      {form !== undefined && <AreaSheet area={form} ordenSugerido={siguienteOrden} onClose={() => setForm(undefined)} onHecho={() => void refrescar()} />}
    </>
  );
}

function AreaSheet({ area, ordenSugerido, onClose, onHecho }: { area: AreaLavado | null; ordenSugerido: number; onClose: () => void; onHecho: () => void }) {
  const [nombre, setNombre] = useState(area?.nombre ?? '');
  const [orden, setOrden] = useState(String(area?.orden ?? ordenSugerido));
  const [minutos, setMinutos] = useState(String(area?.tiempoEstMinutos ?? 30));
  const [touched, setTouched] = useState(false);
  const ord = Number(orden);
  const min = Number(minutos);
  const errors = {
    nombre: nombre.trim().length < 2 ? 'Escribe al menos 2 letras.' : '',
    orden: !Number.isInteger(ord) || ord < 1 || ord > 100 ? 'Un número entero entre 1 y 100.' : '',
    minutos: !Number.isInteger(min) || min < 1 || min > 1000 ? 'Entre 1 y 1000 minutos.' : '',
  };
  const valid = Object.values(errors).every((e) => !e);
  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = { nombre: nombre.trim(), orden: ord, tiempoEstMinutos: min, activa: area?.activa ?? true };
      if (area) await areasApi.actualizar(area.id, cuerpo);
      else await areasApi.crear(cuerpo);
    },
    onSuccess: () => { onHecho(); toast(area ? 'Área actualizada' : 'Área creada'); onClose(); },
  });
  const borrar = useMutation({
    mutationFn: () => areasApi.borrar(area!.id),
    onSuccess: (r) => { onHecho(); toast(r.mensaje || 'Listo'); onClose(); },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  return (
    <Sheet visible onClose={onClose} title={area ? 'Editar área' : 'Nueva área'} subtitle="Una etapa del proceso de tus pedidos">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Nombre" placeholder="Ej. Secado" value={nombre} onChangeText={setNombre} maxLength={60} autoCapitalize="sentences" autoFocus={!area}
          error={touched ? errors.nombre : ''} />
        <View style={styles.row}>
          <View style={styles.flex}><TextField label="Orden" keyboardType="number-pad" value={orden} onChangeText={(v) => setOrden(v.replace(/\D/g, ''))} maxLength={3}
            error={touched ? errors.orden : ''} hint="1 = primera etapa" /></View>
          <View style={styles.flex}><TextField label="Minutos" keyboardType="number-pad" value={minutos} onChangeText={(v) => setMinutos(v.replace(/\D/g, ''))} maxLength={4}
            error={touched ? errors.minutos : ''} hint="Tiempo estimado" /></View>
        </View>
        {guardar.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(guardar.error)} />}
      </ScrollView>
      <Button label={area ? 'Guardar cambios' : 'Crear área'} icon="checkmark" busy={guardar.isPending}
        onPress={() => { setTouched(true); if (valid) guardar.mutate(); }} />
      {area && <Button label={area.enUso ? 'Desactivar área' : 'Eliminar área'} icon="trash-outline" variant="ghost" size="sm" busy={borrar.isPending}
        onPress={() => confirmarBorrado(area.nombre, area.enUso, () => borrar.mutate())} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { maxHeight: 420 },
  content: { gap: space.md, paddingBottom: space.sm },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
});
