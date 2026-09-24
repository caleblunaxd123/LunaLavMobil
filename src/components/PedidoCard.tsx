import { StyleSheet, View } from 'react-native';
import type { Pedido } from '../api/operationsApi';
import { colors, fonts, radius, space } from '../theme';
import { isPastDay, money, paymentLabel, paymentTone, processLabel, processTone, relativeDay } from '../utils/format';
import { AppText, Badge, Card } from './ui';

/** Resumen de un pedido en listas: número, cliente, etapa, pago, entrega y saldo. */
export function PedidoCard({ pedido, onPress }: { pedido: Pedido; onPress?: () => void }) {
  const saldo = Math.max(0, pedido.total - pedido.montoPagado);
  const activo = !pedido.anulado && !['ENTREGADO', 'DONADO', 'ANULADO'].includes(pedido.estadoProceso);
  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={`Pedido ${pedido.numero} de ${pedido.clienteNombre ?? 'cliente'}`}>
      <View style={styles.top}>
        <View style={styles.number}><AppText style={styles.numberText}>#{pedido.numero}</AppText></View>
        <View style={styles.flex}>
          <AppText variant="subheading" numberOfLines={1}>{pedido.clienteNombre || 'Cliente sin nombre'}</AppText>
          <AppText variant="caption" numberOfLines={1}>
            {pedido.modalidad === 'Tienda' ? 'En tienda' : pedido.modalidad} · Ingresó {relativeDay(pedido.fechaIngreso).toLowerCase()}
          </AppText>
        </View>
        <View style={styles.amounts}>
          <AppText variant="subheading">{money(pedido.total)}</AppText>
          {saldo > 0.009 && !pedido.anulado && <AppText variant="caption" color={colors.danger}>Debe {money(saldo)}</AppText>}
        </View>
      </View>
      <View style={styles.bottom}>
        <Badge label={pedido.anulado ? 'Anulado' : processLabel(pedido.estadoProceso)} tone={pedido.anulado ? 'danger' : processTone(pedido.estadoProceso)} />
        {!pedido.anulado && <Badge label={paymentLabel(pedido.estadoPago)} tone={paymentTone(pedido.estadoPago)} />}
        {pedido.esUrgente && activo && <Badge label="Urgente" tone="danger" />}
        {activo && pedido.fechaEntregaEst && (isPastDay(pedido.fechaEntregaEst) && pedido.estadoProceso !== 'LISTO'
          ? <AppText variant="captionStrong" color={colors.danger} style={styles.due}>Atrasado · {relativeDay(pedido.fechaEntregaEst).toLowerCase()}</AppText>
          : <AppText variant="caption" style={styles.due}>Entrega: {relativeDay(pedido.fechaEntregaEst).toLowerCase()}</AppText>)}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { marginBottom: space.sm, gap: space.md, padding: space.md + 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  number: { minWidth: 52, height: 44, paddingHorizontal: 8, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  amounts: { alignItems: 'flex-end' },
  bottom: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  due: { marginLeft: 'auto' },
});
