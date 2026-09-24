import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, space } from '../../theme';
import { IconButton } from './Button';
import { AppText } from './Text';

/** Contenedor base de cada pantalla: fondo, área segura y teclado. */
export function Screen({ children, edges = ['top'], style }: {
  children: ReactNode; edges?: ('top' | 'bottom')[]; style?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{children}</KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Título grande de las pestañas principales. */
export function TabHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.tabHeader}>
      <View style={styles.flex}>
        <AppText variant="display" accessibilityRole="header">{title}</AppText>
        {!!subtitle && <AppText variant="caption" style={styles.subtitle}>{subtitle}</AppText>}
      </View>
      {right}
    </View>
  );
}

/** Barra superior de pantallas apiladas (detalle, formularios). */
export function StackHeader({ title, subtitle, onBack, right, close }: {
  title: string; subtitle?: string; onBack: () => void; right?: ReactNode; close?: boolean;
}) {
  return (
    <View style={styles.stackHeader}>
      <IconButton icon={close ? 'close' : 'arrow-back'} label={close ? 'Cerrar' : 'Volver'} onPress={onBack} />
      <View style={styles.stackTitle}>
        <AppText variant="heading" numberOfLines={1} accessibilityRole="header">{title}</AppText>
        {!!subtitle && <AppText variant="caption" numberOfLines={1}>{subtitle}</AppText>}
      </View>
      <View style={styles.stackRight}>{right}</View>
    </View>
  );
}

/** Acción principal fija al pie de la pantalla (siempre visible sobre el teclado). */
export function BottomBar({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, space.md) }, style]}>{children}</View>;
}

/** Hoja inferior modal para acciones rápidas (cobrar, confirmar, elegir). */
export function Sheet({ visible, onClose, title, subtitle, children }: {
  visible: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.sheetRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) + space.sm }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View style={styles.flex}>
              <AppText variant="title">{title}</AppText>
              {!!subtitle && <AppText variant="caption" style={styles.subtitle}>{subtitle}</AppText>}
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar"><Ionicons name="close" size={24} color={colors.muted} /></Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Indicador de avance para flujos por pasos. */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={styles.steps} accessibilityLabel={`Paso ${current + 1} de ${steps.length}: ${steps[current]}`}>
      <View style={styles.stepBars}>
        {steps.map((s, i) => <View key={s} style={[styles.stepBar, i <= current && styles.stepBarOn]} />)}
      </View>
      <AppText variant="caption">Paso {current + 1} de {steps.length} · <AppText variant="captionStrong" color={colors.text}>{steps[current]}</AppText></AppText>
    </View>
  );
}

export function Kpi({ label, value, hint, icon, tone = colors.primary, onPress }: {
  label: string; value: string; hint?: string; icon: keyof typeof Ionicons.glyphMap; tone?: string; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.kpi, pressed && styles.pressed]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${tone}16` }]}><Ionicons name={icon} size={18} color={tone} /></View>
      <AppText variant="caption" numberOfLines={1}>{label}</AppText>
      <AppText variant="number" numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
      {!!hint && <AppText variant="caption" numberOfLines={1} style={styles.kpiHint}>{hint}</AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  subtitle: { marginTop: 2 },
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm, marginBottom: space.lg },
  stackHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.background },
  stackTitle: { flex: 1 },
  stackRight: { minWidth: 44, alignItems: 'flex-end' },
  bottomBar: { paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: space.sm, ...shadow.md },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(5,20,40,0.45)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.lg },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  steps: { gap: space.sm },
  stepBars: { flexDirection: 'row', gap: 6 },
  stepBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  stepBarOn: { backgroundColor: colors.primary },
  kpi: { flex: 1, minWidth: '46%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: 4, ...shadow.sm },
  kpiIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  kpiHint: { marginTop: 2 },
  pressed: { opacity: 0.85 },
});
