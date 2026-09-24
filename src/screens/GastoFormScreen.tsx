import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiErrorMessage } from '../api/errors';
import { getTiposGasto, METODOS_PAGO, registrarGasto, type MetodoPago } from '../api/operationsApi';
import { Field } from '../components/Field';
import { Button, Chip, ErrorBox, ScreenTitle, SectionLabel } from '../components/ui';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { methodLabel, parseAmount } from '../utils/format';

export function GastoFormScreen({ navigation }: AppScreenProps<'NuevoGasto'>) {
  const negocioId = useAuthStore((state) => state.session?.usuario.negocioId);
  const queryClient = useQueryClient();
  const tipos = useQuery({ queryKey: ['tipos-gasto', negocioId], queryFn: getTiposGasto });
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [tipoGastoId, setTipoGastoId] = useState<number>();
  const [descripcion, setDescripcion] = useState('');
  const amount = parseAmount(monto);
  const valid = Number.isFinite(amount) && amount > 0 && amount <= 100_000;

  const save = useMutation({
    mutationFn: () => registrarGasto({ monto: amount, metodoPago: metodo, tipoGastoId, descripcion: descripcion.trim() || undefined }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['caja'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.goBack();
    },
  });

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenTitle kicker="CAJA" title="Registrar gasto" onBack={navigation.goBack} />
        <View style={styles.amountBox}>
          <Text style={styles.currency}>S/</Text>
          <TextInput value={monto} onChangeText={setMonto} placeholder="0.00" placeholderTextColor="#B5C5D3" keyboardType="decimal-pad" style={styles.amountInput} autoFocus />
        </View>
        <SectionLabel>Método de pago</SectionLabel>
        <View style={styles.chips}>{METODOS_PAGO.map((m) => <Chip key={m} label={methodLabel(m)} active={metodo === m} onPress={() => setMetodo(m)} color={colors.danger} />)}</View>
        {!!tipos.data?.length && <>
          <SectionLabel>Tipo de gasto</SectionLabel>
          <View style={styles.chips}>{tipos.data.map((t) => <Chip key={t.id} label={t.nombre} active={tipoGastoId === t.id}
            onPress={() => setTipoGastoId((current) => current === t.id ? undefined : t.id)} color={colors.navy} />)}</View>
        </>}
        <View style={styles.spaced}>
          <Field label="Descripción (opcional)" icon="create-outline" placeholder="Ej. Compra de detergente" value={descripcion} onChangeText={setDescripcion} autoCapitalize="sentences" maxLength={300} />
        </View>
        {save.isError && <View style={styles.spaced}><ErrorBox message={apiErrorMessage(save.error)} /></View>}
        <Button label="Registrar gasto" icon="checkmark" onPress={() => save.mutate()} disabled={!valid} busy={save.isPending} style={styles.spaced} />
        {metodo === 'EFECTIVO' && <Text style={styles.note}>Los gastos en efectivo se descuentan del cuadre de caja de hoy.</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  amountBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, height: 84 },
  currency: { color: colors.muted, fontSize: 24, fontWeight: '800' },
  amountInput: { flex: 1, color: colors.danger, fontSize: 36, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  spaced: { marginTop: 18 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 12 },
});
