import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { getConsolidado, getVistaGerencial, type VistaGerencial } from '../api/gestionApi';
import { REPORTES } from '../api/reportesApi';
import { AppText, Card, Divider, ErrorState, IconButton, Kpi, ListItem, ListSkeleton, LockedState, Screen, Section, StackHeader } from '../components/ui';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, radius, space } from '../theme';
import { money, parseDate } from '../utils/format';
import { useOpenWeb } from '../utils/web';

/** Variación porcentual frente al mismo tramo del mes anterior ("+12%" / "−5%"). */
function variation(actual: number, previous: number) {
  if (previous <= 0) return null;
  const pct = ((actual - previous) / previous) * 100;
  return { pct, label: `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(0)}%` };
}

export function ReportesScreen({ navigation }: AppScreenProps<'Reportes'>) {
  const sedeId = useAuthStore((s) => s.session?.usuario.sedeId);
  const isAdmin = useAuthStore((s) => s.session?.usuario.rol === 'ADMIN');
  const can = usePermissions();
  const openWeb = useOpenWeb();
  const allowed = can('REPORTES');
  // Sub-permisos finos: la vista gerencial y el consolidado de sedes se activan por rol.
  const verGerencial = can('REPORTES_VER_GERENCIAL');
  const verConsolidado = isAdmin && can('REPORTES_VER_CONSOLIDADO');
  const query = useQuery({ queryKey: ['reportes', 'gerencial', sedeId], queryFn: getVistaGerencial, enabled: allowed && verGerencial });
  const sedes = useQuery({ queryKey: ['reportes', 'consolidado'], queryFn: getConsolidado, enabled: allowed && verConsolidado });
  const webButton = <IconButton icon="open-outline" label="Abrir reportes en la web" onPress={() => openWeb('reportes')} />;

  if (!allowed) return <Screen><StackHeader title="Reportes" onBack={navigation.goBack} /><View style={styles.content}><LockedState module="ver reportes" /></View></Screen>;

  const v = query.data;
  return (
    <Screen>
      <StackHeader title="Reportes" subtitle="Cómo va tu lavandería" onBack={navigation.goBack} right={webButton} />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); void sedes.refetch(); }} tintColor={colors.primary} />}>
        {verGerencial && (query.isLoading ? <ListSkeleton rows={6} /> : query.isError || !v ? <ErrorState onRetry={() => void query.refetch()} /> : <>
          <MonthHero v={v} />
          <View style={styles.grid}>
            <Kpi label="Vendido hoy" value={money(v.ventasHoy)} hint={`Cobrado ${money(v.cobradoHoy)}`} icon="today-outline" />
            <Kpi label="Por cobrar" value={money(v.saldoPorCobrar)} hint="Saldo de pedidos" icon="hourglass-outline" tone={colors.warning} />
            <Kpi label="Ticket promedio" value={money(v.ticketPromedioMes)} hint={`${v.pedidosMesCount} pedidos este mes`} icon="receipt-outline" tone={colors.violet} />
            <Kpi label="Entregados" value={String(v.pedidosEntregadosMes)} hint={`${v.pedidosEntregadosSemana} esta semana`} icon="checkmark-done-outline" tone={colors.success} />
          </View>

          <Section title="Ventas de los últimos 14 días">
            <Card><SalesChart points={v.ventasUltimos14Dias} /></Card>
          </Section>

          <Section title="Cómo te pagan este mes">
            <Card><PaymentMix v={v} /></Card>
          </Section>

          <Section title="Pedidos en curso">
            <Card padded={false}>
              <Row icon="time-outline" tint={colors.warning} label="Recibidos, sin empezar" value={String(v.pedidosPendientes)} />
              <Divider inset={60} />
              <Row icon="sync-outline" tint={colors.primary} label="En proceso" value={String(v.pedidosEnProceso)} />
              <Divider inset={60} />
              <Row icon="bag-check-outline" tint={colors.success} label="Listos sin recoger" value={String(v.pedidosListosSinRecoger)} />
            </Card>
          </Section>

          {v.topServiciosMes.length > 0 && <Section title="Servicios que más venden">
            <Card padded={false}>
              {v.topServiciosMes.map((s, i) => <View key={s.nombre}>
                {i > 0 && <Divider inset={60} />}
                <Row rank={i + 1} label={s.nombre} hint={`${Number(s.cantidad.toFixed(2))} vendidos`} value={money(s.total)} />
              </View>)}
            </Card>
          </Section>}

          {verConsolidado && (sedes.data?.length ?? 0) > 1 && <Section title="Por sede">
            <Card padded={false}>
              {sedes.data!.map((s, i) => <View key={s.sedeId}>
                {i > 0 && <Divider inset={60} />}
                <Row icon="storefront-outline" tint={colors.navySoft} label={s.sedeNombre}
                  hint={`Hoy ${money(s.ventasHoy)} · ${s.pedidosActivos} pedidos activos`} value={money(s.ventasMes)} />
              </View>)}
            </Card>
          </Section>}
        </>)}

          <Section title="Reportes detallados">
            <AppText variant="caption" style={styles.detailHint}>Por rango de fechas, con tabla y exportación a Excel (.xlsx) para compartir o abrir en tu computadora.</AppText>
            <Card padded={false}>
              {REPORTES.filter((r) => r.clave !== 'cuadres-caja' || can('CAJA_REPORTE_CUADRES')).map((r, i) => <View key={r.clave}>
                {i > 0 && <Divider inset={60} />}
                <ListItem title={r.titulo} subtitle={r.descripcion} chevron
                  leading={<Ionicons name={r.icono} size={22} color={colors.primary} />}
                  onPress={() => navigation.navigate('ReporteDetalle', { clave: r.clave })} />
              </View>)}
            </Card>
          </Section>
      </ScrollView>
    </Screen>
  );
}

