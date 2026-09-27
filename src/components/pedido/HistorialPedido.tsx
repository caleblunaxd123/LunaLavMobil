import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { getHistorial } from '../../api/pedidoApi';
import { colors, space } from '../../theme';
import { dateTime, processLabel } from '../../utils/format';
import { AppText } from '../ui';

/** Línea de tiempo de todo lo que pasó con el pedido (áreas, entregas, notas, avisos). */
export function HistorialPedido({ pedidoId }: { pedidoId: number }) {
  const historial = useQuery({ queryKey: ['pedido', pedidoId, 'historial'], queryFn: () => getHistorial(pedidoId) });
  if (historial.isLoading) return <ActivityIndicator color={colors.primary} />;
  const items = [...(historial.data ?? [])].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  if (!items.length) return <AppText variant="caption">Sin movimientos registrados.</AppText>;
  return (
    <View>
      {items.map((h, i) => (
        <View key={h.id} style={styles.row}>
          <View style={styles.rail}>
            <View style={[styles.dot, i === 0 && styles.dotFirst]} />
            {i < items.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.body}>
            <AppText variant="subheading">{h.areaNombre ? `${h.areaNombre} · ${processLabel(h.estadoProceso)}` : processLabel(h.estadoProceso)}</AppText>
            {!!h.nota && <AppText variant="caption" color={colors.text}>{h.nota}</AppText>}
            <AppText variant="caption">{dateTime(h.fecha)}{h.actorDescripcion ? ` · ${h.actorDescripcion}` : ''}{h.notificadoWsp ? ' · avisado por WhatsApp' : ''}</AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  rail: { width: 16, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.borderStrong, marginTop: 4 },
  dotFirst: { backgroundColor: colors.primary },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  body: { flex: 1, paddingBottom: space.lg, gap: 2 },
});
