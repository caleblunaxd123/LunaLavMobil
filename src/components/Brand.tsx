import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import { AppText } from './ui';

export function BrandMark({ size = 44, light = false }: { size?: number; light?: boolean }) {
  return (
    <LinearGradient colors={light ? ['#FFFFFF', '#E8F4FD'] : [colors.sky, colors.navy]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Ionicons name="moon" size={size * 0.5} color={light ? colors.navy : '#FFFFFF'} />
    </LinearGradient>
  );
}

export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <View style={styles.row} accessibilityLabel="LunaLav">
      <BrandMark size={compact ? 36 : 44} light={light} />
      <View>
        <AppText style={[styles.name, compact && styles.nameCompact, { color: light ? '#FFFFFF' : colors.navy }]}>
          Luna<AppText style={[styles.name, compact && styles.nameCompact, { color: light ? '#9ED8FF' : colors.sky }]}>Lav</AppText>
        </AppText>
        {!compact && <AppText style={[styles.tagline, { color: light ? '#B9D8F0' : colors.muted }]}>GESTIÓN PARA LAVANDERÍAS</AppText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.6, lineHeight: 28 },
  nameCompact: { fontSize: 19, lineHeight: 23 },
  tagline: { fontFamily: fonts.bold, fontSize: 8.5, letterSpacing: 1.3 },
});