function MonthHero({ v }: { v: VistaGerencial }) {
  const change = variation(v.ventasMes, v.ventasMesAnteriorAlDia);
  const up = (change?.pct ?? 0) >= 0;
  return (
    <LinearGradient colors={[colors.navy, colors.navyGradientEnd]} style={styles.hero}>
      <AppText style={styles.heroLabel}>Ventas del mes</AppText>
      <View style={styles.heroTop}>
        <AppText style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{money(v.ventasMes)}</AppText>
        {change && <View style={[styles.pill, { backgroundColor: up ? 'rgba(33,190,145,0.2)' : 'rgba(217,45,32,0.25)' }]}>
          <Ionicons name={up ? 'trending-up' : 'trending-down'} size={14} color={up ? '#7BE3C2' : '#FFB4AD'} />
          <AppText style={[styles.pillText, { color: up ? '#7BE3C2' : '#FFB4AD' }]}>{change.label}</AppText>
        </View>}
      </View>
      <AppText style={styles.heroHint}>
        {change ? `Frente a ${money(v.ventasMesAnteriorAlDia)} a esta altura del mes pasado`
          : v.ventasMes > 0 ? 'Primer mes con ventas registradas' : 'Aún no hay ventas este mes'}
      </AppText>
      <View style={styles.heroRow}>
        <HeroStat label="Gastos" value={money(v.gastosMes)} />
        <View style={styles.heroDivider} />
        <HeroStat label="Utilidad" value={money(v.utilidadMes)} tint={v.utilidadMes >= 0 ? '#7BE3C2' : '#FFB4AD'} />
      </View>
    </LinearGradient>
  );
}

