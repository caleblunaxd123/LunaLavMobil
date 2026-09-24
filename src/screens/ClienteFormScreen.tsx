import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../api/errors';
import { actualizarCliente, crearCliente, getCliente, type Cliente, type ClienteInput } from '../api/operationsApi';
import { AppText, BottomBar, Button, InlineAlert, ListSkeleton, Screen, StackHeader, TextField, toast } from '../components/ui';
import type { AppScreenProps } from '../navigation/types';
import { space } from '../theme';

const clean = (value: string) => value.trim() || null;

/** Mismas reglas que valida la API (ClienteDto), con mensajes por campo. */
export function clienteErrors(input: { nombre: string; celular: string; dni: string; ruc: string }) {
  return {
    nombre: input.nombre.trim().length < 2 ? 'El nombre debe tener al menos 2 caracteres.' : '',
    celular: input.celular.trim() && !/^\+?\d{4,20}$/.test(input.celular.trim()) ? 'Solo números (y + con código de país).' : '',
    dni: input.dni.trim() && !/^\d{8}$/.test(input.dni.trim()) ? 'El DNI tiene 8 dígitos.' : '',
    ruc: input.ruc.trim() && !/^\d{11}$/.test(input.ruc.trim()) ? 'El RUC tiene 11 dígitos.' : '',
  };
}

export function ClienteFormScreen({ navigation, route }: AppScreenProps<'ClienteForm'>) {
  const id = route.params?.id;
  const cliente = useQuery({ queryKey: ['cliente', id], queryFn: () => getCliente(id!), enabled: !!id });
  if (id && !cliente.data) {
    return <Screen><StackHeader title="Editar cliente" close onBack={navigation.goBack} /><View style={styles.content}><ListSkeleton rows={4} /></View></Screen>;
  }
  return <ClienteForm initial={cliente.data} onClose={navigation.goBack}
    onSaved={(saved) => (id ? navigation.goBack() : navigation.replace('ClienteDetalle', { id: saved }))} />;
}

function ClienteForm({ initial, onSaved, onClose }: { initial?: Cliente; onSaved: (id: number) => void; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [celular, setCelular] = useState(initial?.celular ?? '');
  const [dni, setDni] = useState(initial?.dni ?? '');
  const [ruc, setRuc] = useState(initial?.documentoFiscal ?? '');
  const [direccion, setDireccion] = useState(initial?.direccion ?? '');
  const [touched, setTouched] = useState(false);
  const errors = clienteErrors({ nombre, celular, dni, ruc });
  const valid = Object.values(errors).every((e) => !e);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : '');

  const save = useMutation({
    mutationFn: async () => {
      const input: ClienteInput = {
        nombre: nombre.trim(), celular: clean(celular), dni: clean(dni), documentoFiscal: clean(ruc), direccion: clean(direccion),
        // El PUT reemplaza el registro completo: se conservan los datos que este formulario no edita.
        puntos: initial?.puntos ?? 0, fechaNacimiento: initial?.fechaNacimiento ?? null,
      };
      if (initial) { await actualizarCliente(initial.id, input); return initial.id; }
      return (await crearCliente(input)).id;
    },
    onSuccess: async (savedId) => {
      await queryClient.invalidateQueries({ queryKey: ['clientes'] });
      await queryClient.invalidateQueries({ queryKey: ['cliente', savedId] });
      toast(initial ? 'Cliente actualizado' : 'Cliente registrado');
      onSaved(savedId);
    },
  });
  const submit = () => { setTouched(true); if (valid) save.mutate(); };

  return (
    <Screen edges={['top']}>
      <StackHeader title={initial ? 'Editar cliente' : 'Nuevo cliente'} close onBack={onClose} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="body">Solo el nombre es obligatorio. Con el celular podrás avisarle por WhatsApp cuando su pedido esté listo.</AppText>
        <TextField label="Nombre completo" icon="person-outline" placeholder="Ej. María Torres" value={nombre} onChangeText={setNombre}
          autoCapitalize="words" maxLength={120} error={show('nombre')} autoFocus={!initial} />
        <TextField label="Celular / WhatsApp" optional icon="logo-whatsapp" placeholder="999 999 999" value={celular}
          onChangeText={(v) => setCelular(v.replace(/[^\d+]/g, ''))} keyboardType="phone-pad" maxLength={21} error={show('celular')} />
        <View style={styles.row}>
          <View style={styles.flex}><TextField label="DNI" optional placeholder="8 dígitos" value={dni} onChangeText={(v) => setDni(v.replace(/\D/g, ''))}
            keyboardType="number-pad" maxLength={8} error={show('dni')} /></View>
          <View style={styles.flex}><TextField label="RUC" optional placeholder="11 dígitos" value={ruc} onChangeText={(v) => setRuc(v.replace(/\D/g, ''))}
            keyboardType="number-pad" maxLength={11} error={show('ruc')} /></View>
        </View>
        <TextField label="Dirección" optional icon="location-outline" placeholder="Calle, número, distrito" value={direccion}
          onChangeText={setDireccion} autoCapitalize="sentences" maxLength={200} hint="Necesaria para recojos a domicilio." />
        {save.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(save.error)} />}
      </ScrollView>
      <BottomBar><Button label={initial ? 'Guardar cambios' : 'Registrar cliente'} icon="checkmark" onPress={submit} busy={save.isPending} /></BottomBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl, gap: space.lg },
  row: { flexDirection: 'row', gap: space.md },
});
