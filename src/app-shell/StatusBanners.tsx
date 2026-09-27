import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, toast } from '../components/ui';
import { colors, radius, space } from '../theme';
import { reportError } from './monitoring';
import { useIsOnline } from './network';

/** Avisos globales que flotan sobre cualquier pantalla: sin conexión y nueva versión lista. */
export function StatusBanners() {
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  const update = useOtaUpdate();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) { wasOffline.current = false; toast('Conexión restablecida'); }
  }, [online]);

  if (online && !update.ready) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }]}>
      {!online ? (
        <View style={[styles.pill, styles.offline]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
          <AppText variant="captionStrong" color="#FFFFFF">Sin conexión · no se pueden registrar cambios</AppText>
        </View>
      ) : (
        <Pressable onPress={update.apply} accessibilityRole="button" style={[styles.pill, styles.update]}>
          <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
          <AppText variant="captionStrong" color="#FFFFFF">Nueva versión lista · tocar para actualizar</AppText>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Actualizaciones por EAS Update: al volver a la app busca una versión nueva y la descarga en segundo
 * plano; se aplica cuando el usuario toca el aviso (o sola en el siguiente arranque).
 */
function useOtaUpdate() {
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!Updates.isEnabled || __DEV__) return;
    let last = 0;
    const check = async () => {
      if (Date.now() - last < 15 * 60_000) return;
      last = Date.now();
      try {
        const r = await Updates.checkForUpdateAsync();
        if (r.isAvailable) await Updates.fetchUpdateAsync();
      } catch (e) {
        reportError(e, { en: 'checkForUpdate' });
      }
    };
    void check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void check(); });
    return () => sub.remove();
  }, []);
  return {
    ready: isUpdatePending && !dismissed,
    apply: () => { setDismissed(true); void Updates.reloadAsync().catch((e) => reportError(e)); },
  };
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 7, borderRadius: radius.pill,
    maxWidth: '92%',
  },
  offline: { backgroundColor: colors.text },
  update: { backgroundColor: colors.primary },
});
