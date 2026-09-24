import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenTitle, SectionLabel } from '../components/ui';
import type { TabScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

type IconName = keyof typeof Ionicons.glyphMap;

// Módulos que todavía se gestionan desde la web; se abren en el navegador con la misma cuenta.
const webTools: { label: string; icon: IconName; path: string }[] = [
  { label: 'Inventario', icon: 'cube-outline', path: 'inventario' },
  { label: 'Reportes', icon: 'bar-chart-outline', path: 'reportes' },
  { label: 'Cuadre de caja', icon: 'calculator-outline', path: 'cuadre-caja' },
  { label: 'Promociones', icon: 'pricetag-outline', path: 'promociones' },
  { label: 'Facturación', icon: 'document-text-outline', path: 'facturacion/comprobantes' },
  { label: 'Configuración', icon: 'settings-outline', path: 'ajustes' },
];

export function MasScreen({ navigation }: TabScreenProps<'Más'>) {
  const session = useAuthStore((state) => state.session)!;
  const logout = useAuthStore((state) => state.logout);
  const { usuario } = session;

  const confirmLogout = () => Alert.alert('Cerrar sesión', '¿Quieres salir de LunaLav en este dispositivo?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Cerrar sesión', style: 'destructive', onPress: () => void logout() },
  ]);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenTitle title="Más herramientas" icon="apps-outline" />
      <View style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{usuario.nombreCompleto.charAt(0).toUpperCase()}</Text></View>
        <View style={styles.flex}>
          <Text style={styles.name}>{usuario.nombreCompleto}</Text>
          <Text style={styles.meta}>@{usuario.usuario} · {usuario.rol}</Text>
          <Text style={styles.meta}>{usuario.sedeNombre ? `Sede ${usuario.sedeNombre}` : 'Sin sede asignada'}{session.isDemo ? ' · Demo' : ''}</Text>
        </View>
      </View>

      {usuario.rol === 'ADMIN' && <Item icon="business-outline" label="Cambiar de sede" onPress={() => navigation.navigate('SeleccionarSede')} />}

      <SectionLabel>En la web de LunaLav</SectionLabel>
      {webTools.map((tool) => <Item key={tool.path} icon={tool.icon} label={tool.label} external
        onPress={() => void Linking.openURL(`${session.apiOrigin}/${tool.path}`)} />)}

      <SectionLabel>Cuenta</SectionLabel>
      <Item icon="log-out-outline" label="Cerrar sesión" danger onPress={confirmLogout} />
      <Text style={styles.version}>LunaLav Móvil · v1.0</Text>
    </ScrollView>
  </SafeAreaView>;
}

function Item({ icon, label, onPress, external, danger }: { icon: IconName; label: string; onPress: () => void; external?: boolean; danger?: boolean }) {
  const tint = danger ? colors.danger : colors.primary;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
    <View style={[styles.itemIcon, { backgroundColor: danger ? '#FFF0F3' : '#E7F7FF' }]}><Ionicons name={icon} size={22} color={tint} /></View>
    <Text style={[styles.itemText, danger && { color: colors.danger }]}>{label}</Text>
    <Ionicons name={external ? 'open-outline' : 'chevron-forward'} color="#9AAEBF" size={18} />
  </Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 34 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 15, marginBottom: 10 },
  avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#DDF3FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  name: { color: colors.navy, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 17, gap: 12, marginBottom: 9 },
  pressed: { opacity: 0.8 },
  itemIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, color: colors.navy, fontWeight: '800', fontSize: 15 },
  version: { color: '#9AAEBF', fontSize: 11, textAlign: 'center', marginTop: 16 },
});
