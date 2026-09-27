import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Fragment, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../api/errors';
import {
  avanzarPedido, esDomicilio, getPagosPedido, getPedido, METODOS_PAGO, registrarPago, type MetodoPago, type PagoPedido, type Pedido,
} from '../api/operationsApi';
import {
  editarMetodoPago, emitirComprobante, getAreasLavado, getEntregas, getPlantillasWhatsapp, linkSeguimiento, type AreaLavado,
} from '../api/pedidoApi';
import { MapView } from '../components/delivery/MapView';
import { AgregarItemSheet, AnularSheet, CambiarFechaSheet, DestinoSheet, MotorizadoSheet } from '../components/pedido/AccionesSheets';
import { EntregaSheet } from '../components/pedido/EntregaSheet';
import { FotosPedido } from '../components/pedido/FotosPedido';
import { HistorialPedido } from '../components/pedido/HistorialPedido';
import {
  AppText, Avatar, Badge, BottomBar, Button, Card, Choice, Divider, ErrorState, IconButton, InlineAlert, ListItem,
  ListSkeleton, Screen, Section, Sheet, StackHeader, TextField, toast,
} from '../components/ui';
import { formatDateTime } from '../components/ui/DateTimeField';
import { useConfiguracion } from '../hooks/useConfiguracion';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, space } from '../theme';
import {
  dateTime, isPastDay, methodLabel, money, parseAmount, paymentLabel, paymentTone, PROCESS_STEPS, processLabel, processTone, quantityLabel, relativeDay,
} from '../utils/format';
import { useOpenWeb, usePublicUrl } from '../utils/web';
import { abrirWhatsapp, mensajeEnCamino, mensajeIngreso, mensajeListo } from '../utils/whatsapp';

const FINAL_STATES = ['ENTREGADO', 'DONADO', 'ANULADO'];
const isReady = (p: Pedido) => p.estadoProceso === 'LISTO' || p.estadoProceso === 'ENTREGA_PARCIAL';
type Modal = 'pago' | 'entrega' | 'fecha' | 'item' | 'destino' | 'anular' | 'motorizado' | 'acciones' | null;

/** La acción que toca ahora, con el nombre del área siguiente (igual que la web). */
function primaryAction(p: Pedido, areas: AreaLavado[], saldo: number) {
  if (isReady(p)) {
    const verbo = p.estadoProceso === 'ENTREGA_PARCIAL' ? 'Entregar el resto' : 'Entregar';
    return { label: saldo > 0.01 ? `${verbo} y cobrar` : verbo, icon: 'bag-check-outline' as const };
  }
  if (p.estadoProceso === 'PENDIENTE' && p.areaActualId == null) return { label: 'Iniciar proceso', icon: 'play-circle-outline' as const };
  const idx = areas.findIndex((a) => a.id === p.areaActualId);
  if (idx === -1 || idx === areas.length - 1) return { label: 'Marcar listo', icon: 'checkmark-done-outline' as const };
  return { label: `Pasar a ${areas[idx + 1].nombre}`, icon: 'arrow-forward-circle-outline' as const };
}

