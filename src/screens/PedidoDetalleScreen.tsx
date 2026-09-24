import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../api/errors';
import { avanzarPedido, getPagosPedido, getPedido, METODOS_PAGO, registrarPago, type MetodoPago, type Pedido } from '../api/operationsApi';
import {
  AppText, Avatar, Badge, BottomBar, Button, Card, Checkbox, Choice, Divider, ErrorState, IconButton, InlineAlert, ListItem,
  ListSkeleton, Screen, Section, Sheet, StackHeader, TextField, toast,
} from '../components/ui';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { colors, fonts, space } from '../theme';
import {
  dateTime, methodLabel, money, parseAmount, paymentLabel, paymentTone, PROCESS_STEPS, processLabel, processTone, quantityLabel, relativeDay, whatsappUrl,
} from '../utils/format';

const FINAL_STATES = ['ENTREGADO', 'DONADO', 'ANULADO'];
const isReady = (p: Pedido) => p.estadoProceso === 'LISTO' || p.estadoProceso === 'ENTREGA_PARCIAL';

function nextStep(p: Pedido) {
  if (isReady(p)) return { label: 'Entregar', icon: 'bag-check-outline' as const };
  if (p.estadoProceso === 'PENDIENTE') return { label: 'Empezar lavado', icon: 'play-circle-outline' as const };
  return { label: 'Siguiente etapa', icon: 'arrow-forward-circle-outline' as const };
}

function whatsappMessage(p: Pedido) {
  const nombre = p.clienteNombre?.split(' ')[0] ?? '';
  const saldo = p.total - p.montoPagado;
  if (isReady(p)) return `Hola ${nombre}, tu pedido #${p.numero} ya está listo para recoger.${saldo > 0.009 ? ` Saldo pendiente: ${money(saldo)}.` : ''} ¡Te esperamos!`;
  return `Hola ${nombre}, te escribimos por tu pedido #${p.numero}.`;
}

