import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius, space } from '../../theme';
import { AppText } from './Text';

export interface Segment<T extends string | number> { value: T; label: string; count?: number }

/** Filtros tipo pestaña: desplazables en horizontal cuando no caben. */
export function SegmentedControl<T extends string | number>({ segments, value, onChange }: {
  segments: Segment<T>[]; value: T; onChange: (value: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segments} accessibilityRole="tablist">
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable key={String(s.value)} onPress={() => onChange(s.value)} accessibilityRole="tab" accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}>
            <AppText variant="captionStrong" color={active ? '#FFFFFF' : colors.textSecondary}>{s.label}</AppText>
            {s.count != null && <View style={[styles.count, active && styles.countActive]}>
              <AppText style={[styles.countText, { color: active ? '#FFFFFF' : colors.muted }]}>{s.count > 99 ? '99+' : s.count}</AppText>
            </View>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Opción seleccionable (métodos de pago, fechas, modalidades). */
export function Choice({ label, selected, onPress, icon }: {
  label: string; selected: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }}
      style={[styles.choice, selected && styles.choiceSelected]}>
      {icon && <Ionicons name={icon} size={16} color={selected ? colors.primary : colors.muted} />}
      <AppText variant="captionStrong" color={selected ? colors.primary : colors.textSecondary}>{label}</AppText>
    </Pressable>
  );
}

export function SearchBar({ value, onChangeText, placeholder, autoFocus }: {
  value: string; onChangeText: (value: string) => void; placeholder: string; autoFocus?: boolean;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.placeholder} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.placeholder}
        style={styles.searchInput} autoCorrect={false} autoCapitalize="none" returnKeyType="search" autoFocus={autoFocus}
        accessibilityLabel={placeholder} />
      {!!value && <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
        <Ionicons name="close-circle" size={18} color={colors.placeholder} />
      </Pressable>}
    </View>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <Pressable onPress={() => onChange(!checked)} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
      </View>
      <View style={styles.flex}>{typeof label === 'string' ? <AppText variant="caption">{label}</AppText> : label}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  segments: { gap: space.sm, paddingVertical: 2 },
  segment: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  segmentActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  count: { minWidth: 20, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF1F5' },
  countActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  countText: { fontFamily: fonts.bold, fontSize: 10.5 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft, borderWidth: 1.5 },
  search: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 15, fontFamily: fonts.medium, color: colors.text, paddingVertical: 10, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) } as object,
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, marginTop: 1 },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