function HeroStat({ label, value, tint = '#FFFFFF' }: { label: string; value: string; tint?: string }) {
  return (
    <View style={styles.heroStat}>
      <AppText style={styles.heroStatLabel}>{label}</AppText>
      <AppText style={[styles.heroStatValue, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
    </View>
  );
}

/** Barras simples, sin librerías de gráficos: la altura es proporcional al mejor día. */
function SalesChart({ points }: { points: { fecha: string; total: number }[] }) {
  const max = Math.max(...points.map((p) => p.total), 1);
  const total = points.reduce((a, p) => a + p.total, 0);
  const best = points.reduce((a, p) => (p.total > a.total ? p : a), points[0] ?? { fecha: '', total: 0 });
  return (
    <View style={styles.chartWrap}>
      <View style={styles.chart} accessibilityLabel={`Ventas de 14 días: ${money(total)} en total`}>
        {points.map((p, i) => {
          const last = i === points.length - 1;
          return <View key={p.fecha} style={styles.barSlot}>
            <View style={[styles.bar, { height: `${Math.max((p.total / max) * 100, p.total > 0 ? 4 : 1.5)}%` },
              last ? styles.barToday : p.total === 0 && styles.barEmpty]} />
          </View>;
        })}
      </View>
      <View style={styles.chartAxis}>
        <AppText variant="caption">{points[0] ? parseDate(points[0].fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : ''}</AppText>
        <AppText variant="caption">Hoy</AppText>
      </View>
      <View style={styles.chartFoot}>
        <View><AppText variant="caption">Total 14 días</AppText><AppText variant="subheading">{money(total)}</AppText></View>
        {best.total > 0 && <View style={styles.alignEnd}>
          <AppText variant="caption">Mejor día</AppText>
          <AppText variant="subheading">{parseDate(best.fecha).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })} · {money(best.total)}</AppText>
        </View>}
      </View>
    </View>
  );
}

function PaymentMix({ v }: { v: VistaGerencial }) {
  const parts = [
    { label: 'Efectivo', value: v.ingresosEfectivoMes, color: colors.teal },
    { label: 'Yape, Plin y transferencia', value: v.ingresosDigitalMes, color: colors.violet },
    { label: 'Tarjeta', value: v.ingresosTarjetaMes, color: colors.sky },
  ];
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (total <= 0) return <AppText variant="caption">Todavía no hay cobros registrados este mes.</AppText>;
  return (
    <View style={styles.mix}>
      <View style={styles.mixBar}>
        {parts.filter((p) => p.value > 0).map((p) => <View key={p.label} style={{ flex: p.value, backgroundColor: p.color }} />)}
      </View>
      {parts.map((p) => <View key={p.label} style={styles.mixRow}>
        <View style={[styles.mixDot, { backgroundColor: p.color }]} />
        <AppText variant="body" style={styles.flex}>{p.label}</AppText>
        <AppText variant="caption">{((p.value / total) * 100).toFixed(0)}%</AppText>
        <AppText variant="subheading" style={styles.mixAmount}>{money(p.value)}</AppText>
      </View>)}
    </View>
  );
}

function Row({ icon, tint = colors.primary, rank, label, hint, value }: {
  icon?: keyof typeof Ionicons.glyphMap; tint?: string; rank?: number; label: string; hint?: string; value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${tint}14` }]}>
        {rank ? <AppText variant="subheading" color={tint}>{rank}</AppText> : <Ionicons name={icon!} size={18} color={tint} />}
      </View>
      <View style={styles.flex}>
        <AppText variant="subheading" numberOfLines={1}>{label}</AppText>
        {!!hint && <AppText variant="caption" numberOfLines={1}>{hint}</AppText>}
      </View>
      <AppText variant="subheading">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  alignEnd: { alignItems: 'flex-end' },
  content: { padding: space.lg, paddingBottom: space.xxxl, gap: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  hero: { borderRadius: radius.xl, padding: space.xl },
  heroLabel: { color: colors.onNavyMuted, fontFamily: fonts.medium, fontSize: 13 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: 2 },
  heroValue: { flexShrink: 1, color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 32, letterSpacing: -0.8 },
  heroHint: { color: '#7FA6CC', fontFamily: fonts.regular, fontSize: 12, marginTop: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontFamily: fonts.bold, fontSize: 12 },
  heroRow: { flexDirection: 'row', marginTop: space.lg },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: space.md },
  heroStat: { flex: 1 },
  heroStatLabel: { color: colors.onNavyMuted, fontFamily: fonts.medium, fontSize: 11.5 },
  heroStatValue: { fontFamily: fonts.bold, fontSize: 17, marginTop: 2 },
  chartWrap: { gap: space.sm },
  chart: { height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: 4, backgroundColor: colors.sky },
  barToday: { backgroundColor: colors.navy },
  barEmpty: { backgroundColor: colors.border },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between' },
  chartFoot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.md, marginTop: space.xs },
  mix: { gap: space.md },
  mixBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  mixRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mixDot: { width: 10, height: 10, borderRadius: 5 },
  mixAmount: { minWidth: 92, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailHint: { marginBottom: space.sm },
});
