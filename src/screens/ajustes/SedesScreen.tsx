import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import { sedesApi, type Sede } from '../../api/ajustesApi';
import { ListaAdmin } from '../../components/ajustes/ListaAdmin';
import { Button, InlineAlert, Sheet, TextField, toast } from '../../components/ui';
import { useCrudAdmin } from '../../hooks/useCrudAdmin';
import type { AppScreenProps } from '../../navigation/types';
import { space } from '../../theme';

const esActiva = (s: Sede) => s.activo;
const conEstado = (s: Sede, activo: boolean): Sede => ({ ...s, activo });

/** Locales del negocio (plan Multisede): nombre, dirección y teléfono. */
export function SedesScreen({ navigation }: AppScreenProps<'Sedes'>) {
  const { query, toggle, refrescar } = useCrudAdmin<Sede>('sedes', sedesApi, esActiva, conEstado);
  const [form, setForm] = useState<Sede | null | undefined>(undefined);
  const lista = [...(query.data ?? [])].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre));
  return (
    <>
      <ListaAdmin<Sede> titulo="Sedes" subtitulo="Tus locales" onBack={navigation.goBack} datos={lista}
        cargando={query.isLoading} error={query.isError} onReintentar={() => void query.refetch()}
        refrescando={query.isRefetching} onRefrescar={() => void query.refetch()}
        vista={(s) => ({ titulo: s.nombre, activo: s.activo, icono: 'storefront-outline', subtitulo: [s.direccion, s.telefono].filter(Boolean).join(' · ') || undefined })}
        onEditar={setForm} onToggle={(s) => toggle.mutate(s)} onNuevo={() => setForm(null)} nuevoLabel="Nueva sede"
        vacioTitulo="Sin sedes" vacioTexto="Agrega los locales de tu negocio." />
      {form !== undefined && <SedeSheet sede={form} onClose={() => setForm(undefined)} onHecho={() => void refrescar()} />}
    </>
  );
}

function SedeSheet({ sede, onClose, onHecho }: { sede: Sede | null; onClose: () => void; onHecho: () => void }) {
  const [nombre, setNombre] = useState(sede?.nombre ?? '');
  const [direccion, setDireccion] = useState(sede?.direccion ?? '');
  const [telefono, setTelefono] = useState(sede?.telefono ?? '');
  const [touched, setTouched] = useState(false);
  const error = nombre.trim().length < 2 ? 'Escribe el nombre de la sede.' : '';
  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = { nombre: nombre.trim(), direccion: direccion.trim() || null, telefono: telefono.trim() || null, activo: sede?.activo ?? true };
      if (sede) await sedesApi.actualizar(sede.id, cuerpo);
      else await sedesApi.crear(cuerpo);
    },
    onSuccess: () => { onHecho(); toast(sede ? 'Sede actualizada' : 'Sede creada'); onClose(); },
  });
  return (
    <Sheet visible onClose={onClose} title={sede ? 'Editar sede' : 'Nueva sede'}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Nombre" icon="storefront-outline" placeholder="Ej. Sede Miraflores" value={nombre} onChangeText={setNombre} maxLength={120}
          autoCapitalize="words" autoFocus={!sede} error={touched ? error : ''} />
        <TextField label="Dirección" optional icon="location-outline" placeholder="Calle, número, distrito" value={direccion} onChangeText={setDireccion} maxLength={200} />
        <TextField label="Teléfono" optional icon="call-outline" keyboardType="phone-pad" placeholder="999 999 999" value={telefono} onChangeText={setTelefono} maxLength={30} />
        {guardar.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(guardar.error)} />}
      </ScrollView>
      <Button label={sede ? 'Guardar cambios' : 'Crear sede'} icon="checkmark" busy={guardar.isPending}
        onPress={() => { setTouched(true); if (!error) guardar.mutate(); }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  content: { gap: space.md, paddingBottom: space.sm },
});
