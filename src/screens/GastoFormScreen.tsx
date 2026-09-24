import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { apiErrorMessage } from '../api/errors';
import { getTiposGasto, METODOS_PAGO, registrarGasto, type MetodoPago } from '../api/operationsApi';
import { AppText, BottomBar, Button, Card, Choice, InlineAlert, Screen, StackHeader, TextField, toast } from '../components/ui';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, space } from '../theme';
import { methodLabel, money, parseAmount } from '../utils/format';

export function GastoFormScreen({ navigation }: AppScreenProps<'NuevoGasto'>) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
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
      await Promise.all(['caja', 'dashboard'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
      toast(`Gasto de ${money(amount)} registrado`);
      navigation.goBack();
    },
  });

  return (
    <Screen edges={['top']}>
      <StackHeader title="Registrar gasto" subtitle="Sale de la caja de hoy" close onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.amountCard}>
          <AppText variant="caption">Monto del gasto</AppText>
          <View style={styles.amountRow}>
            <AppText style={styles.currency}>S/</AppText>
            <TextInput value={monto} onChangeText={setMonto} placeholder="0.00" placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad" style={styles.amountInput} autoFocus accessibilityLabel="Monto del gasto" />
          </View>
        </Card>
        <View>
          <AppText variant="captionStrong" color={colors.text} style={styles.label}>¿Cómo se pagó?</AppText>
          <View style={styles.choices}>{METODOS_PAGO.map((m) => <Choice key={m} label={methodLabel(m)} selected={metodo === m} onPress={() => setMetodo(m)} />)}</View>
        </View>
        {!!tipos.data?.length && <View>
          <AppText variant="captionStrong" color={colors.text} style={styles.label}>Categoría <AppText variant="caption">(opcional)</AppText></AppText>
          <View style={styles.choices}>{tipos.data.map((t) => <Choice key={t.id} label={t.nombre} selected={tipoGastoId === t.id}
            onPress={() => setTipoGastoId((c) => (c === t.id ? undefined : t.id))} />)}</View>
        </View>}
        <TextField label="Descripción" optional icon="create-outline" placeholder="Ej. Compra de detergente" value={descripcion}
          onChangeText={setDescripcion} autoCapitalize="sentences" maxLength={300} />
        {metodo === 'EFECTIVO' && <InlineAlert tone="info" text="Los gastos en efectivo se descuentan del efectivo esperado en el cuadre de hoy." />}
        {save.isError && <InlineAlert title="No se pudo registrar" text={apiErrorMessage(save.error)} />}
      </ScrollView>
      <BottomBar><Button label={valid ? `Registrar gasto de ${money(amount)}` : 'Registrar gasto'} icon="checkmark" onPress={() => save.mutate()} disabled={!valid} busy={save.isPending} /></BottomBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxxl, gap: space.xl },
  amountCard: { alignItems: 'center', paddingVertical: space.xl },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  currency: { fontFamily: fonts.bold, fontSize: 26, color: colors.muted },
  amountInput: { minWidth: 140, fontFamily: fonts.extrabold, fontSize: 40, color: colors.danger, textAlign: 'center', paddingVertical: 4 },
  label: { marginBottom: space.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
