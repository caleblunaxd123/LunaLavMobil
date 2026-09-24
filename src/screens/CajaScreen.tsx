import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMovimientos } from '../api/operationsApi';
import { Card, Fab, Message, ScreenTitle, StateView } from '../components/ui';
import { usePermissions } from '../hooks/usePermissions';
import type { TabScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { isoDate, methodLabel, money, time } from '../utils/format';

export function CajaScreen({ navigation }: TabScreenProps<'Caja'>) {
  const sedeId = useAuthStore((state) => state.session?.usuario.sedeId);
  const can = usePermissions();
  const [day, setDay] = useState(() => new Date());
  const fecha = isoDate(day);
  const isToday = fecha === isoDate(new Date());
  const allowed = can('CAJA');
  const query = useQuery({ queryKey: ['caja', sedeId, fecha], queryFn: () => getMovimientos(fecha), enabled: allowed });

  const totals = useMemo(() => {
    const movs = query.data ?? [];
    const sum = (filter: (m: (typeof movs)[number]) => boolean) => movs.filter(filter).reduce((acc, m) => acc + m.monto, 0);
    const ingresos = sum((m) => m.tipo === 'INGRESO');
    const gastos = sum((m) => m.tipo !== 'INGRESO');
    const efectivo = sum((m) => m.tipo === 'INGRESO' && m.metodoPago === 'EFECTIVO') - sum((m) => m.tipo !== 'INGRESO' && m.metodoPago === 'EFECTIVO');
    return { ingresos, gastos, efectivo };
  }, [query.data]);

  const shift = (days: number) => setDay((d) => { const next = new Date(d); next.setDate(d.getDate() + days); return next; });

  if (!allowed) return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.content}>
    <ScreenTitle title="Caja" icon="wallet-outline" />
    <Message icon="lock-closed-outline" title="Módulo no incluido" text="Tu usuario no tiene permiso para acceder a caja." />
  </View></SafeAreaView>;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
      ListHeaderComponent={<>
        <ScreenTitle title="Caja" icon="wallet-outline" />
        <View style={styles.dayBar}>
          <Pressable onPress={() => shift(-1)} hitSlop={10} style={styles.dayButton} accessibilityLabel="Día anterior"><Ionicons name="chevron-back" size={20} color={colors.navy} /></Pressable>
          <Text style={styles.dayText}>{isToday ? 'Hoy' : day.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Pressable onPress={() => shift(1)} disabled={isToday} hitSlop={10} style={[styles.dayButton, isToday && styles.disabled]} accessibilityLabel="Día siguiente"><Ionicons name="chevron-forward" size={20} color={colors.navy} /></Pressable>
        </View>
        <View style={styles.stats}>
          <Stat label="Ingresos" value={money(totals.ingresos)} color={colors.success} />
          <Stat label="Gastos" value={money(totals.gastos)} color={colors.danger} />
          <Stat label="Efectivo neto" value={money(totals.efectivo)} color={colors.navy} />
        </View>
      </>}
      ListEmptyComponent={<StateView loading={query.isLoading} error={query.isError} empty
        emptyTitle="Sin movimientos" emptyText={isToday ? 'Los cobros y gastos de hoy aparecerán aquí.' : 'No hubo movimientos en este día.'} />}
      renderItem={({ item: m }) => {
        const ingreso = m.tipo === 'INGRESO';
        const tint = ingreso ? colors.success : colors.danger;
        return <Card style={styles.row} onPress={m.pedidoId && can('PEDIDOS') ? () => navigation.navigate('PedidoDetalle', { id: m.pedidoId! }) : undefined}>
          <View style={[styles.badge, { backgroundColor: ingreso ? '#E8FBF6' : '#FFF1F2' }]}>
            <Ionicons name={ingreso ? 'arrow-down-outline' : 'arrow-up-outline'} color={tint} size={20} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={1}>{m.descripcion || (m.pedidoNumero ? `Pedido #${m.pedidoNumero}` : m.tipoGastoNombre || m.tipo)}</Text>
            <Text style={styles.meta}>{methodLabel(m.metodoPago)} · {time(m.fecha)}{m.usuarioNombre ? ` · ${m.usuarioNombre}` : ''}</Text>
            {!!(m.clienteNombre || m.tipoGastoNombre) && <Text style={styles.sub}>{m.clienteNombre || m.tipoGastoNombre}</Text>}
          </View>
          <Text style={[styles.amount, { color: tint }]}>{ingreso ? '+' : '-'} {money(m.monto)}</Text>
        </Card>;
      }}
    />
    {isToday && <Fab icon="remove-circle-outline" label="Registrar gasto" onPress={() => navigation.navigate('NuevoGasto')} />}
  </SafeAreaView>;
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 96, flexGrow: 1 },
  dayBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 6, marginBottom: 12 },
  dayButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F8FE' },
  disabled: { opacity: 0.35 },
  dayText: { color: colors.navy, fontWeight: '900', fontSize: 14, textTransform: 'capitalize' },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12 },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  statValue: { fontSize: 15, fontWeight: '900', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  badge: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { color: colors.text, fontWeight: '900', fontSize: 14 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  sub: { color: '#94A7B8', fontSize: 10, marginTop: 3 },
  amount: { fontSize: 12, fontWeight: '900' },
});
