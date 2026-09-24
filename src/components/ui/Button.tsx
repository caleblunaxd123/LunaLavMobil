import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radius, touch } from '../../theme';
import { AppText } from './Text';

type IconName = keyof typeof Ionicons.glyphMap;
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dark';

const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  dark: { bg: colors.navy, fg: colors.onPrimary },
  success: { bg: colors.success, fg: colors.onPrimary },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.borderStrong },
  ghost: { bg: 'transparent', fg: colors.primary },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: '#FBD3CF' },
};

export function Button({ label, onPress, variant = 'primary', size = 'lg', icon, iconRight, busy, disabled, style, accessibilityHint }: {
  label: string; onPress: () => void; variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg';
  icon?: IconName; iconRight?: IconName; busy?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityHint?: string;
}) {
  const p = palette[variant];
  const height = size === 'lg' ? 54 : size === 'md' ? touch : 38;
  const inactive = disabled || busy;
  return (
    <Pressable onPress={onPress} disabled={inactive} accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint={accessibilityHint} accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      style={({ pressed }) => [
        styles.base, { height, backgroundColor: p.bg, paddingHorizontal: size === 'sm' ? 12 : 18 },
        p.border ? { borderWidth: 1, borderColor: p.border } : null,
        disabled && !busy && styles.disabled, pressed && styles.pressed, style,
      ]}>
      {busy ? <ActivityIndicator color={p.fg} /> : <View style={styles.row}>
        {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={p.fg} />}
        <AppText style={[styles.label, { color: p.fg, fontSize: size === 'sm' ? 13 : 15 }]} numberOfLines={1}>{label}</AppText>
        {iconRight && <Ionicons name={iconRight} size={size === 'sm' ? 16 : 20} color={p.fg} />}
      </View>}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tone = 'default', size = 44, badge }: {
  icon: IconName; onPress: () => void; label: string; tone?: 'default' | 'primary' | 'light'; size?: number; badge?: boolean;
}) {
  const bg = tone === 'primary' ? colors.primarySoft : tone === 'light' ? 'rgba(255,255,255,0.14)' : colors.surface;
  const fg = tone === 'primary' ? colors.primary : tone === 'light' ? '#FFFFFF' : colors.text;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => [styles.icon, { width: size, height: size, backgroundColor: bg },
        tone === 'default' && styles.iconBorder, pressed && styles.pressed]}>
      <Ionicons name={icon} size={21} color={fg} />
      {badge && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.semibold },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  icon: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  iconBorder: { borderWidth: 1, borderColor: colors.border },
  dot: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: '#FFFFFF' },
});
