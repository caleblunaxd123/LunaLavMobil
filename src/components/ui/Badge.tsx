import { StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '../../theme';
import { AppText } from './Text';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'violet' | 'teal';

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: colors.textSecondary, bg: '#EEF1F5' },
  primary: { fg: colors.primary, bg: colors.primarySoft },
  success: { fg: colors.success, bg: colors.successSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  violet: { fg: colors.violet, bg: colors.violetSoft },
  teal: { fg: '#11845F', bg: colors.tealSoft },
};

export function Badge({ label, tone = 'neutral', dot = true }: { label: string; tone?: Tone; dot?: boolean }) {
  const c = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]} accessibilityLabel={label}>
      {dot && <View style={[styles.dot, { backgroundColor: c.fg }]} />}
      <AppText style={[styles.text, { color: c.fg }]}>{label}</AppText>
    </View>
  );
}

export function Avatar({ name, size = 44, tone = 'primary' }: { name: string; size?: number; tone?: Tone }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '?';
  const c = toneColors[tone];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: c.bg }]}>
      <AppText style={{ color: c.fg, fontFamily: fonts.bold, fontSize: size * 0.34 }}>{initials}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
