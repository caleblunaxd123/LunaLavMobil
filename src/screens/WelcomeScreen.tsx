import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '../components/Brand';
import type { AuthStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { enterDemo, busy, error, clearError } = useAuthStore();
  const openDemo = async () => { clearError(); await enterDemo(); };
  return <LinearGradient colors={['#F8FCFF', '#EAF8FF', '#F1F0FF']} style={styles.flex}>
    <SafeAreaView style={styles.flex}><ScrollView contentContainerStyle={styles.content}>
      <Brand />
      <View style={styles.illustration}>
        <LinearGradient colors={[colors.navy, colors.primary]} style={styles.phone}>
          <View style={styles.phoneTop}><View style={styles.camera} /></View>
          <View style={styles.phoneBody}><Ionicons name="shirt-outline" size={46} color={colors.primary} />
            <Text style={styles.phoneTitle}>Todo bajo control</Text>
            <View style={styles.miniRow}><View style={styles.miniDot} /><View style={styles.miniLine} /></View>
            <View style={styles.miniRow}><View style={[styles.miniDot, { backgroundColor: colors.mint }]} /><View style={[styles.miniLine, { width: '58%' }]} /></View>
            <View style={styles.miniRow}><View style={[styles.miniDot, { backgroundColor: colors.violet }]} /><View style={[styles.miniLine, { width: '72%' }]} /></View>
          </View>
        </LinearGradient>
        <View style={[styles.floatCard, styles.floatOne]}><Ionicons name="checkmark-circle" color={colors.success} size={22} /><Text style={styles.floatText}>Pedido listo</Text></View>
        <View style={[styles.floatCard, styles.floatTwo]}><Ionicons name="trending-up" color={colors.primary} size={22} /><Text style={styles.floatText}>Tu negocio crece</Text></View>
      </View>
      <View style={styles.hero}><Text style={styles.eyebrow}>LA LAVANDERÍA EN TU BOLSILLO</Text>
        <Text style={styles.title}>Gestiona cada pedido, desde cualquier lugar.</Text>
        <Text style={styles.subtitle}>Pedidos, clientes, caja e inventario conectados en una aplicación hecha para lavanderías.</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Trial')} disabled={busy}><Text style={styles.primaryText}>Comenzar prueba gratis</Text><Ionicons name="arrow-forward" size={20} color="#FFFFFF" /></Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Login')} disabled={busy}><Text style={styles.secondaryText}>Ya tengo una cuenta</Text></Pressable>
      <Pressable style={styles.demoButton} onPress={openDemo} disabled={busy}>{busy ? <ActivityIndicator color={colors.primary} /> : <><Ionicons name="play-circle-outline" size={21} color={colors.primary} /><Text style={styles.demoText}>Explorar demo sin registrarme</Text></>}</Pressable>
      <Text style={styles.legal}>Al continuar aceptas los Términos y la Política de privacidad de LunaLav.</Text>
    </ScrollView></SafeAreaView>
  </LinearGradient>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 28 }, illustration: { height: 265, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  phone: { width: 165, height: 235, borderRadius: 30, padding: 8, transform: [{ rotate: '3deg' }], shadowColor: colors.navy, shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
  phoneTop: { height: 20, alignItems: 'center' }, camera: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#315A81' }, phoneBody: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 23, alignItems: 'center', paddingTop: 22, paddingHorizontal: 17 },
  phoneTitle: { color: colors.navy, fontSize: 15, fontWeight: '800', marginTop: 8, marginBottom: 18 }, miniRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }, miniDot: { width: 18, height: 18, borderRadius: 6, backgroundColor: colors.cyan }, miniLine: { height: 7, width: '68%', borderRadius: 4, backgroundColor: '#DBEAF5' },
  floatCard: { position: 'absolute', flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 15, elevation: 6 }, floatOne: { top: 42, right: 5 }, floatTwo: { bottom: 30, left: 4 }, floatText: { color: colors.navy, fontWeight: '800', fontSize: 12 },
  hero: { alignItems: 'center' }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginBottom: 9 }, title: { color: colors.navy, fontSize: 31, lineHeight: 36, fontWeight: '900', textAlign: 'center', letterSpacing: -0.8 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  primaryButton: { height: 56, borderRadius: 17, backgroundColor: colors.primary, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6 }, primaryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 }, secondaryButton: { height: 54, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 11 }, secondaryText: { color: colors.navy, fontWeight: '800', fontSize: 15 },
  demoButton: { flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 }, demoText: { color: colors.primary, fontWeight: '800' }, legal: { color: '#8295A7', fontSize: 11, textAlign: 'center', lineHeight: 16 }, error: { color: colors.danger, textAlign: 'center', marginBottom: 10 },
});