export function PedidoDetalleScreen({ navigation, route }: AppScreenProps<'PedidoDetalle'>) {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const can = usePermissions();
  const rol = useAuthStore((s) => s.session?.usuario.rol);
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const publicUrl = usePublicUrl();
  const openWeb = useOpenWeb();
  const config = useConfiguracion();
  const pedido = useQuery({ queryKey: ['pedido', id], queryFn: () => getPedido(id) });
  const pagos = useQuery({ queryKey: ['pedido', id, 'pagos'], queryFn: () => getPagosPedido(id) });
  const entregas = useQuery({ queryKey: ['pedido', id, 'entregas'], queryFn: () => getEntregas(id) });
  const areas = useQuery({ queryKey: ['areas-lavado', negocioId], queryFn: getAreasLavado, staleTime: 10 * 60_000 });
  const [modal, setModal] = useState<Modal>(null);
  const [pagoEditar, setPagoEditar] = useState<PagoPedido | null>(null);
  const [verHistorial, setVerHistorial] = useState(false);
  const [error, setError] = useState('');

  const refreshAll = () => Promise.all(['pedido', 'pedidos', 'dashboard', 'caja', 'cliente'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));

  const avanzar = useMutation({
    mutationFn: () => avanzarPedido(id),
    onMutate: () => setError(''),
    onSuccess: async () => {
      await refreshAll();
      const actualizado = await queryClient.fetchQuery({ queryKey: ['pedido', id], queryFn: () => getPedido(id) });
      toast('Etapa actualizada');
      // Igual que la web: al quedar listo se ofrece avisar al cliente por WhatsApp.
      if (actualizado.estadoProceso === 'LISTO' && actualizado.clienteCelular) {
        Alert.alert('Pedido listo', `¿Avisar a ${actualizado.clienteNombre ?? 'el cliente'} por WhatsApp?`, [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Avisar', onPress: () => void enviar(actualizado, 'listo') },
        ]);
      }
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const comprobante = useMutation({
    mutationFn: (tipo: 'BOLETA' | 'FACTURA') => emitirComprobante(id, tipo),
    onSuccess: (c) => {
      const n = c.numeroCompleto ?? 'Comprobante';
      if (c.estado === 'ACEPTADO') toast(`${n} emitido y aceptado por SUNAT`);
      else if (c.estado === 'PENDIENTE') toast(`${n} enviado a SUNAT; se confirma en segundos`, 'info');
      else if (c.estado === 'SIMULADO') toast(`${n} generado (documento de prueba)`);
      else toast(`${n}: ${c.descripcionRespuestaSunat ?? c.estado}`, 'error');
      void queryClient.invalidateQueries({ queryKey: ['comprobantes'] });
    },
    onError: (e) => toast(apiErrorMessage(e, 'No se pudo emitir el comprobante.'), 'error'),
  });

  const enviar = async (p: Pedido, tipo: 'ingreso' | 'listo' | 'seguimiento' | 'camino') => {
    if (!p.clienteCelular) { toast('Este cliente no tiene celular registrado', 'error'); return; }
    try {
      if (tipo === 'listo') { await abrirWhatsapp(p.clienteCelular, mensajeListo(p)); return; }
      const token = tipo === 'ingreso' && !esDomicilio(p.modalidad) ? null : await linkSeguimiento(p.id);
      const url = token ? publicUrl(`seguimiento/${token}`) : undefined;
      if (tipo === 'camino') { await abrirWhatsapp(p.clienteCelular, mensajeEnCamino(p, config.data, url)); return; }
      const plantillas = await getPlantillasWhatsapp().catch(() => []);
      await abrirWhatsapp(p.clienteCelular, mensajeIngreso(p, config.data, plantillas, url));
    } catch (e) {
      toast(apiErrorMessage(e, 'No se pudo abrir WhatsApp.'), 'error');
    }
  };

  const copiarSeguimiento = async () => {
    try {
      const token = await linkSeguimiento(id);
      await Clipboard.setStringAsync(publicUrl(`seguimiento/${token}`));
      toast('Enlace de seguimiento copiado');
    } catch (e) { toast(apiErrorMessage(e), 'error'); }
  };

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
  const action = primaryAction(p, areas.data ?? [], saldo);
  const domicilio = esDomicilio(p.modalidad);
  const tienePunto = p.latitudEntrega != null && p.longitudEntrega != null;
  const atrasado = !isFinal && !ready && isPastDay(p.fechaEntregaEst);
  const puedeAnular = rol === 'ADMIN' || rol === 'COORDINADOR';

  const confirmAdvance = () => {
    if (ready) { setModal('entrega'); return; }
    Alert.alert(action.label, action.label === 'Marcar listo'
      ? `El pedido #${p.numero} quedará listo para entregar.`
      : `El pedido #${p.numero} pasará a la siguiente etapa.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => avanzar.mutate() },
    ]);
  };
  const comoLlegar = () => void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${p.latitudEntrega},${p.longitudEntrega}`);

  const acciones: { icon: keyof typeof Ionicons.glyphMap; label: string; hint?: string; onPress: () => void; danger?: boolean; hidden?: boolean }[] = [
    { icon: 'logo-whatsapp', label: 'Enviar detalle del pedido', hint: 'Prendas, total, saldo y fecha', onPress: () => void enviar(p, 'ingreso'), hidden: !p.clienteCelular },
    { icon: 'link-outline', label: 'Enviar enlace de seguimiento y pago', hint: 'El cliente ve el estado y puede pagar en línea', onPress: () => void enviar(p, 'seguimiento'), hidden: !p.clienteCelular || isFinal },
    { icon: 'copy-outline', label: 'Copiar enlace de seguimiento', onPress: () => void copiarSeguimiento(), hidden: isFinal },
    { icon: 'notifications-outline', label: 'Avisar que está listo', onPress: () => void enviar(p, 'listo'), hidden: !p.clienteCelular || !ready },
    { icon: 'navigate-outline', label: 'Avisar «va en camino»', hint: 'Con seguimiento en vivo del repartidor', onPress: () => void enviar(p, 'camino'), hidden: !p.clienteCelular || p.modalidad !== 'Delivery' || isFinal },
    { icon: 'calendar-outline', label: 'Cambiar fecha y hora', onPress: () => setModal('fecha'), hidden: isFinal },
    { icon: 'add-circle-outline', label: 'Agregar prenda o servicio', onPress: () => setModal('item'), hidden: isFinal },
    { icon: 'bicycle-outline', label: p.modalidad === 'Delivery' ? 'Editar destino de entrega' : 'Convertir a Delivery', onPress: () => setModal('destino'), hidden: isFinal },
    { icon: 'person-outline', label: p.motorizadoNombre ? `Motorizado: ${p.motorizadoNombre}` : 'Asignar motorizado', onPress: () => setModal('motorizado'), hidden: !domicilio || isFinal },
    { icon: 'receipt-outline', label: 'Emitir boleta electrónica', onPress: () => comprobante.mutate('BOLETA'), hidden: p.anulado },
    { icon: 'document-text-outline', label: 'Emitir factura electrónica', hint: 'El cliente debe tener RUC', onPress: () => comprobante.mutate('FACTURA'), hidden: p.anulado },
    { icon: 'print-outline', label: 'Ver e imprimir ticket', hint: 'Se abre en LunaLav web', onPress: () => openWeb(`ticket/${p.id}`) },
    { icon: 'close-circle-outline', label: 'Anular pedido', onPress: () => setModal('anular'), danger: true, hidden: isFinal || !puedeAnular },
  ];

  return (
    <Screen>
      <StackHeader title={`Pedido #${p.numero}`} subtitle={`Ingresó ${relativeDay(p.fechaIngreso).toLowerCase()}`} onBack={navigation.goBack}
        right={<IconButton icon="ellipsis-horizontal" label="Más acciones" tone="primary" onPress={() => setModal('acciones')} />} />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={pedido.isRefetching} onRefresh={() => void refreshAll()} tintColor={colors.primary} />}>

        <Card>
          <View style={styles.badges}>
            <Badge label={p.anulado ? 'Anulado' : processLabel(p.estadoProceso)} tone={p.anulado ? 'danger' : processTone(p.estadoProceso)} />
            {!p.anulado && <Badge label={paymentLabel(p.estadoPago)} tone={paymentTone(p.estadoPago)} />}
            {p.esUrgente && <Badge label="Urgente" tone="danger" />}
            <Badge label={p.modalidad === 'Tienda' ? 'En tienda' : p.modalidad} tone={domicilio ? 'violet' : 'neutral'} dot={false} />
          </View>
          {!p.anulado && <Timeline estado={p.estadoProceso} />}
          {!isFinal && !!p.areaActualNombre && <AppText variant="caption" style={styles.area}>Área actual: <AppText variant="captionStrong">{p.areaActualNombre}</AppText></AppText>}
          {p.anulado && !!p.motivoAnulacion && <InlineAlert title="Pedido anulado" text={p.motivoAnulacion} />}
        </Card>

        {!!error && <View style={styles.gapTop}><InlineAlert title="No se pudo completar la acción" text={error} /></View>}

        <Pressable disabled={isFinal} onPress={() => setModal('fecha')} style={styles.gapTop} accessibilityRole="button">
          <Card style={styles.dateCard}>
            <View style={[styles.dateIcon, atrasado && styles.dateIconLate]}><Ionicons name="time-outline" size={22} color={atrasado ? colors.danger : colors.primary} /></View>
            <View style={styles.flex}>
              <AppText variant="caption">{p.modalidad === 'Delivery' ? 'Entrega programada' : p.modalidad === 'Recojo' ? 'Fecha estimada' : 'Listo para recoger'}</AppText>
              <AppText variant="subheading" color={atrasado ? colors.danger : colors.text}>{p.fechaEntregaEst ? formatDateTime(p.fechaEntregaEst) : 'Sin fecha'}</AppText>
              {atrasado && <AppText variant="captionStrong" color={colors.danger}>Atrasado</AppText>}
            </View>
            {!isFinal && <AppText variant="captionStrong" color={colors.primary}>Cambiar</AppText>}
          </Card>
        </Pressable>

        {p.modalidad === 'Delivery' && <Section title="Entrega a domicilio">
          <Card padded={false}>
            {tienePunto && <MapView latitude={p.latitudEntrega} longitude={p.longitudEntrega} height={170} interactive={false} />}
            <View style={styles.deliveryBody}>
              <AppText variant="subheading">{p.direccionEntrega || 'Sin dirección'}</AppText>
              <AppText variant="caption">{[p.distritoEntrega, p.referenciaEntrega && `Ref: ${p.referenciaEntrega}`].filter(Boolean).join(' · ')}</AppText>
              <View style={styles.row2}>
                {tienePunto && <Button label="Cómo llegar" icon="navigate-outline" size="sm" variant="secondary" onPress={comoLlegar} style={styles.flex} />}
                {!isFinal && <Button label="Editar destino" icon="create-outline" size="sm" variant="secondary" onPress={() => setModal('destino')} style={styles.flex} />}
              </View>
            </View>
            <Divider />
            <ListItem title={p.motorizadoNombre ?? 'Sin motorizado asignado'} subtitle={p.motorizadoNombre ? (p.motorizadoCelular ?? 'Sin celular') : 'Asigna quién hará la entrega'}
              leading={<View style={styles.riderIcon}><Ionicons name="bicycle" size={20} color={colors.violet} /></View>}
              chevron={!isFinal} onPress={isFinal ? undefined : () => setModal('motorizado')} />
          </Card>
        </Section>}

        <Section title="Cliente">
          <Card padded={false}>
            <ListItem title={p.clienteNombre || 'Cliente'} subtitle={[p.clienteCelular || 'Sin celular', p.clienteDni && `DNI ${p.clienteDni}`].filter(Boolean).join(' · ')}
              leading={<Avatar name={p.clienteNombre || '?'} tone="teal" />}
              chevron={can('CLIENTES')} onPress={can('CLIENTES') ? () => navigation.navigate('ClienteDetalle', { id: p.clienteId }) : undefined} />
            {!!p.clienteCelular && <>
              <Divider />
              <View style={styles.contactRow}>
                <Button label="WhatsApp" icon="logo-whatsapp" size="sm" variant="secondary" style={styles.flex}
                  onPress={() => void enviar(p, ready ? 'listo' : 'ingreso')} />
                <Button label="Llamar" icon="call-outline" size="sm" variant="secondary" style={styles.flex}
                  onPress={() => void Linking.openURL(`tel:${p.clienteCelular}`)} />
              </View>
            </>}
            {p.modalidad === 'Recojo' && !!p.direccionEntrega && <><Divider /><InfoRow icon="home-outline" label="Recojo en" value={p.direccionEntrega} /></>}
            {!!p.usuarioNombre && <><Divider /><InfoRow icon="person-circle-outline" label="Atendido por" value={p.usuarioNombre} /></>}
          </Card>
        </Section>

        {!!p.observaciones && <View style={styles.gapTop}><InlineAlert tone="info" icon="chatbox-ellipses-outline" title="Observaciones" text={p.observaciones} /></View>}

        <Section title={`Prendas y servicios (${p.items.length})`} action={isFinal ? undefined : '+ Agregar'} onAction={() => setModal('item')}>
          <Card>
            {p.items.map((item, i) => (
              <Fragment key={item.id}>
                {i > 0 && <Divider />}
                <View style={styles.item}>
                  <View style={styles.flex}>
                    <AppText variant="subheading">{item.servicioNombre}</AppText>
                    <AppText variant="caption">{quantityLabel(item.cantidad, item.servicioUnidad)} × {money(item.precioUnit)}{item.descripcion ? ` · ${item.descripcion}` : ''}</AppText>
                    {item.cantidadEntregada > 0 && item.cantidadEntregada < item.cantidad && (
                      <AppText variant="captionStrong" color={colors.teal}>Entregado {quantityLabel(item.cantidadEntregada, item.servicioUnidad)}</AppText>)}
                  </View>
                  <AppText variant="subheading">{money(item.total)}</AppText>
                </View>
              </Fragment>
            ))}
            <View style={styles.totals}>
              {p.descuento > 0 && <Line label="Descuento" value={`− ${money(p.descuento)}`} tone={colors.success} />}
              {p.recargoUrgente > 0 && <Line label="Recargo por urgencia" value={money(p.recargoUrgente)} />}
              {Math.abs(p.redondeo) > 0.001 && <Line label="Redondeo" value={money(p.redondeo)} />}
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
                  trailing={<AppText variant="subheading" color={colors.success}>{money(pago.monto)}</AppText>}
                  onPress={rol === 'ADMIN' ? () => setPagoEditar(pago) : undefined} />
              </Fragment>
            ))}
          </Card>
          {rol === 'ADMIN' && <AppText variant="caption" style={styles.hint}>Toca un cobro para corregir su método de pago.</AppText>}
        </Section>}

        {!!entregas.data?.length && <Section title="Entregas">
          <Card padded={false}>
            {entregas.data.map((e, i) => (
              <Fragment key={e.id}>
                {i > 0 && <Divider inset={space.lg} />}
                <ListItem title={e.esFinal ? 'Entrega final' : 'Entrega parcial'}
                  subtitle={[dateTime(e.fecha), e.recibidoPor && `Recibió: ${e.recibidoPor}`, e.items.map((it) => `${quantityLabel(it.cantidad, it.servicioUnidad)} ${it.servicioNombre ?? ''}`).join(', '), e.nota].filter(Boolean).join(' · ')}
                  leading={<View style={styles.payIcon}><Ionicons name="bag-check-outline" size={18} color={colors.teal} /></View>}
                  trailing={e.montoCobrado > 0 ? <AppText variant="captionStrong" color={colors.success}>{money(e.montoCobrado)}</AppText> : undefined} />
              </Fragment>
            ))}
          </Card>
        </Section>}

        <Section title="Fotos de evidencia">
          <Card><FotosPedido pedidoId={p.id} editable={!p.anulado} /></Card>
        </Section>

        <Section title="Historial" action={verHistorial ? 'Ocultar' : 'Ver todo'} onAction={() => setVerHistorial((v) => !v)}>
          {verHistorial ? <Card><HistorialPedido pedidoId={p.id} /></Card>
            : <AppText variant="caption">Quién movió el pedido de área, entregas y avisos enviados.</AppText>}
        </Section>
      </ScrollView>

      {!isFinal && <BottomBar>
        <View style={styles.actions}>
          {saldo > 0 && !ready && <Button label={`Cobrar ${money(saldo)}`} icon="cash-outline" variant="secondary" onPress={() => setModal('pago')} style={styles.flex} />}
          <Button label={action.label} icon={action.icon} onPress={confirmAdvance} busy={avanzar.isPending} style={styles.flex} />
        </View>
      </BottomBar>}

      {modal === 'pago' && <PagoSheet pedidoId={id} saldo={saldo} onClose={() => setModal(null)} onPaid={refreshAll} />}
      {modal === 'entrega' && <EntregaSheet pedido={p} onClose={() => setModal(null)} onDone={() => { setModal(null); void refreshAll(); }} />}
      {modal === 'fecha' && <CambiarFechaSheet pedido={p} onClose={() => setModal(null)} onDone={refreshAll} />}
      {modal === 'item' && <AgregarItemSheet pedido={p} config={config.data} onClose={() => setModal(null)} onDone={refreshAll} />}
      {modal === 'destino' && <DestinoSheet pedido={p} config={config.data} onClose={() => setModal(null)} onDone={refreshAll} />}
      {modal === 'anular' && <AnularSheet pedido={p} onClose={() => setModal(null)} onDone={refreshAll} />}
      {modal === 'motorizado' && <MotorizadoSheet pedido={p} publicUrl={publicUrl} onClose={() => setModal(null)} onDone={refreshAll} />}
      {pagoEditar && <MetodoSheet pedidoId={id} pago={pagoEditar} onClose={() => setPagoEditar(null)} onDone={refreshAll} />}

      <Sheet visible={modal === 'acciones'} onClose={() => setModal(null)} title="Acciones del pedido" subtitle={`#${p.numero} · ${p.clienteNombre ?? ''}`}>
        <ScrollView style={styles.actionsList}>
          {acciones.filter((a) => !a.hidden).map((a, i) => (
            <Fragment key={a.label}>
              {i > 0 && <Divider inset={52} />}
              <ListItem title={a.label} subtitle={a.hint} danger={a.danger}
                leading={<View style={[styles.actionIcon, a.danger && styles.actionIconDanger]}><Ionicons name={a.icon} size={19} color={a.danger ? colors.danger : colors.primary} /></View>}
                onPress={() => { setModal(null); setTimeout(a.onPress, 250); }} />
            </Fragment>
          ))}
        </ScrollView>
      </Sheet>
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

function PagoSheet({ pedidoId, saldo, onClose, onPaid }: { pedidoId: number; saldo: number; onClose: () => void; onPaid: () => Promise<unknown> }) {
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const amount = parseAmount(monto || saldo.toFixed(2));
  const valid = Number.isFinite(amount) && amount > 0 && amount <= saldo + 0.009;
  const pagar = useMutation({
    mutationFn: () => registrarPago(pedidoId, amount, metodo),
    onSuccess: async () => { await onPaid(); toast(`Cobro de ${money(amount)} registrado`); onClose(); },
  });
  return (
    <Sheet visible onClose={onClose} title="Registrar cobro" subtitle={`Saldo pendiente: ${money(saldo)}`}>
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

/** Corregir el método de un cobro sin cambiar el monto (solo ADMIN, igual que la web). */
function MetodoSheet({ pedidoId, pago, onClose, onDone }: { pedidoId: number; pago: PagoPedido; onClose: () => void; onDone: () => Promise<unknown> }) {
  const [metodo, setMetodo] = useState<MetodoPago>((METODOS_PAGO as string[]).includes(pago.metodoPago) ? pago.metodoPago as MetodoPago : 'EFECTIVO');
  const save = useMutation({
    mutationFn: () => editarMetodoPago(pedidoId, pago.id, metodo),
    onSuccess: async () => { await onDone(); toast('Método de pago corregido'); onClose(); },
  });
  return (
    <Sheet visible onClose={onClose} title="Corregir método de pago" subtitle={`${money(pago.monto)} · ${dateTime(pago.fecha)}`}>
      <View style={styles.choices}>{METODOS_PAGO.map((m) => <Choice key={m} label={methodLabel(m)} selected={metodo === m} onPress={() => setMetodo(m)} />)}</View>
      <AppText variant="caption">El monto no cambia; solo se corrige cómo se cobró (afecta el cuadre de caja).</AppText>
      {save.isError && <InlineAlert text={apiErrorMessage(save.error)} />}
      <Button label="Guardar" icon="checkmark" onPress={() => save.mutate()} busy={save.isPending} disabled={metodo === pago.metodoPago} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl },
  gapTop: { marginTop: space.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  area: { marginTop: space.md },
  dateCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dateIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dateIconLate: { backgroundColor: colors.dangerSoft },
  deliveryBody: { padding: space.lg, gap: 4 },
  row2: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  riderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.violetSoft, alignItems: 'center', justifyContent: 'center' },
  contactRow: { flexDirection: 'row', gap: space.sm, padding: space.md },
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
  infoLabel: { width: 100 },
  infoValue: { flex: 1, textAlign: 'right' },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  totals: { gap: 8, marginTop: space.sm, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border, borderStyle: 'dashed' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.md },
  label: { marginBottom: space.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actionsList: { maxHeight: 460 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  actionIconDanger: { backgroundColor: colors.dangerSoft },
});
