import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../../theme';
import { AppText } from './Text';

/**
 * Paginación compacta: la lista nunca crece sin límite. Muestra el rango visible
 * ("21–40 de 134") y botones grandes para avanzar o retroceder.
 */
export function Pager({ page, pageSize, total, onChange, capped }: {
  page: number; pageSize: number; total: number; onChange: (page: number) => void; capped?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return capped ? <CapNote /> : null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <View style={styles.wrap}>
      <View style={styles.pager}>
        <PagerButton icon="chevron-back" label="Página anterior" disabled={page <= 1} onPress={() => onChange(page - 1)} />
        <View style={styles.center}>
          <AppText variant="captionStrong" color={colors.text}>Página {page} de {pages}</AppText>
          <AppText variant="caption">{from}–{to} de {total}{capped ? '+' : ''}</AppText>
        </View>
        <PagerButton icon="chevron-forward" label="Página siguiente" disabled={page >= pages} onPress={() => onChange(page + 1)} />
      </View>
      {capped && page >= pages && <CapNote />}
    </View>
  );
}

function CapNote() {
  return <AppText variant="caption" align="center" style={styles.cap}>Se muestran los registros más recientes. Usa la búsqueda para encontrar los anteriores.</AppText>;
}

function PagerButton({ icon, label, disabled, onPress }: { icon: 'chevron-back' | 'chevron-forward'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.md, gap: space.sm },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 6 },
  center: { alignItems: 'center' },
  button: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  cap: { paddingHorizontal: space.lg },
});
