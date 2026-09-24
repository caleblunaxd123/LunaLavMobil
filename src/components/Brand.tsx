import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, light && styles.markLight]}>
        <Ionicons name="moon" size={compact ? 22 : 28} color={light ? colors.navy : '#FFFFFF'} />
      </View>
      <View>
        <Text style={[styles.name, compact && styles.nameCompact, light && styles.light]}>Luna<Text style={styles.accent}>Lav</Text></Text>
        {!compact && <Text style={[styles.tagline, light && styles.lightMuted]}>GESTIÓN PARA LAVANDERÍAS</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  markLight: { backgroundColor: '#FFFFFF' },
  name: { color: colors.navy, fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  nameCompact: { fontSize: 21 },
  accent: { color: colors.primary },
  tagline: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1.4 },
  light: { color: '#FFFFFF' }, lightMuted: { color: '#B9D8F0' },
});
