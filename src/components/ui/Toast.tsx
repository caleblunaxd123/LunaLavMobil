import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, radius, shadow, space } from '../../theme';
import { AppText } from './Text';

type ToastTone = 'success' | 'error' | 'info';
interface ToastState { message: string | null; tone: ToastTone; id: number; show: (message: string, tone?: ToastTone) => void; hide: () => void }

/** Confirmaciones breves ("Pedido registrado") que no interrumpen el flujo. */
export const useToast = create<ToastState>((set) => ({
  message: null, tone: 'success', id: 0,
  show: (message, tone = 'success') => set((s) => ({ message, tone, id: s.id + 1 })),
  hide: () => set({ message: null }),
}));

export const toast = (message: string, tone?: ToastTone) => useToast.getState().show(message, tone);

export function ToastHost() {
  const { message, tone, id, hide } = useToast();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) return;
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    const timer = setTimeout(() => Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => hide()), 2800);
    return () => clearTimeout(timer);
  }, [message, id, anim, hide]);

  if (!message) return null;
  const icon = tone === 'success' ? 'checkmark-circle' : tone === 'error' ? 'alert-circle' : 'information-circle';
  const tint = tone === 'success' ? colors.teal : tone === 'error' ? '#FF8A80' : colors.sky;
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite"
      style={[styles.toast, { top: insets.top + space.sm, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
      <Ionicons name={icon} size={20} color={tint} />
      <AppText variant="captionStrong" color="#FFFFFF" style={styles.text}>{message}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.navy, ...shadow.md },
  text: { flex: 1 },
});
