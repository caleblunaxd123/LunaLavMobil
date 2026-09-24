import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { getDashboard } from '../api/operationsApi';
import { LogoMark } from '../components/brand';
import { AppText, Avatar, Card, Divider, ErrorState, InlineAlert, Kpi, Screen, Section, Skeleton } from '../components/ui';
import { usePermissions, type Modulo } from '../hooks/usePermissions';
import type { TabScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, radius, shadow, space } from '../theme';
import { money, processLabel } from '../utils/format';

type IconName = keyof typeof Ionicons.glyphMap;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

/** "+12% vs ayer" — comparación simple para leer la tendencia de un vistazo. */
function versus(today: number, yesterday: number) {
  if (!yesterday) return today ? 'Ayer no hubo movimiento' : 'Sin movimiento aún';
  if (!today) return 'Sin movimiento aún';
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs ayer`;
}

export function DashboardScreen({ navigation }: TabScreenProps<'Inicio'>) {
  const session = useAuthStore((s) => s.session)!;
  const can = usePermissions();
  const { usuario } = session;
  const dashboard = useQuery({
    queryKey: ['dashboard', usuario.negocioId, usuario.sedeId], queryFn: getDashboard, enabled: can('INICIO'), refetchInterval: 60_000,
  });
  const d = dashboard.data;

  const shortcuts: { module: Modulo; label: string; icon: IconName; tint: string; onPress: () => void }[] = [
    { module: 'PEDIDOS', label: 'Pedidos', icon: 'receipt-outline', tint: colors.primary, onPress: () => navigation.navigate('Pedidos') },
    { module: 'CLIENTES', label: 'Clientes', icon: 'people-outline', tint: colors.teal, onPress: () => navigation.navigate('Clientes') },
    { module: 'CAJA', label: 'Gasto', icon: 'remove-circle-outline', tint: colors.danger, onPress: () => navigation.navigate('NuevoGasto') },
    { module: 'INVENTARIO', label: 'Inventario', icon: 'cube-outline', tint: colors.warning, onPress: () => navigation.navigate('Inventario') },
  ];
  const visibleShortcuts = shortcuts.filter((s) => can(s.module));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={dashboard.isRefetching} onRefresh={() => void dashboard.refetch()} tintColor={colors.primary} />}>
        <View style={styles.top}>
          <LogoMark size={46} />
          <View style={styles.flex}>
            <AppText variant="caption">{greeting()},</AppText>
            <AppText variant="title" numberOfLines={1}>{usuario.nombreCompleto.split(' ')[0]}</AppText>
          </View>
          <Pressable onPress={() => navigation.navigate('Más')} accessibilityRole="button" accessibilityLabel="Mi cuenta">
            <Avatar name={usuario.nombreCompleto} size={44} />
          </Pressable>
        </View>

        <Pressable onPress={usuario.rol === 'ADMIN' ? () => navigation.navigate('SeleccionarSede') : undefined}
          style={styles.sede} accessibilityRole={usuario.rol === 'ADMIN' ? 'button' : undefined}>
          <Ionicons name="storefront-outline" size={15} color={colors.primary} />
          <AppText variant="captionStrong" color={colors.text}>{usuario.sedeNombre ?? 'Tu lavandería'}</AppText>
          {usuario.rol === 'ADMIN' && <Ionicons name="chevron-down" size={14} color={colors.muted} />}
        </Pressable>

        {session.isDemo && <View style={styles.demo}><InlineAlert tone="info" icon="sparkles" title="Estás en la demo"
          text="Los datos son de ejemplo. Crea tu cuenta gratis para usar LunaLav con tu lavandería." /></View>}

        {can('REGISTRAR') && <Pressable onPress={() => navigation.navigate('NuevoPedido')} accessibilityRole="button" accessibilityLabel="Registrar nuevo pedido">
          {({ pressed }) => (
            <LinearGradient colors={[colors.navy, colors.navyGradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cta, pressed && styles.pressed]}>
              <View style={styles.ctaIcon}><Ionicons name="add" size={28} color={colors.navy} /></View>
              <View style={styles.flex}>
                <AppText style={styles.ctaTitle}>Nuevo pedido</AppText>
                <AppText style={styles.ctaText}>Cliente, prendas y cobro en 3 pasos</AppText>
              </View>
              <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
            </LinearGradient>
          )}
        </Pressable>}

        {can('INICIO') && <Section title="Resumen de hoy" action={d ? 'Actualizar' : undefined} onAction={() => void dashboard.refetch()}>
          {dashboard.isLoading ? <View style={styles.kpis}>{[0, 1, 2, 3].map((i) => <View key={i} style={styles.kpiSkeleton}><Skeleton width="50%" /><Skeleton width="70%" height={24} /></View>)}</View>
            : dashboard.isError || !d ? <ErrorState onRetry={() => void dashboard.refetch()} />
              : <>
                <View style={styles.kpis}>
                  <Kpi icon="cash-outline" tone={colors.success} label="Ventas de hoy" value={money(d.ventasDelDia)} hint={versus(d.ventasDelDia, d.ventasAyer)} />
                  <Kpi icon="receipt-outline" tone={colors.primary} label="Pedidos de hoy" value={String(d.ordenesHoy)} hint={versus(d.ordenesHoy, d.ordenesAyer)} />
                  <Kpi icon="sync-outline" tone={colors.warning} label="En curso" value={String(d.totalPendientes + (d.totalEnProceso ?? 0))}
                    hint="Ver pedidos en curso" onPress={can('PEDIDOS') ? () => navigation.navigate('Pedidos', { filtro: 'pendientes' }) : undefined} />
                  <Kpi icon="bag-check-outline" tone={colors.teal} label="Por entregar" value={String(d.totalListos)}
                    hint={`${d.pedidosEntregadosHoy ?? 0} entregados hoy`} onPress={can('PEDIDOS') ? () => navigation.navigate('Pedidos', { filtro: 'listos' }) : undefined} />
                </View>
                {(d.saldoPorCobrar ?? 0) > 0 && <View style={styles.block}><InlineAlert tone="warning" title={`${money(d.saldoPorCobrar)} por cobrar`}
                  text="Saldo pendiente de pedidos activos. Cóbralo al entregar." /></View>}
                {d.totalPedidosAbandonados > 0 && <View style={styles.block}><InlineAlert tone="info" icon="time-outline"
                  title={`${d.totalPedidosAbandonados} pedidos esperan recojo hace días`} text="Avisa a tus clientes por WhatsApp desde el detalle del pedido." /></View>}
              </>}
        </Section>}

        {visibleShortcuts.length > 0 && <Section title="Accesos rápidos">
          <View style={styles.shortcuts}>
            {visibleShortcuts.map((s) => (
              <Pressable key={s.module} onPress={s.onPress} accessibilityRole="button" accessibilityLabel={s.label}
                style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
                <View style={[styles.shortcutIcon, { backgroundColor: `${s.tint}16` }]}><Ionicons name={s.icon} size={22} color={s.tint} /></View>
                <AppText variant="captionStrong" color={colors.text}>{s.label}</AppText>
              </Pressable>
            ))}
          </View>
        </Section>}

        {!!d?.ordenesRecientes?.length && <Section title="Actividad reciente" action="Ver todos" onAction={() => navigation.navigate('Pedidos', { filtro: 'ultimos' })}>
          <Card padded={false}>
            {d.ordenesRecientes.slice(0, 5).map((o, i) => (
              <View key={o.numero}>
                {i > 0 && <Divider inset={space.lg} />}
                <View style={styles.recent}>
                  <View style={styles.recentNumber}><AppText style={styles.recentNumberText}>#{o.numero}</AppText></View>
                  <View style={styles.flex}>
                    <AppText variant="subheading" numberOfLines={1}>{o.clienteNombre}</AppText>
                    <AppText variant="caption" numberOfLines={1}>{o.servicioPrincipal} · {processLabel(o.estadoProceso)}</AppText>
                  </View>
                  <AppText variant="subheading">{money(o.total)}</AppText>
                </View>
              </View>
            ))}
          </Card>
        </Section>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm },
  sede: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: space.md, marginBottom: space.lg, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  block: { marginTop: space.md },
  demo: { marginBottom: space.lg },
  cta: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderRadius: radius.xl, padding: space.xl, ...shadow.md },
  ctaIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 18 },
  ctaText: { color: colors.onNavyMuted, fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  kpiSkeleton: { flex: 1, minWidth: '46%', height: 118, gap: 10, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  shortcuts: { flexDirection: 'row', gap: space.md },
  shortcut: { flex: 1, alignItems: 'center', gap: space.sm, paddingVertical: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  shortcutIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  recent: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  recentNumber: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  recentNumberText: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
});
