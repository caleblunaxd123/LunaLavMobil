import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

const isOnline = (s: Network.NetworkState) => s.isConnected !== false && s.isInternetReachable !== false;

/**
 * Conecta React Query con el estado de red y el ciclo de vida de la app:
 * sin conexión las consultas esperan y se reintentan solas al volver; al regresar a la app se refrescan.
 */
export function setupNetworkSync() {
  onlineManager.setEventListener((setOnline) => {
    void Network.getNetworkStateAsync().then((s) => setOnline(isOnline(s))).catch(() => undefined);
    const sub = Network.addNetworkStateListener((s) => setOnline(isOnline(s)));
    return () => sub.remove();
  });
  if (Platform.OS !== 'web') {
    focusManager.setEventListener((setFocused) => {
      const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
      return () => sub.remove();
    });
  }
}

export function useIsOnline() {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
