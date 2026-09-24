import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { getMovimientos, type MovimientoCaja } from '../api/operationsApi';
import {
  AppText, Button, Card, EmptyState, ErrorState, ListSkeleton, LockedState, Pager, Screen, SegmentedControl, TabHeader,
} from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import { usePermissions } from '../hooks/usePermissions';
import type { TabScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, radius, space } from '../theme';
import { isoDate, methodLabel, money, time } from '../utils/format';

type Filtro = 'todos' | 'ingresos' | 'gastos';

export function CajaScreen({ navigation }: TabScreenProps<'Caja'>) {
  const sedeId = useAuthStore((s) => s.session?.usuario.sedeId);
  const can = usePermissions();
  const listRef = useRef<FlatList>(null);
  const [day, setDay] = useState(() => new Date());
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const fecha = isoDate(day);
  const isToday = fecha === isoDate(new Date());
  const allowed = can('CAJA');
  const query = useQuery({ queryKey: ['caja', sedeId, fecha], queryFn: () => getMovimientos(fecha), enabled: allowed });
  const movs = useMemo(() => query.data ?? [], [query.data]);

  const totals = useMemo(() => {
    const sum = (f: (m: MovimientoCaja) => boolean) => movs.filter(f).reduce((acc, m) => acc + m.monto, 0);
    const isIn = (m: MovimientoCaja) => m.tipo === 'INGRESO';
    return {
      ingresos: sum(isIn), gastos: sum((m) => !isIn(m)),
      efectivo: sum((m) => isIn(m) && m.metodoPago === 'EFECTIVO') - sum((m) => !isIn(m) && m.metodoPago === 'EFECTIVO'),
      digital: sum((m) => isIn(m) && m.metodoPago !== 'EFECTIVO'),
      countIn: movs.filter(isIn).length, countOut: movs.filter((m) => !isIn(m)).length,
    };
  }, [movs]);

  const filtered = useMemo(() => movs.filter((m) => filtro === 'todos' || (filtro === 'ingresos') === (m.tipo === 'INGRESO')), [movs, filtro]);
  const { page, setPage, pageItems, total, pageSize } = usePagination(filtered, 15, `${fecha}-${filtro}`);
  const shift = (days: number) => setDay((d) => { const n = new Date(d); n.setDate(d.getDate() + days); return n; });

  if (!allowed) return <Screen><View style={styles.content}><TabHeader title="Caja" /><LockedState module="ver la caja" /></View></Screen>;

  return (
    <Screen>
      <FlatList
        ref={listRef}
        data={pageItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={styles.header}>
          <TabHeader title="Caja" subtitle="Cobros y gastos de tu sede"
            right={isToday && <Button label="Gasto" icon="remove" size="sm" variant="secondary" onPress={() => navigation.navigate('NuevoGasto')} />} />
          <View style={styles.dayBar}>
            <DayButton icon="chevron-back" label="Día anterior" onPress={() => shift(-1)} />
            <View style={styles.dayCenter}>
              <AppText variant="subheading">{isToday ? 'Hoy' : day.toLocaleDateString('es-PE', { weekday: 'long' })}</AppText>
              <AppText variant="caption">{day.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</AppText>
            </View>
            <DayButton icon="chevron-forward" label="Día siguiente" onPress={() => shift(1)} disabled={isToday} />
          </View>
          <LinearGradient colors={[colors.navy, '#0B4F8A']} style={styles.hero}>
            <AppText style={styles.heroLabel}>Efectivo esperado en caja</AppText>
            <AppText style={styles.heroValue}>{money(totals.efectivo)}</AppText>
            <View style={styles.heroRow}>
              <HeroStat label="Ingresos" value={money(totals.ingresos)} hint={`${totals.countIn} cobros`} />
              <View style={styles.heroDivider} />
              <HeroStat label="Gastos" value={money(totals.gastos)} hint={`${totals.countOut} registros`} />
              <View style={styles.heroDivider} />
              <HeroStat label="Digital" value={money(totals.digital)} hint="Yape, Plin, POS…" />
            </View>
          </LinearGradient>
          <SegmentedControl<Filtro> value={filtro} onChange={setFiltro} segments={[
            { value: 'todos', label: 'Todos', count: movs.length },
            { value: 'ingresos', label: 'Ingresos', count: totals.countIn },
            { value: 'gastos', label: 'Gastos', count: totals.countOut },
          ]} />
        </View>}
        ListEmptyComponent={query.isLoading ? <ListSkeleton /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} />
          : <EmptyState icon="wallet-outline" title="Sin movimientos"
            text={isToday ? 'Los cobros de pedidos y los gastos de hoy aparecerán aquí.' : 'No hubo movimientos en este día.'}
            actionLabel={isToday ? 'Registrar un gasto' : undefined} onAction={() => navigation.navigate('NuevoGasto')} />}
        renderItem={({ item: m }) => {
          const ingreso = m.tipo === 'INGRESO';
          const tint = ingreso ? colors.success : colors.danger;
          const open = m.pedidoId && can('PEDIDOS') ? () => navigation.navigate('PedidoDetalle', { id: m.pedidoId! }) : undefined;
          return (
            <Card onPress={open} style={styles.row}>
              <View style={[styles.movIcon, { backgroundColor: ingreso ? colors.successSoft : colors.dangerSoft }]}>
                <Ionicons name={ingreso ? 'arrow-down' : 'arrow-up'} size={18} color={tint} />
              </View>
              <View style={styles.body}>
                <AppText variant="subheading" numberOfLines={1}>
                  {m.pedidoNumero ? `Pedido #${m.pedidoNumero}` : m.descripcion || m.tipoGastoNombre || (ingreso ? 'Ingreso' : 'Gasto')}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {[time(m.fecha), methodLabel(m.metodoPago), m.clienteNombre ?? m.usuarioNombre].filter(Boolean).join(' · ')}
                </AppText>
              </View>
              <AppText variant="subheading" color={tint}>{ingreso ? '+' : '−'}{money(m.monto)}</AppText>
            </Card>
          );
        }}
        ListFooterComponent={<Pager page={page} pageSize={pageSize} total={total}
          onChange={(p) => { setPage(p); listRef.current?.scrollToOffset({ offset: 0, animated: true }); }} />}
      />
    </Screen>
  );
}

function DayButton({ icon, label, onPress, disabled }: { icon: 'chevron-back' | 'chevron-forward'; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.dayButton, disabled && styles.disabled, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.heroStat}>
      <AppText style={styles.heroStatLabel}>{label}</AppText>
      <AppText style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
      <AppText style={styles.heroStatHint} numberOfLines={1}>{hint}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxxl, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.md },
  dayBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 6 },
  dayCenter: { flex: 1, alignItems: 'center' },
  dayButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.7 },
  hero: { borderRadius: radius.xl, padding: space.xl },
  heroLabel: { color: '#A9C8E6', fontFamily: fonts.medium, fontSize: 13 },
  heroValue: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 32, letterSpacing: -0.8, marginTop: 2 },
  heroRow: { flexDirection: 'row', marginTop: space.lg },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: space.md },
  heroStat: { flex: 1 },
  heroStatLabel: { color: '#A9C8E6', fontFamily: fonts.medium, fontSize: 11.5 },
  heroStatValue: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 15, marginTop: 2 },
  heroStatHint: { color: '#7FA6CC', fontFamily: fonts.regular, fontSize: 10.5, marginTop: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm, padding: space.md },
  movIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
});
