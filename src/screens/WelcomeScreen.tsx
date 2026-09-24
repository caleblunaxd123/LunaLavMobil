import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '../components/Brand';
import { AppText, Button, InlineAlert } from '../components/ui';
import type { AuthStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, radius, shadow, space } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const benefits: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'receipt-outline', title: 'Pedidos en segundos', text: 'Registra, cobra y avisa por WhatsApp cuando esté listo.' },
  { icon: 'wallet-outline', title: 'Caja siempre cuadrada', text: 'Ingresos, gastos y efectivo del día, sin cuadernos.' },
  { icon: 'people-outline', title: 'Clientes que vuelven', text: 'Historial, puntos y datos de contacto a la mano.' },
];

export function WelcomeScreen({ navigation }: Props) {
  const { enterDemo, busy, error, clearError } = useAuthStore();
  const openDemo = async () => { clearError(); await enterDemo(); };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.navy, '#0B4F8A']} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroTop}><Brand light /></View>
          <View style={styles.preview}>
            <PreviewRow icon="checkmark-circle" tint="#34D399" title="Pedido #1024 listo" meta="WhatsApp enviado a María" />
            <PreviewRow icon="trending-up" tint={colors.sky} title="S/ 1,280.50 hoy" meta="32 pedidos · 5 por entregar" />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <AppText variant="display">Tu lavandería, ordenada y en tu bolsillo</AppText>
          <AppText variant="body" style={styles.lead}>La misma información de LunaLav web, en una app hecha para el mostrador. Prueba 14 días gratis, sin tarjeta.</AppText>

          <View style={styles.benefits}>
            {benefits.map((b) => (
              <View key={b.title} style={styles.benefit}>
                <View style={styles.benefitIcon}><Ionicons name={b.icon} size={20} color={colors.primary} /></View>
                <View style={styles.flex}>
                  <AppText variant="subheading">{b.title}</AppText>
                  <AppText variant="caption">{b.text}</AppText>
                </View>
              </View>
            ))}
          </View>

          {!!error && <View style={styles.error}><InlineAlert text={error} /></View>}
        </ScrollView>
        {/* Acciones fijas al pie: siempre visibles, sin importar el tamaño de la pantalla. */}
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Button label="Crear cuenta gratis" iconRight="arrow-forward" onPress={() => navigation.navigate('Registro')} disabled={busy} />
          <Button label="Ya tengo una cuenta" variant="secondary" onPress={() => navigation.navigate('Login')} disabled={busy} style={styles.second} />
          <Pressable onPress={openDemo} disabled={busy} style={styles.demo} accessibilityRole="button">
            <Ionicons name="play-circle-outline" size={20} color={colors.primary} />
            <AppText variant="captionStrong" color={colors.primary}>{busy ? 'Abriendo la demo…' : 'Explorar la demo sin registrarme'}</AppText>
          </Pressable>
        </SafeAreaView>
      </View>
    </View>
  );
}

function PreviewRow({ icon, tint, title, meta }: { icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; meta: string }) {
  return (
    <View style={styles.previewRow}>
      <Ionicons name={icon} size={22} color={tint} />
      <View style={styles.flex}>
        <AppText style={styles.previewTitle}>{title}</AppText>
        <AppText style={styles.previewMeta}>{meta}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.navy },
  hero: { paddingHorizontal: space.xl, paddingBottom: 40 },
  heroTop: { paddingTop: space.md },
  preview: { marginTop: space.lg, gap: space.sm },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  previewTitle: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 14 },
  previewMeta: { color: '#A9C8E6', fontFamily: fonts.regular, fontSize: 12 },
  sheet: { flex: 1, backgroundColor: colors.background, marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, ...shadow.md },
  content: { padding: space.xl, paddingTop: space.xxl, paddingBottom: space.lg },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.sm },
  lead: { marginTop: space.sm },
  benefits: { marginTop: space.xl, gap: space.lg },
  benefit: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  benefitIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  error: { marginBottom: space.md },
  second: { marginTop: space.sm },
  demo: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
});
