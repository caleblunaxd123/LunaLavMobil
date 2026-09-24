import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getClientes, getMovimientos, getPedidos } from '../api/operationsApi';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

interface Props { module: string; title: string; icon: keyof typeof Ionicons.glyphMap }
const tools = ['Inventario', 'Reportes', 'Promociones', 'Facturación', 'Configuración'];
const toolIcons: (keyof typeof Ionicons.glyphMap)[] = ['cube-outline','bar-chart-outline','pricetag-outline','document-text-outline','settings-outline'];

function State({ loading, error, empty }: { loading: boolean; error: boolean; empty: boolean }) {
  if (loading) return <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />;
  if (error) return <View style={styles.message}><Ionicons name="cloud-offline-outline" size={38} color={colors.danger} /><Text style={styles.messageTitle}>No pudimos cargar los datos</Text><Text style={styles.messageText}>Revisa la conexión y desliza hacia abajo para reintentar.</Text></View>;
  if (empty) return <View style={styles.message}><Ionicons name="sparkles-outline" size={38} color={colors.primary} /><Text style={styles.messageTitle}>Todo listo para comenzar</Text><Text style={styles.messageText}>Los nuevos registros aparecerán aquí automáticamente.</Text></View>;
  return null;
}

export function ModuleScreen({ module, title, icon }: Props) {
  const session = useAuthStore((state) => state.session)!;
  const allowed = module === 'MAS' || session.usuario.rol === 'ADMIN' || session.usuario.modulosPermitidos.includes(module);
  const pedidos = useQuery({ queryKey: ['pedidos', session.usuario.negocioId], queryFn: () => getPedidos(session), enabled: allowed && module === 'PEDIDOS' });
  const clientes = useQuery({ queryKey: ['clientes', session.usuario.negocioId], queryFn: () => getClientes(session), enabled: allowed && module === 'CLIENTES' });
  const caja = useQuery({ queryKey: ['caja', session.usuario.negocioId], queryFn: () => getMovimientos(session), enabled: allowed && module === 'CAJA' });
  const query = module === 'PEDIDOS' ? pedidos : module === 'CLIENTES' ? clientes : caja;

  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} refreshControl={module !== 'MAS' && allowed ? <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} /> : undefined}>
    <View style={styles.header}><View><Text style={styles.kicker}>LUNALAV MÓVIL</Text><Text style={styles.title}>{title}</Text></View><View style={styles.icon}><Ionicons name={icon} size={26} color={colors.primary} /></View></View>
    {!allowed ? <View style={styles.message}><Ionicons name="lock-closed-outline" size={48} color={colors.muted} /><Text style={styles.messageTitle}>Módulo no incluido</Text><Text style={styles.messageText}>Tu usuario no tiene permiso para acceder a {title.toLowerCase()}.</Text></View> : module === 'MAS' ? <View style={styles.tools}>{tools.map((tool, index) => <Pressable key={tool} style={styles.tool}><View style={styles.toolIcon}><Ionicons name={toolIcons[index]} size={23} color={colors.primary} /></View><Text style={styles.toolText}>{tool}</Text><Ionicons name="chevron-forward" color="#9AAEBF" size={18} /></Pressable>)}</View> : <>
      <View style={styles.search}><Ionicons name="search-outline" size={19} color={colors.muted} /><TextInput editable={false} placeholder={`Buscar en ${title.toLowerCase()}...`} placeholderTextColor="#8DA3B7" style={styles.searchInput} /></View>
      <State loading={query.isLoading} error={query.isError} empty={!query.isLoading && !query.isError && (module === 'PEDIDOS' ? !pedidos.data?.items.length : module === 'CLIENTES' ? !clientes.data?.length : !caja.data?.length)} />
      {module === 'PEDIDOS' && pedidos.data?.items.map((p) => <View key={p.id} style={styles.card}><View style={styles.badge}><Text style={styles.badgeText}>#{p.numero}</Text></View><View style={styles.cardBody}><Text style={styles.cardTitle}>{p.clienteNombre || 'Cliente'}</Text><Text style={styles.cardMeta}>{p.modalidad} · {p.estadoProceso}</Text><Text style={styles.cardSub}>{new Date(p.fechaIngreso).toLocaleDateString('es-PE')} · {p.estadoPago}</Text></View><Text style={styles.amount}>S/ {p.total.toFixed(2)}</Text></View>)}
      {module === 'CLIENTES' && clientes.data?.map((c) => <View key={c.id} style={styles.card}><View style={[styles.badge, { backgroundColor: '#E8FBF6' }]}><Ionicons name="person-outline" color={colors.success} size={20} /></View><View style={styles.cardBody}><Text style={styles.cardTitle}>{c.nombre}</Text><Text style={styles.cardMeta}>{c.celular || 'Sin celular'}</Text><Text style={styles.cardSub}>{c.direccion || 'Sin dirección registrada'}</Text></View>{c.puntos > 0 && <Text style={styles.points}>{c.puntos} pts</Text>}</View>)}
      {module === 'CAJA' && caja.data?.map((m) => <View key={m.id} style={styles.card}><View style={[styles.badge, { backgroundColor: m.tipo === 'INGRESO' ? '#E8FBF6' : '#FFF1F2' }]}><Ionicons name={m.tipo === 'INGRESO' ? 'arrow-down-outline' : 'arrow-up-outline'} color={m.tipo === 'INGRESO' ? colors.success : colors.danger} size={20} /></View><View style={styles.cardBody}><Text style={styles.cardTitle}>{m.descripcion || (m.pedidoNumero ? `Pedido #${m.pedidoNumero}` : m.tipo)}</Text><Text style={styles.cardMeta}>{m.metodoPago} · {new Date(m.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</Text><Text style={styles.cardSub}>{m.clienteNombre || new Date(m.fecha).toLocaleDateString('es-PE')}</Text></View><Text style={[styles.amount, { color: m.tipo === 'INGRESO' ? colors.success : colors.danger }]}>{m.tipo === 'INGRESO' ? '+' : '-'} S/ {m.monto.toFixed(2)}</Text></View>)}
    </>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 34, flexGrow: 1 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, kicker: { color: colors.primary, fontSize: 10, letterSpacing: 1.4, fontWeight: '900' }, title: { color: colors.navy, fontSize: 29, fontWeight: '900', marginTop: 3 }, icon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#DFF4FF', alignItems: 'center', justifyContent: 'center' },
  search: { height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8, marginBottom: 12 }, searchInput: { flex: 1, color: colors.text }, loader: { marginTop: 80 }, message: { flex: 1, minHeight: 300, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 32 }, messageTitle: { color: colors.navy, fontSize: 19, fontWeight: '900', marginTop: 14, textAlign: 'center' }, messageText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 7 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 13, gap: 11, marginBottom: 9 }, badge: { minWidth: 46, height: 43, borderRadius: 13, backgroundColor: '#E4F5FF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, badgeText: { color: colors.primary, fontWeight: '900', fontSize: 11 }, cardBody: { flex: 1 }, cardTitle: { color: colors.text, fontWeight: '900', fontSize: 14 }, cardMeta: { color: colors.muted, fontSize: 11, marginTop: 3 }, cardSub: { color: '#94A7B8', fontSize: 10, marginTop: 3 }, amount: { color: colors.navy, fontSize: 12, fontWeight: '900' }, points: { color: colors.violet, fontSize: 11, fontWeight: '900', backgroundColor: '#F1EBFF', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  tools: { gap: 10 }, tool: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 17, gap: 12 }, toolIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#E7F7FF', alignItems: 'center', justifyContent: 'center' }, toolText: { flex: 1, color: colors.navy, fontWeight: '800', fontSize: 15 },
});
