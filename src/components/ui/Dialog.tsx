import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { create } from 'zustand';
import { colors, fonts, radius, shadow, space } from '../../theme';
import { AppText } from './Text';

type IconName = keyof typeof Ionicons.glyphMap;
export type DialogTone = 'info' | 'danger' | 'success' | 'warning';

export interface DialogButton {
  text: string;
  /** Igual que Alert.alert: 'cancel' es la salida segura, 'destructive' la acción que no se puede deshacer. */
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogOptions {
  /** Por defecto: «danger» si hay un botón destructivo, si no «info». */
  tone?: DialogTone;
  icon?: IconName;
}

interface DialogItem extends DialogOptions { id: number; title: string; message?: string; buttons: DialogButton[] }
interface DialogState { queue: DialogItem[]; push: (d: Omit<DialogItem, 'id'>) => void; shift: () => void }

let nextId = 1;
const useDialogStore = create<DialogState>((set) => ({
  queue: [],
  push: (d) => set((s) => ({ queue: [...s.queue, { ...d, id: nextId++ }] })),
  shift: () => set((s) => ({ queue: s.queue.slice(1) })),
}));

/**
 * Cuadro de diálogo con la marca de LunaLav. Misma firma que `Alert.alert`
 * (título, mensaje, botones) más un cuarto parámetro opcional para el tono y el icono.
 */
export function alerta(title: string, message?: string, buttons?: DialogButton[], options?: DialogOptions) {
  useDialogStore.getState().push({ title, message, buttons: buttons?.length ? buttons : [{ text: 'Entendido' }], ...options });
}

const TONES: Record<DialogTone, { icon: IconName; accent: string; gradient: [string, string]; action: string }> = {
  info: { icon: 'help-circle', accent: colors.primary, gradient: [colors.navy, colors.navyGradientEnd], action: colors.primary },
  success: { icon: 'checkmark-circle', accent: colors.teal, gradient: [colors.navy, '#0B6E6E'], action: colors.success },
  warning: { icon: 'alert-circle', accent: colors.warning, gradient: [colors.navy, '#8A4B0B'], action: colors.primary },
  danger: { icon: 'warning', accent: colors.danger, gradient: [colors.navy, '#8E1F17'], action: colors.primary },
};

export function DialogHost() {
  const current = useDialogStore((s) => s.queue[0]);
  const shift = useDialogStore((s) => s.shift);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!current) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 90 }).start();
  }, [current, anim]);

  if (!current) return null;
  const tone = current.tone ?? (current.buttons.some((b) => b.style === 'destructive') ? 'danger' : 'info');
  const t = TONES[tone];
  const cancel = current.buttons.find((b) => b.style === 'cancel');
  const dismissible = !!cancel || current.buttons.length === 1;

  const pick = (b: DialogButton) => { shift(); b.onPress?.(); };
  const close = () => { if (dismissible) shift(); };

  // Cancelar a la izquierda cuando caben en una fila; en columna, la acción principal arriba y cancelar abajo.
  const stacked = current.buttons.length > 2 || current.buttons.some((b) => b.text.length > 13);
  const others = current.buttons.filter((b) => b !== cancel);
  const ordered = stacked ? [...others, ...(cancel ? [cancel] : [])] : [...(cancel ? [cancel] : []), ...others];
  // Con una acción destructiva (roja) el resto queda neutro; si no, la primera acción es la principal.
  const firstDefault = others.some((b) => b.style === 'destructive') ? undefined : others.find((b) => b.style !== 'destructive');

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Cerrar" accessibilityRole="button" />
        <Animated.View accessibilityViewIsModal
          style={[styles.card, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
          <LinearGradient colors={t.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
            <View style={styles.glowA} />
            <View style={styles.glowB} />
          </LinearGradient>
          <View style={[styles.badge, { borderColor: `${t.accent}33` }]}>
            <View style={[styles.badgeInner, { backgroundColor: `${t.accent}1A` }]}>
              <Ionicons name={current.icon ?? t.icon} size={32} color={t.accent} />
            </View>
          </View>
          <View style={styles.body}>
            <AppText variant="title" align="center" accessibilityRole="header">{current.title}</AppText>
            {!!current.message && <AppText variant="body" align="center">{current.message}</AppText>}
          </View>
          <View style={[styles.actions, stacked ? styles.actionsStacked : styles.actionsRow]}>
            {ordered.map((b, i) => {
              const kind = b.style === 'cancel' ? 'cancel' : b.style === 'destructive' ? 'destructive' : b === firstDefault ? 'primary' : 'secondary';
              const bg = kind === 'primary' ? t.action : kind === 'destructive' ? colors.danger : colors.surface;
              const fg = kind === 'primary' || kind === 'destructive' ? '#FFFFFF' : colors.textSecondary;
              return (
                <Pressable key={`${b.text}-${i}`} onPress={() => pick(b)} accessibilityRole="button" accessibilityLabel={b.text}
                  style={({ pressed }) => [styles.button, !stacked && styles.buttonRow, { backgroundColor: bg },
                    (kind === 'cancel' || kind === 'secondary') && styles.buttonOutline, pressed && styles.pressed]}>
                  <AppText style={[styles.buttonText, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{b.text}</AppText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,20,52,0.55)' },
  card: { width: '100%', maxWidth: 380, borderRadius: 28, backgroundColor: colors.surface, overflow: 'hidden', paddingBottom: space.xl, ...shadow.md },
  header: { height: 84, overflow: 'hidden' },
  glowA: { position: 'absolute', width: 150, height: 150, borderRadius: 75, right: -40, top: -70, backgroundColor: 'rgba(0,154,254,0.28)' },
  glowB: { position: 'absolute', width: 90, height: 90, borderRadius: 45, left: -26, bottom: -48, backgroundColor: 'rgba(255,255,255,0.10)' },
  badge: { alignSelf: 'center', marginTop: -40, width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  badgeInner: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  body: { gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl },
  actions: { paddingHorizontal: space.xl },
  actionsRow: { flexDirection: 'row', gap: space.md },
  actionsStacked: { gap: space.sm },
  button: { height: 50, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  buttonRow: { flex: 1 },
  buttonOutline: { borderWidth: 1, borderColor: colors.borderStrong },
  buttonText: { fontFamily: fonts.semibold, fontSize: 15 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
