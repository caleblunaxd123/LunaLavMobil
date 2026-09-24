import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiErrorMessage } from '../api/errors';
import { avanzarPedido, getPagosPedido, getPedido, METODOS_PAGO, registrarPago, type MetodoPago, type Pedido } from '../api/operationsApi';
import { Badge, Button, Card, Chip, ErrorBox, ScreenTitle, SectionLabel, StateView } from '../components/ui';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { dateTime, methodLabel, money, parseAmount, paymentColor, paymentLabel, processColor, processLabel, whatsappUrl } from '../utils/format';

const FINAL_STATES = ['ENTREGADO', 'DONADO', 'ANULADO'];

function nextStepLabel(pedido: Pedido) {
  if (pedido.estadoProceso === 'LISTO' || pedido.estadoProceso === 'ENTREGA_PARCIAL') return 'Entregar al cliente';
  if (pedido.estadoProceso === 'PENDIENTE') return 'Iniciar lavado';
  return 'Pasar a la siguiente área';
}

export function PedidoDetalleScreen({ navigation, route }: AppScreenProps<'PedidoDetalle'>) {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const can = usePermissions();
  const pedido = useQuery({ queryKey: ['pedido', id], queryFn: () => getPedido(id) });
  const pagos = useQuery({ queryKey: ['pedido', id, 'pagos'], queryFn: () => getPagosPedido(id) });
  const [showPago, setShowPago] = useState(false);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [error, setError] = useState('');

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pedido', id] }),
      queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['caja'] }),
    ]);
  };

  const avanzar = useMutation({
    mutationFn: () => avanzarPedido(id),
    onMutate: () => setError(''),
    onSuccess: refreshAll,
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const pagar = useMutation({
    mutationFn: (amount: number) => registrarPago(id, amount, metodo),
    onMutate: () => setError(''),
    onSuccess: async () => { setShowPago(false); setMonto(''); await refreshAll(); },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const data = pedido.data;
  const saldo = data ? Math.max(0, Math.round((data.total - data.montoPagado) * 100) / 100) : 0;
  const isFinal = !!data && (data.anulado || FINAL_STATES.includes(data.estadoProceso));
  const readyToDeliver = data?.estadoProceso === 'LISTO' || data?.estadoProceso === 'ENTREGA_PARCIAL';
  const amount = parseAmount(monto);
  const validAmount = Number.isFinite(amount) && amount > 0 && amount <= saldo + 0.009;

  const openPago = () => { setMonto(saldo.toFixed(2)); setShowPago(true); setError(''); };
  const confirmAvanzar = () => {
    if (!data) return;
    Alert.alert(nextStepLabel(data), `¿Confirmas el cambio del pedido #${data.numero}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => avanzar.mutate() },
    ]);
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={pedido.isRefetching} onRefresh={() => void refreshAll()} tintColor={colors.primary} />}>
        <ScreenTitle kicker="DETALLE DEL PEDIDO" title={data ? `Pedido #${data.numero}` : 'Pedido'} onBack={navigation.goBack} />
        {!data ? <StateView loading={pedido.isLoading} error={pedido.isError} empty={false} /> : <>
          <Card>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Pressable disabled={!can('CLIENTES')} onPress={() => navigation.navigate('ClienteDetalle', { id: data.clienteId })}>
                  <Text style={[styles.client, can('CLIENTES') && styles.link]}>{data.clienteNombre || 'Cliente'}</Text>
                </Pressable>
                <Text style={styles.meta}>{data.modalidad} · Ingreso {dateTime(data.fechaIngreso)}</Text>
                {data.fechaEntregaEst && <Text style={styles.meta}>Entrega estimada {dateTime(data.fechaEntregaEst)}</Text>}
                {data.areaActualNombre && !isFinal && <Text style={styles.meta}>Área actual: {data.areaActualNombre}</Text>}
              </View>
              {!!data.clienteCelular && <Pressable style={styles.whatsapp} accessibilityLabel="Escribir por WhatsApp"
                onPress={() => void Linking.openURL(whatsappUrl(data.clienteCelular!))}>
                <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
              </Pressable>}
            </View>
            <View style={styles.badges}>
              <Badge label={data.anulado ? 'Anulado' : processLabel(data.estadoProceso)} color={data.anulado ? colors.danger : processColor(data.estadoProceso)} />
              <Badge label={paymentLabel(data.estadoPago)} color={paymentColor(data.estadoPago)} />
              {data.esUrgente && <Badge label="Urgente" color={colors.danger} />}
            </View>
            {data.anulado && !!data.motivoAnulacion && <Text style={styles.note}>Motivo de anulación: {data.motivoAnulacion}</Text>}
            {!!data.observaciones && <Text style={styles.note}>{data.observaciones}</Text>}
          </Card>

          <SectionLabel>Prendas y servicios</SectionLabel>
          <Card>
            {data.items.map((item, index) => <View key={item.id} style={[styles.item, index > 0 && styles.divider]}>
              <View style={styles.flex}>
                <Text style={styles.itemName}>{item.servicioNombre}</Text>
                <Text style={styles.meta}>{item.cantidad} {item.servicioUnidad?.toLowerCase() ?? ''} × {money(item.precioUnit)}{item.descripcion ? ` · ${item.descripcion}` : ''}</Text>
              </View>
              <Text style={styles.itemTotal}>{money(item.total)}</Text>
            </View>)}
            <View style={[styles.totals, styles.divider]}>
              {data.descuento > 0 && <Line label="Descuento" value={`- ${money(data.descuento)}`} />}
              {data.recargoUrgente > 0 && <Line label="Recargo urgente" value={money(data.recargoUrgente)} />}
              <Line label="Total" value={money(data.total)} strong />
              <Line label="Pagado" value={money(data.montoPagado)} />
              {saldo > 0 && <Line label="Saldo por cobrar" value={money(saldo)} danger />}
            </View>
          </Card>

          {!!pagos.data?.length && <>
            <SectionLabel>Cobros</SectionLabel>
            <Card>{pagos.data.map((pago, index) => <View key={pago.id} style={[styles.item, index > 0 && styles.divider]}>
              <Ionicons name="cash-outline" size={20} color={colors.success} />
              <View style={styles.flex}>
                <Text style={styles.itemName}>{methodLabel(pago.metodoPago)}</Text>
                <Text style={styles.meta}>{dateTime(pago.fecha)}{pago.usuarioNombre ? ` · ${pago.usuarioNombre}` : ''}</Text>
              </View>
              <Text style={[styles.itemTotal, { color: colors.success }]}>{money(pago.monto)}</Text>
            </View>)}</Card>
          </>}

          {!!error && <View style={styles.spaced}><ErrorBox message={error} /></View>}

          {!isFinal && <View style={styles.actions}>
            {showPago ? <Card>
              <Text style={styles.itemName}>Registrar cobro</Text>
              <View style={styles.amountField}>
                <Text style={styles.currency}>S/</Text>
                <TextInput value={monto} onChangeText={setMonto} keyboardType="decimal-pad" style={styles.amountInput} autoFocus selectTextOnFocus />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {METODOS_PAGO.map((m) => <Chip key={m} label={methodLabel(m)} active={metodo === m} onPress={() => setMetodo(m)} />)}
              </ScrollView>
              {!validAmount && !!monto && <Text style={styles.hint}>Ingresa un monto mayor a 0 y hasta {money(saldo)}.</Text>}
              <View style={styles.pagoButtons}>
                <Button label="Cancelar" variant="secondary" onPress={() => setShowPago(false)} style={styles.flex} />
                <Button label="Cobrar" icon="checkmark" onPress={() => pagar.mutate(amount)} busy={pagar.isPending} disabled={!validAmount} style={styles.flex} />
              </View>
            </Card> : saldo > 0 && <Button label={`Cobrar ${money(saldo)}`} icon="cash-outline" variant="secondary" onPress={openPago} />}
            <Button label={nextStepLabel(data)} icon={readyToDeliver ? 'bag-check-outline' : 'arrow-forward-circle-outline'}
              onPress={confirmAvanzar} busy={avanzar.isPending} disabled={readyToDeliver && saldo > 0} />
            {readyToDeliver && saldo > 0 && <Text style={styles.hint}>Cobra el saldo pendiente para poder entregar el pedido.</Text>}
          </View>}
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Line({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return <View style={styles.rowBetween}>
    <Text style={[styles.lineLabel, strong && styles.strong]}>{label}</Text>
    <Text style={[styles.lineValue, strong && styles.strong, danger && { color: colors.danger }]}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  client: { color: colors.navy, fontSize: 19, fontWeight: '900' }, link: { textDecorationLine: 'underline' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  whatsapp: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  note: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 10, backgroundColor: '#F5FAFE', padding: 10, borderRadius: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemName: { color: colors.text, fontWeight: '800', fontSize: 14 },
  itemTotal: { color: colors.navy, fontWeight: '900', fontSize: 13 },
  totals: { paddingTop: 10, gap: 6 },
  lineLabel: { color: colors.muted, fontSize: 13 }, lineValue: { color: colors.text, fontSize: 13, fontWeight: '700' },
  strong: { color: colors.navy, fontSize: 16, fontWeight: '900' },
  spaced: { marginTop: 14 },
  actions: { gap: 10, marginTop: 20 },
  amountField: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, height: 56 },
  currency: { color: colors.muted, fontSize: 18, fontWeight: '800' },
  amountInput: { flex: 1, color: colors.navy, fontSize: 24, fontWeight: '900' },
  chips: { gap: 8, paddingVertical: 12 },
  pagoButtons: { flexDirection: 'row', gap: 10 },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: 6 },
});
