import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, space } from '../../theme';
import { AppText } from './Text';

export function Card({ children, style, onPress, padded = true, accessibilityLabel }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean; accessibilityLabel?: string;
}) {
  const base = [styles.card, padded && styles.padded, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [base, pressed && styles.pressed]}>{children}</Pressable>;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={[styles.divider, { marginLeft: inset }]} />;
}

export function ListItem({ title, subtitle, meta, leading, trailing, onPress, chevron, danger }: {
  title: string; subtitle?: string | null; meta?: ReactNode; leading?: ReactNode; trailing?: ReactNode;
  onPress?: () => void; chevron?: boolean; danger?: boolean;
}) {
  const content = <>
    {leading}
    <View style={styles.itemBody}>
      <AppText variant="subheading" numberOfLines={1} color={danger ? colors.danger : undefined}>{title}</AppText>
      {!!subtitle && <AppText variant="caption" numberOfLines={2}>{subtitle}</AppText>}
      {meta}
    </View>
    {trailing}
    {chevron && <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />}
  </>;
  if (!onPress) return <View style={styles.item}>{content}</View>;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}
    style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>{content}</Pressable>;
}

export function Section({ title, action, onAction, children, style }: {
  title: string; action?: string; onAction?: () => void; children: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.section, style]}>
    <View style={styles.sectionHeader}>
      <AppText variant="heading">{title}</AppText>
      {action && onAction && <Pressable onPress={onAction} hitSlop={10} accessibilityRole="link">
        <AppText variant="captionStrong" color={colors.primary}>{action}</AppText>
      </Pressable>}
    </View>
    {children}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  padded: { padding: space.lg },
  pressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg, minHeight: 60 },
  itemPressed: { backgroundColor: colors.surfaceMuted },
  itemBody: { flex: 1, gap: 2 },
  section: { marginTop: space.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
});
