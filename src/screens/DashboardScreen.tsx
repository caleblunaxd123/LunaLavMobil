import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDashboard } from '../api/operationsApi';
import { Brand } from '../components/Brand';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

const shortcuts = [
  { module: 'REGISTRAR', label: 'Nuevo pedido', icon: 'add-circle-outline' as const, color: colors.primary },
  { module: 'PEDIDOS', label: 'Ver pedidos', icon: 'receipt-outline' as const, color: colors.violet },
  { module: 'CLIENTES', label: 'Clientes', icon: 'people-outline' as const, color: colors.mint },
  { module: 'INVENTARIO', label: 'Inventario', icon: 'cube-outline' as const, color: colors.warning },
];

export function DashboardScreen() {
  const session = useAuthStore((state) => state.session)!; const logout = useAuthStore((state) => state.logout);
  const dashboard = useQuery({ queryKey: ['dashboard', session.usuario.negocioId, session.usuario.sedeId], queryFn: () => getDashboard(session) });
  const allowed = (module: string) => session.usuario.rol === 'ADMIN' || session.usuario.modulosPermitidos.includes(module);
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={dashboard.isRefetching} onRefresh={() => void dashboard.refetch()} tintColor={colors.primary} />}>
    <View style={styles.top}><Brand compact /><Pressable style={styles.avatar} onPress={() => void logout()}><Text style={styles.avatarText}>{session.usuario.nombreCompleto.charAt(0).toUpperCase()}</Text></Pressable></View>
    {session.isDemo && <View style={styles.demoBanner}><Ionicons name="sparkles" size={18} color="#6D45D8" /><Text style={styles.demoText}>Estás explorando una demo con datos ficticios.</Text></View>}
    <LinearGradient colors={[colors.navy, '#0D5790']} style={styles.hero}><Text style={styles.hello}>Hola, {session.usuario.nombreCompleto.split(' ')[0]} 👋</Text><Text style={styles.heroTitle}>{session.usuario.sedeNombre || 'Tu lavandería'}, bajo control.</Text><View style={styles.heroMeta}><Ionicons name="business-outline" color="#BDE9FF" size={16} /><Text style={styles.heroMetaText}>{session.usuario.rol} · Empresa #{session.usuario.negocioId}</Text></View></LinearGradient>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Accesos rápidos</Text><Text style={styles.sectionLink}>Personalizados para ti</Text></View>
    <View style={styles.grid}>{shortcuts.filter((item) => allowed(item.module)).map((item) => <Pressable key={item.module} style={styles.shortcut}><View style={[styles.shortcutIcon, { backgroundColor: `${item.color}18` }]}><Ionicons name={item.icon} size={27} color={item.color} /></View><Text style={styles.shortcutText}>{item.label}</Text><Ionicons name="chevron-forward" size={17} color="#9AAEBF" /></Pressable>)}</View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Resumen de hoy</Text><Text style={styles.sectionLink}>En tiempo real</Text></View>
    {dashboard.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} /> : dashboard.isError ? <View style={styles.info}><Ionicons name="cloud-offline-outline" size={22} color={colors.danger} /><Text style={styles.infoText}>No se pudo cargar el resumen. Desliza hacia abajo para reintentar.</Text></View> : <>
      <View style={styles.stats}><View style={styles.stat}><Text style={styles.statLabel}>Pedidos de hoy</Text><Text style={styles.statNumber}>{dashboard.data?.ordenesHoy ?? 0}</Text><Text style={styles.statHint}>{dashboard.data?.totalPendientes ?? 0} pendientes · {dashboard.data?.totalListos ?? 0} listos</Text></View><View style={styles.stat}><Text style={styles.statLabel}>Ventas de hoy</Text><Text style={styles.statNumber}>S/ {(dashboard.data?.ventasDelDia ?? 0).toFixed(2)}</Text><Text style={styles.statHint}>{dashboard.data?.totalClientes ?? 0} clientes registrados</Text></View></View>
      {!!dashboard.data?.ordenesRecientes?.length && <View style={styles.recent}><Text style={styles.recentTitle}>Actividad reciente</Text>{dashboard.data.ordenesRecientes.slice(0, 4).map((order) => <View key={order.numero} style={styles.recentRow}><View style={styles.orderBadge}><Text style={styles.orderBadgeText}>#{order.numero}</Text></View><View style={{ flex: 1 }}><Text style={styles.orderName}>{order.clienteNombre}</Text><Text style={styles.orderMeta}>{order.servicioPrincipal} · {order.estadoProceso}</Text></View><Text style={styles.orderTotal}>S/ {order.total.toFixed(2)}</Text></View>)}</View>}
    </>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 32 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, avatar: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#DDF3FF', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.primary, fontSize: 17, fontWeight: '900' },
  demoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0EBFF', borderRadius: 14, padding: 12, marginBottom: 12 }, demoText: { color: '#6044A3', fontWeight: '700', fontSize: 12, flex: 1 }, hero: { borderRadius: 24, padding: 22, minHeight: 170, justifyContent: 'center', shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 16, elevation: 7 }, hello: { color: '#BDE9FF', fontWeight: '700', fontSize: 13 }, heroTitle: { color: '#FFFFFF', fontSize: 27, lineHeight: 33, fontWeight: '900', marginTop: 7, maxWidth: 270 }, heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 }, heroMetaText: { color: '#D9F2FF', fontSize: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 25, marginBottom: 12 }, sectionTitle: { color: colors.navy, fontSize: 19, fontWeight: '900' }, sectionLink: { color: colors.muted, fontSize: 11 }, grid: { gap: 10 }, shortcut: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', padding: 13, borderRadius: 17, borderWidth: 1, borderColor: colors.border }, shortcutIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, shortcutText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: 10 }, stat: { flex: 1, minHeight: 130, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 15 }, statLabel: { color: colors.muted, fontWeight: '700', fontSize: 12 }, statNumber: { color: colors.navy, fontSize: 25, fontWeight: '900', marginTop: 10 }, statHint: { color: '#91A2B2', fontSize: 10, marginTop: 8, lineHeight: 14 }, info: { flexDirection: 'row', gap: 9, padding: 14, borderRadius: 15, backgroundColor: '#EAF7FF', marginTop: 18 }, infoText: { flex: 1, color: '#37617E', fontSize: 12, lineHeight: 18 },
  recent: { marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 15 }, recentTitle: { color: colors.navy, fontWeight: '900', fontSize: 16, marginBottom: 8 }, recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, orderBadge: { backgroundColor: '#E4F5FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 }, orderBadgeText: { color: colors.primary, fontWeight: '900', fontSize: 11 }, orderName: { color: colors.text, fontWeight: '800', fontSize: 13 }, orderMeta: { color: colors.muted, fontSize: 10, marginTop: 3 }, orderTotal: { color: colors.navy, fontWeight: '900', fontSize: 12 },
});
