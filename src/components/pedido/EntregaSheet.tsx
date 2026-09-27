import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import { METODOS_PAGO, type MetodoPago, type Pedido } from '../../api/operationsApi';
import { entregarPedido } from '../../api/pedidoApi';
import { colors, fonts, radius, space } from '../../theme';
import { methodLabel, money, parseAmount, quantityLabel } from '../../utils/format';
import { AppText, Button, Card, Checkbox, Choice, Divider, InlineAlert, Sheet, TextField, toast } from '../ui';

interface Fila { pedidoItemId: number; nombre: string; unidad?: string | null; pendiente: number; cantidad: string }
interface Cobro { metodo: MetodoPago; monto: string }

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Entrega del pedido, igual que la web: qué prendas se lleva el cliente (todo o parte) y con qué
 * pagos (uno o varios métodos). No exige pagar todo: el saldo queda por cobrar.
 */
export function EntregaSheet({ pedido, onClose, onDone }: { pedido: Pedido; onClose: () => void; onDone: (estado?: string) => void }) {
  const saldo = Math.max(0, round2(pedido.total - pedido.montoPagado));
  const [filas, setFilas] = useState<Fila[]>(() => pedido.items
    .map((it) => ({ pedidoItemId: it.id, nombre: it.servicioNombre ?? 'Servicio', unidad: it.servicioUnidad, pendiente: round2(it.cantidad - (it.cantidadEntregada ?? 0)) }))
    .filter((f) => f.pendiente > 0.001)
    .map((f) => ({ ...f, cantidad: String(f.pendiente) })));
  const [cobros, setCobros] = useState<Cobro[]>(() => (saldo > 0.01 ? [{ metodo: 'EFECTIVO', monto: saldo.toFixed(2) }] : []));
  const [tercero, setTercero] = useState(false);
  const [recibidoPor, setRecibidoPor] = useState('');
  const [nota, setNota] = useState('');

  const totalCobro = round2(cobros.reduce((a, c) => a + (parseAmount(c.monto) || 0), 0));
  const restante = round2(saldo - totalCobro);
  const itemsEntrega = filas.filter((f) => (parseAmount(f.cantidad) || 0) > 0.001);
  const esFinal = filas.every((f) => (parseAmount(f.cantidad) || 0) >= f.pendiente - 0.001);
  const excede = filas.find((f) => (parseAmount(f.cantidad) || 0) > f.pendiente + 0.01);
  const error = excede ? `De «${excede.nombre}» solo quedan ${excede.pendiente} por entregar.`
    : totalCobro > saldo + 0.01 ? `El cobro excede el saldo pendiente (${money(saldo)}).`
      : !itemsEntrega.length && totalCobro <= 0 ? 'Indica qué prendas se entregan y/o registra un cobro.'
        : tercero && recibidoPor.trim().length < 2 ? 'Escribe el nombre de quien recoge.' : '';

  const save = useMutation({
    mutationFn: () => entregarPedido(pedido.id, {
      items: itemsEntrega.map((f) => ({ pedidoItemId: f.pedidoItemId, cantidad: round2(parseAmount(f.cantidad)) })),
      pagos: cobros.filter((c) => (parseAmount(c.monto) || 0) > 0).map((c) => ({ metodo: c.metodo, monto: round2(parseAmount(c.monto)) })),
      recibidoPor: tercero ? recibidoPor.trim() : undefined,
      nota: nota.trim() || undefined,
    }),
    onSuccess: (res) => {
      const quedan = Math.max(0, restante);
      toast(esFinal
        ? `Pedido #${pedido.numero} entregado${quedan > 0.01 ? ` · queda ${money(quedan)} por cobrar` : ''}`
        : `Entrega parcial registrada${quedan > 0.01 ? ` · queda ${money(quedan)} por cobrar` : ''}`);
      onDone((res as { estadoProceso?: string } | undefined)?.estadoProceso);
    },
  });

  const addCobro = () => {
    const usados = new Set(cobros.map((c) => c.metodo));
    const libre = METODOS_PAGO.find((m) => !usados.has(m)) ?? 'EFECTIVO';
    setCobros([...cobros, { metodo: libre, monto: Math.max(0, restante).toFixed(2) }]);
  };

  return (
    <Sheet visible onClose={onClose} title={pedido.estadoProceso === 'ENTREGA_PARCIAL' ? 'Entregar el resto' : 'Entregar pedido'}
      subtitle={`#${pedido.numero} · ${pedido.clienteNombre ?? ''}`}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {filas.length > 0 && <Card padded={false}>
          <AppText variant="captionStrong" style={styles.cardTitle}>¿Qué se lleva ahora?</AppText>
          {filas.map((f, i) => (
            <View key={f.pedidoItemId}>
              {i > 0 && <Divider inset={space.lg} />}
              <View style={styles.row}>
                <View style={styles.flex}>
                  <AppText variant="subheading" numberOfLines={2}>{f.nombre}</AppText>
                  <AppText variant="caption">Pendiente: {quantityLabel(f.pendiente, f.unidad)}</AppText>
                </View>
                <TextInput value={f.cantidad} keyboardType="decimal-pad" selectTextOnFocus style={styles.qty} accessibilityLabel={`Cantidad de ${f.nombre}`}
                  onChangeText={(v) => setFilas(filas.map((x, j) => (j === i ? { ...x, cantidad: v } : x)))} />
                <Pressable hitSlop={8} accessibilityLabel="Entregar todo"
                  onPress={() => setFilas(filas.map((x, j) => (j === i ? { ...x, cantidad: String(x.pendiente) } : x)))}>
                  <Ionicons name="checkmark-done" size={20} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          ))}
        </Card>}
        <InlineAlert tone={esFinal ? 'success' : 'info'} text={esFinal ? 'Se entrega todo: el pedido quedará como ENTREGADO.' : 'Entrega parcial: el resto queda pendiente para otra visita.'} />

        <Card style={styles.gap}>
          <View style={styles.headRow}>
            <AppText variant="subheading" style={styles.flex}>Cobro ahora</AppText>
            <AppText variant="caption">Saldo: {money(saldo)}</AppText>
          </View>
          {cobros.map((c, i) => (
            <View key={i} style={styles.gap}>
              <View style={styles.cobroRow}>
                <View style={styles.flex}><TextField label={`Monto ${cobros.length > 1 ? i + 1 : ''}`} prefix="S/" value={c.monto} keyboardType="decimal-pad"
                  onChangeText={(v) => setCobros(cobros.map((x, j) => (j === i ? { ...x, monto: v } : x)))} /></View>
                <Pressable onPress={() => setCobros(cobros.filter((_, j) => j !== i))} hitSlop={8} style={styles.trash} accessibilityLabel="Quitar cobro">
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
              <View style={styles.choices}>{METODOS_PAGO.map((m) => <Choice key={m} label={methodLabel(m)} selected={c.metodo === m}
                onPress={() => setCobros(cobros.map((x, j) => (j === i ? { ...x, metodo: m } : x)))} />)}</View>
            </View>
          ))}
          {saldo > 0.01 && <Button label={cobros.length ? 'Agregar otro método (pago mixto)' : 'Registrar un cobro'} icon="add" variant="ghost" size="sm" onPress={addCobro} />}
          {saldo > 0.01 && <AppText variant="caption" color={restante > 0.01 ? colors.warning : colors.success}>
            {restante > 0.01 ? `Quedará por cobrar: ${money(restante)}` : restante < -0.01 ? 'El cobro supera el saldo.' : 'Queda todo pagado.'}
          </AppText>}
          {saldo <= 0.01 && <AppText variant="caption" color={colors.success}>El pedido ya está pagado.</AppText>}
        </Card>

        <Checkbox checked={tercero} onChange={setTercero} label="Lo recoge otra persona (no el titular)" />
        {tercero && <TextField label="¿Quién lo recoge?" icon="person-outline" placeholder="Nombre y DNI de quien recoge" value={recibidoPor}
          onChangeText={setRecibidoPor} autoCapitalize="words" maxLength={120} />}
        <TextField label="Nota" optional placeholder="Ej. faltó un botón, se entregó en portería" value={nota} onChangeText={setNota} maxLength={300} />
        {!!error && <InlineAlert tone="warning" text={error} />}
        {save.isError && <InlineAlert text={apiErrorMessage(save.error, 'No se pudo registrar la entrega.')} />}
      </ScrollView>
      <Button label={esFinal ? 'Confirmar entrega' : 'Registrar entrega parcial'} icon="bag-check-outline" onPress={() => save.mutate()}
        disabled={!!error} busy={save.isPending} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { maxHeight: 470 },
  content: { gap: space.md, paddingBottom: space.sm },
  gap: { gap: space.sm },
  cardTitle: { paddingHorizontal: space.lg, paddingTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  qty: { width: 64, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 8, textAlign: 'center', fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  cobroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  trash: { width: 40, height: 52, alignItems: 'center', justifyContent: 'center' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
