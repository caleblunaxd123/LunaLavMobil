import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

type IconName = keyof typeof Ionicons.glyphMap;

export function ScreenTitle({ kicker = 'LUNALAV MÓVIL', title, icon, onBack, right }: {
  kicker?: string; title: string; icon?: IconName; onBack?: () => void; right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack && <Pressable onPress={onBack} hitSlop={10} style={styles.back} accessibilityLabel="Volver">
        <Ionicons name="arrow-back" size={22} color={colors.navy} />
      </Pressable>}
      <View style={styles.flex}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      {right ?? (icon && <View style={styles.icon}><Ionicons name={icon} size={26} color={colors.primary} /></View>)}
    </View>
  );
}

export function Button({ label, onPress, busy, disabled, variant = 'primary', icon, style }: {
  label: string; onPress: () => void; busy?: boolean; disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger'; icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const tint = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? colors.danger : colors.navy;
  return (
    <Pressable onPress={onPress} disabled={disabled || busy} accessibilityRole="button"
      style={({ pressed }) => [styles.button, styles[variant], (disabled || busy) && styles.disabled, pressed && styles.pressed, style]}>
      {busy ? <ActivityIndicator color={tint} /> : <>
        {icon && <Ionicons name={icon} size={20} color={tint} />}
        <Text style={[styles.buttonText, { color: tint }]}>{label}</Text>
      </>}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, color = colors.primary }: {
  label: string; active: boolean; onPress: () => void; color?: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return <View style={[styles.badge, { backgroundColor: `${color}1F` }]}><Text style={[styles.badgeText, { color }]}>{label}</Text></View>;
}

export function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={19} color={colors.muted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8DA3B7"
        style={styles.searchInput} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
      {!!value && <Pressable onPress={() => onChangeText('')} hitSlop={10}><Ionicons name="close-circle" size={18} color="#9AAEBF" /></Pressable>}
    </View>
  );
}

export function StateView({ loading, error, empty, emptyTitle = 'Todo listo para comenzar', emptyText = 'Los nuevos registros aparecerán aquí automáticamente.' }: {
  loading: boolean; error: boolean; empty: boolean; emptyTitle?: string; emptyText?: string;
}) {
  if (loading) return <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />;
  if (error) return <Message icon="cloud-offline-outline" color={colors.danger} title="No pudimos cargar los datos" text="Revisa la conexión y desliza hacia abajo para reintentar." />;
  if (empty) return <Message icon="sparkles-outline" color={colors.primary} title={emptyTitle} text={emptyText} />;
  return null;
}

export function Message({ icon, color = colors.muted, title, text, children }: {
  icon: IconName; color?: string; title: string; text: string; children?: ReactNode;
}) {
  return (
    <View style={styles.message}>
      <Ionicons name={icon} size={40} color={color} />
      <Text style={styles.messageTitle}>{title}</Text>
      <Text style={styles.messageText}>{text}</Text>
      {children}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>{children}</Pressable>;
}

export function Fab({ icon = 'add', label, onPress }: { icon?: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.fab, pressed && styles.pressed]} accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color="#FFFFFF" />
      <Text style={styles.fabText}>{label}</Text>
    </Pressable>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={19} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  kicker: { color: colors.primary, fontSize: 10, letterSpacing: 1.4, fontWeight: '900' },
  title: { color: colors.navy, fontSize: 27, fontWeight: '900', marginTop: 3 },
  icon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#DFF4FF', alignItems: 'center', justifyContent: 'center' },
  button: { height: 54, borderRadius: 17, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: '#FFF0F3', borderWidth: 1, borderColor: '#F8C9D2' },
  buttonText: { fontWeight: '900', fontSize: 15 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  chipText: { color: colors.navy, fontWeight: '800', fontSize: 12 },
  chipTextActive: { color: '#FFFFFF' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  search: { height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  loader: { marginTop: 80 },
  message: { minHeight: 280, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 32 },
  messageTitle: { color: colors.navy, fontSize: 19, fontWeight: '900', marginTop: 14, textAlign: 'center' },
  messageText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 7 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 13, marginBottom: 9 },
  fab: { position: 'absolute', right: 18, bottom: 18, height: 54, paddingHorizontal: 20, borderRadius: 27, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  fabText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#FFF0F3' },
  errorText: { color: colors.danger, flex: 1, lineHeight: 19 },
  section: { color: colors.navy, fontSize: 16, fontWeight: '900', marginTop: 20, marginBottom: 10 },
});
