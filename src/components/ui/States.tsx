import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { colors, radius, space } from '../../theme';
import { Button } from './Button';
import { AppText } from './Text';

type IconName = keyof typeof Ionicons.glyphMap;

export function EmptyState({ icon = 'file-tray-outline', title, text, actionLabel, onAction, tone = colors.primary, children }: {
  icon?: IconName; title: string; text?: string; actionLabel?: string; onAction?: () => void; tone?: string; children?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: `${tone}14` }]}><Ionicons name={icon} size={30} color={tone} /></View>
      <AppText variant="heading" align="center">{title}</AppText>
      {!!text && <AppText variant="body" align="center" style={styles.emptyText}>{text}</AppText>}
      {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} size="md" style={styles.emptyAction} />}
      {children}
    </View>
  );
}

export function ErrorState({ onRetry, text = 'Revisa tu conexión a internet e inténtalo de nuevo.' }: { onRetry?: () => void; text?: string }) {
  return <EmptyState icon="cloud-offline-outline" tone={colors.danger} title="No pudimos cargar la información" text={text}
    actionLabel={onRetry ? 'Reintentar' : undefined} onAction={onRetry} />;
}

export function LockedState({ module }: { module: string }) {
  return <EmptyState icon="lock-closed-outline" tone={colors.muted} title="Sin acceso a este módulo"
    text={`Tu usuario no tiene permiso para ${module}. Pide al administrador que lo habilite en Ajustes → Permisos.`} />;
}

/** Bloque gris animado mientras carga el contenido real. */
export function Skeleton({ width = '100%', height = 14, round = 6 }: { width?: DimensionValue; height?: number; round?: number }) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ width, height, borderRadius: round, backgroundColor: '#E6EAF0', opacity }} />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View style={styles.skeletonCard} accessibilityLabel="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[styles.skeletonRow, i > 0 && styles.skeletonDivider]}>
          <Skeleton width={42} height={42} round={12} />
          <View style={styles.skeletonBody}><Skeleton width="60%" /><Skeleton width="40%" height={11} /></View>
          <Skeleton width={56} height={14} />
        </View>
      ))}
    </View>
  );
}

export function InlineAlert({ tone = 'danger', title, text, icon }: {
  tone?: 'danger' | 'warning' | 'info' | 'success'; title?: string; text: string; icon?: IconName;
}) {
  const map = {
    danger: { fg: colors.danger, bg: colors.dangerSoft, icon: 'alert-circle' as IconName },
    warning: { fg: colors.warning, bg: colors.warningSoft, icon: 'warning' as IconName },
    info: { fg: colors.primary, bg: colors.infoSoft, icon: 'information-circle' as IconName },
    success: { fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle' as IconName },
  }[tone];
  return (
    <View style={[styles.alert, { backgroundColor: map.bg }]} accessibilityRole="alert">
      <Ionicons name={icon ?? map.icon} size={20} color={map.fg} />
      <View style={styles.alertBody}>
        {!!title && <AppText variant="captionStrong" color={map.fg}>{title}</AppText>}
        <AppText variant="caption" color={colors.textSecondary}>{text}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: space.xxl, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  emptyText: { marginTop: 6, maxWidth: 300 },
  emptyAction: { marginTop: space.xl, minWidth: 180 },
  skeletonCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: space.lg },
  skeletonDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  skeletonBody: { flex: 1, gap: 8 },
  alert: { flexDirection: 'row', gap: 10, padding: space.md, borderRadius: radius.md, alignItems: 'flex-start' },
  alertBody: { flex: 1, gap: 2 },
});
