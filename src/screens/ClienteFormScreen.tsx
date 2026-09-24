import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiErrorMessage } from '../api/errors';
import { actualizarCliente, crearCliente, getCliente, type Cliente, type ClienteInput } from '../api/operationsApi';
import { Field } from '../components/Field';
import { Button, ErrorBox, ScreenTitle, StateView } from '../components/ui';
import type { AppScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';

const clean = (value: string) => value.trim() || null;

/** Las mismas reglas que valida la API (ClienteDto), para avisar antes de enviar. */
export function validateCliente(input: { nombre: string; celular: string; dni: string; ruc: string }) {
  if (input.nombre.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  if (input.celular.trim() && !/^\+?\d{4,20}$/.test(input.celular.trim())) return 'El celular solo admite números (y + con código de país).';
  if (input.dni.trim() && !/^\d{8}$/.test(input.dni.trim())) return 'El DNI debe tener 8 dígitos.';
  if (input.ruc.trim() && !/^\d{11}$/.test(input.ruc.trim())) return 'El RUC debe tener 11 dígitos.';
  return '';
}

export function ClienteFormScreen({ navigation, route }: AppScreenProps<'ClienteForm'>) {
  const id = route.params?.id;
  const cliente = useQuery({ queryKey: ['cliente', id], queryFn: () => getCliente(id!), enabled: !!id });
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenTitle kicker={id ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'} title={id ? 'Actualizar datos' : 'Registrar cliente'} onBack={navigation.goBack} />
        {id && !cliente.data
          ? <StateView loading={cliente.isLoading} error={cliente.isError} empty={false} />
          : <ClienteForm initial={cliente.data} onSaved={(saved) => {
            if (id) navigation.goBack();
            else navigation.replace('ClienteDetalle', { id: saved });
          }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function ClienteForm({ initial, onSaved }: { initial?: Cliente; onSaved: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [celular, setCelular] = useState(initial?.celular ?? '');
  const [dni, setDni] = useState(initial?.dni ?? '');
  const [ruc, setRuc] = useState(initial?.documentoFiscal ?? '');
  const [direccion, setDireccion] = useState(initial?.direccion ?? '');
  const [touched, setTouched] = useState(false);
  const validation = validateCliente({ nombre, celular, dni, ruc });

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
      onSaved(savedId);
    },
  });

  const submit = () => { setTouched(true); if (!validation) save.mutate(); };

  return <View style={styles.form}>
    <Field label="Nombre completo" icon="person-outline" placeholder="Ej. María Torres" value={nombre} onChangeText={setNombre} autoCapitalize="words" maxLength={120} />
    <Field label="Celular (opcional)" icon="call-outline" placeholder="999 999 999" value={celular} onChangeText={(v) => setCelular(v.replace(/[^\d+]/g, ''))} keyboardType="phone-pad" maxLength={21} />
    <Field label="DNI (opcional)" icon="card-outline" placeholder="8 dígitos" value={dni} onChangeText={(v) => setDni(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={8} />
    <Field label="RUC (opcional)" icon="document-text-outline" placeholder="11 dígitos, para facturas" value={ruc} onChangeText={(v) => setRuc(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={11} />
    <Field label="Dirección (opcional)" icon="location-outline" placeholder="Necesaria para recojos a domicilio" value={direccion} onChangeText={setDireccion} autoCapitalize="sentences" maxLength={200} />
    {touched && !!validation && <ErrorBox message={validation} />}
    {save.isError && <ErrorBox message={apiErrorMessage(save.error)} />}
    <Button label={initial ? 'Guardar cambios' : 'Registrar cliente'} icon="checkmark" onPress={submit} busy={save.isPending} />
    <Text style={styles.note}>Los datos del cliente se comparten con la web de LunaLav al instante.</Text>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  form: { gap: 16 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