export function PedidoDetalleScreen({ navigation, route }: AppScreenProps<'PedidoDetalle'>) {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const can = usePermissions();
  const pedido = useQuery({ queryKey: ['pedido', id], queryFn: () => getPedido(id) });
  const pagos = useQuery({ queryKey: ['pedido', id, 'pagos'], queryFn: () => getPagosPedido(id) });
  const [payOpen, setPayOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [error, setError] = useState('');

  const refreshAll = () => Promise.all(['pedido', 'pedidos', 'dashboard', 'caja', 'cliente'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));

  const avanzar = useMutation({
    mutationFn: (recibidoPor?: string) => avanzarPedido(id, recibidoPor),
    onMutate: () => setError(''),
    onSuccess: async () => {
      const wasReady = pedido.data && isReady(pedido.data);
      setDeliverOpen(false);
      await refreshAll();
      toast(wasReady ? 'Pedido entregado' : 'Pedido actualizado');
    },
    onError: (e) => { setDeliverOpen(false); setError(apiErrorMessage(e)); },
  });

  const p = pedido.data;
  if (!p) {
    return <Screen>
      <StackHeader title="Pedido" onBack={navigation.goBack} />
      <View style={styles.content}>{pedido.isError ? <ErrorState onRetry={() => void pedido.refetch()} /> : <ListSkeleton rows={4} />}</View>
    </Screen>;
  }

  const saldo = Math.max(0, Math.round((p.total - p.montoPagado) * 100) / 100);
  const isFinal = p.anulado || FINAL_STATES.includes(p.estadoProceso);
  const ready = isReady(p);
  const step = nextStep(p);

  const confirmAdvance = () => {
    if (ready) { setDeliverOpen(true); return; }
    Alert.alert(p.estadoProceso === 'PENDIENTE' ? 'Empezar lavado' : 'Pasar a la siguiente etapa', p.estadoProceso === 'PENDIENTE'
      ? `El pedido #${p.numero} pasará a la primera área de lavado.`
      : `El pedido #${p.numero} pasará a la siguiente área. Si era la última, quedará listo para entregar.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => avanzar.mutate(undefined) },
    ]);
  };

  return (
    <Screen>
      <StackHeader title={`Pedido #${p.numero}`} subtitle={`Ingresó ${relativeDay(p.fechaIngreso).toLowerCase()}`} onBack={navigation.goBack}
        right={!!p.clienteCelular && <IconButton icon="logo-whatsapp" label="Escribir por WhatsApp" tone="primary"
          onPress={() => void Linking.openURL(`${whatsappUrl(p.clienteCelular!)}?text=${encodeURIComponent(whatsappMessage(p))}`)} />} />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={pedido.isRefetching} onRefresh={() => void refreshAll()} tintColor={colors.primary} />}>

        <Card>
          <View style={styles.badges}>
            <Badge label={p.anulado ? 'Anulado' : processLabel(p.estadoProceso)} tone={p.anulado ? 'danger' : processTone(p.estadoProceso)} />
            {!p.anulado && <Badge label={paymentLabel(p.estadoPago)} tone={paymentTone(p.estadoPago)} />}
            {p.esUrgente && <Badge label="Urgente" tone="danger" />}
          </View>
          {!p.anulado && <Timeline estado={p.estadoProceso} />}
          {!isFinal && !!p.areaActualNombre && <AppText variant="caption" style={styles.area}>Área actual: <AppText variant="captionStrong">{p.areaActualNombre}</AppText></AppText>}
          {p.anulado && !!p.motivoAnulacion && <InlineAlert title="Pedido anulado" text={p.motivoAnulacion} />}
        </Card>

        {!!error && <View style={styles.gapTop}><InlineAlert title="No se pudo completar la acción" text={error} /></View>}

        <Section title="Cliente">
          <Card padded={false}>
            <ListItem title={p.clienteNombre || 'Cliente'} subtitle={p.clienteCelular || 'Sin celular registrado'}
              leading={<Avatar name={p.clienteNombre || '?'} tone="teal" />}
              chevron={can('CLIENTES')} onPress={can('CLIENTES') ? () => navigation.navigate('ClienteDetalle', { id: p.clienteId }) : undefined} />
            <Divider />
            <InfoRow icon="storefront-outline" label="Modalidad" value={p.modalidad === 'Tienda' ? 'En tienda' : p.modalidad} />
            {!!p.direccionEntrega && <InfoRow icon="location-outline" label="Dirección" value={p.direccionEntrega} />}
            <InfoRow icon="calendar-outline" label="Entrega estimada" value={p.fechaEntregaEst ? dateTime(p.fechaEntregaEst) : 'Sin fecha'} />
            {!!p.usuarioNombre && <InfoRow icon="person-circle-outline" label="Atendido por" value={p.usuarioNombre} />}
          </Card>
        </Section>

        {!!p.observaciones && <View style={styles.gapTop}><InlineAlert tone="info" icon="chatbox-ellipses-outline" title="Observaciones" text={p.observaciones} /></View>}

        <Section title={`Prendas y servicios (${p.items.length})`}>
          <Card>
            {p.items.map((item, i) => (
              <Fragment key={item.id}>
                {i > 0 && <Divider />}
                <View style={styles.item}>
                  <View style={styles.flex}>
                    <AppText variant="subheading">{item.servicioNombre}</AppText>
                    <AppText variant="caption">{quantityLabel(item.cantidad, item.servicioUnidad)} × {money(item.precioUnit)}{item.descripcion ? ` · ${item.descripcion}` : ''}</AppText>
                  </View>
                  <AppText variant="subheading">{money(item.total)}</AppText>
                </View>
              </Fragment>
            ))}
            <View style={styles.totals}>
              {p.descuento > 0 && <Line label="Descuento" value={`− ${money(p.descuento)}`} />}
              {p.recargoUrgente > 0 && <Line label="Recargo por urgencia" value={money(p.recargoUrgente)} />}
              <Line label="Total" value={money(p.total)} strong />
              <Line label="Pagado" value={money(p.montoPagado)} tone={colors.success} />
              {saldo > 0 && !p.anulado && <Line label="Saldo por cobrar" value={money(saldo)} tone={colors.danger} strong />}
            </View>
          </Card>
        </Section>

        {!!pagos.data?.length && <Section title="Cobros registrados">
          <Card padded={false}>
            {pagos.data.map((pago, i) => (
              <Fragment key={pago.id}>
                {i > 0 && <Divider inset={space.lg} />}
                <ListItem title={methodLabel(pago.metodoPago)} subtitle={`${dateTime(pago.fecha)}${pago.usuarioNombre ? ` · ${pago.usuarioNombre}` : ''}`}
                  leading={<View style={styles.payIcon}><Ionicons name="cash-outline" size={18} color={colors.success} /></View>}
                  trailing={<AppText variant="subheading" color={colors.success}>{money(pago.monto)}</AppText>} />
              </Fragment>
            ))}
          </Card>
        </Section>}
      </ScrollView>

      {!isFinal && <BottomBar>
        {ready && saldo > 0 && <AppText variant="caption" align="center">Cobra el saldo para poder entregar el pedido.</AppText>}
        <View style={styles.actions}>
          {saldo > 0 && <Button label={`Cobrar ${money(saldo)}`} icon="cash-outline" variant={ready ? 'success' : 'secondary'}
            onPress={() => setPayOpen(true)} style={styles.flex} />}
          {!(ready && saldo > 0) && <Button label={step.label} icon={step.icon} onPress={confirmAdvance} busy={avanzar.isPending && !deliverOpen} style={styles.flex} />}
        </View>
      </BottomBar>}

      <PagoSheet visible={payOpen} pedidoId={id} saldo={saldo} onClose={() => setPayOpen(false)} onPaid={refreshAll} />
      <EntregaSheet visible={deliverOpen} pedido={p} busy={avanzar.isPending} onClose={() => setDeliverOpen(false)}
        onConfirm={(recibidoPor) => avanzar.mutate(recibidoPor)} />
    </Screen>
  );
}

function Timeline({ estado }: { estado: string }) {
  const index = estado === 'ENTREGA_PARCIAL' ? 2 : Math.max(0, PROCESS_STEPS.findIndex((s) => s.estado === estado));
  return (
    <View style={styles.timeline} accessibilityLabel={`Etapa ${index + 1} de ${PROCESS_STEPS.length}: ${PROCESS_STEPS[index]?.label}`}>
      {PROCESS_STEPS.map((s, i) => {
        const done = i < index || estado === 'ENTREGADO';
        const current = i === index && estado !== 'ENTREGADO';
        return (
          <Fragment key={s.estado}>
            {i > 0 && <View style={[styles.tlLine, (done || current) && styles.tlLineOn]} />}
            <View style={styles.tlStep}>
              <View style={[styles.tlDot, done && styles.tlDotDone, current && styles.tlDotCurrent]}>
                {done ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : current ? <View style={styles.tlInner} /> : null}
              </View>
              <AppText style={[styles.tlLabel, (done || current) && styles.tlLabelOn]}>{s.label}</AppText>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <AppText variant="caption" style={styles.infoLabel}>{label}</AppText>
      <AppText variant="captionStrong" color={colors.text} style={styles.infoValue} numberOfLines={2}>{value}</AppText>
    </View>
  );
}

function Line({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <View style={styles.line}>
      <AppText variant={strong ? 'subheading' : 'caption'}>{label}</AppText>
      <AppText variant={strong ? 'heading' : 'captionStrong'} color={tone ?? colors.text}>{value}</AppText>
    </View>
  );
}

function PagoSheet({ visible, pedidoId, saldo, onClose, onPaid }: {
  visible: boolean; pedidoId: number; saldo: number; onClose: () => void; onPaid: () => Promise<unknown>;
}) {
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const amount = parseAmount(monto || saldo.toFixed(2));
  const valid = Number.isFinite(amount) && amount > 0 && amount <= saldo + 0.009;
  const pagar = useMutation({
    mutationFn: () => registrarPago(pedidoId, amount, metodo),
    onSuccess: async () => { await onPaid(); toast(`Cobro de ${money(amount)} registrado`); setMonto(''); onClose(); },
  });
  return (
    <Sheet visible={visible} onClose={onClose} title="Registrar cobro" subtitle={`Saldo pendiente: ${money(saldo)}`}>
      <TextField label="Monto a cobrar" prefix="S/" placeholder={saldo.toFixed(2)} value={monto} onChangeText={setMonto}
        keyboardType="decimal-pad" error={monto && !valid ? `Ingresa un monto entre S/ 0.01 y ${money(saldo)}.` : ''}
        hint={monto ? undefined : 'Déjalo vacío para cobrar el saldo completo.'} />
      <View>
        <AppText variant="captionStrong" color={colors.text} style={styles.label}>Método de pago</AppText>
        <View style={styles.choices}>{METODOS_PAGO.map((m) => <Choice key={m} label={methodLabel(m)} selected={metodo === m} onPress={() => setMetodo(m)} />)}</View>
      </View>
      {pagar.isError && <InlineAlert text={apiErrorMessage(pagar.error)} />}
      <Button label={`Cobrar ${Number.isFinite(amount) ? money(amount) : ''}`} icon="checkmark" variant="success" onPress={() => pagar.mutate()} disabled={!valid} busy={pagar.isPending} />
    </Sheet>
  );
}

function EntregaSheet({ visible, pedido, busy, onClose, onConfirm }: {
  visible: boolean; pedido: Pedido; busy: boolean; onClose: () => void; onConfirm: (recibidoPor?: string) => void;
}) {
  const [tercero, setTercero] = useState(false);
  const [nombre, setNombre] = useState('');
  const valid = !tercero || nombre.trim().length >= 2;
  return (
    <Sheet visible={visible} onClose={onClose} title="Entregar pedido" subtitle={`#${pedido.numero} · ${pedido.clienteNombre ?? ''}`}>
      <InlineAlert tone="success" text="El pedido está pagado. Al confirmar quedará como entregado y ya no podrá modificarse." />
      <Checkbox checked={tercero} onChange={setTercero} label="Lo recoge otra persona (no el titular)" />
      {tercero && <TextField label="¿Quién lo recoge?" icon="person-outline" placeholder="Nombre de quien recoge" value={nombre}
        onChangeText={setNombre} autoCapitalize="words" autoFocus />}
      <Button label="Confirmar entrega" icon="bag-check-outline" onPress={() => onConfirm(tercero ? nombre.trim() : undefined)} disabled={!valid} busy={busy} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl },
  gapTop: { marginTop: space.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  area: { marginTop: space.md },
  timeline: { flexDirection: 'row', alignItems: 'flex-start', marginTop: space.lg },
  tlStep: { alignItems: 'center', width: 64 },
  tlLine: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 10 },
  tlLineOn: { backgroundColor: colors.primary },
  tlDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tlDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  tlDotCurrent: { borderColor: colors.primary },
  tlInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  tlLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 6, textAlign: 'center' },
  tlLabelOn: { fontFamily: fonts.semibold, color: colors.text },
  info: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: 11 },
  infoLabel: { width: 118 },
  infoValue: { flex: 1, textAlign: 'right' },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  totals: { gap: 8, marginTop: space.sm, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border, borderStyle: 'dashed' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: space.md },
  label: { marginBottom: space.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
