import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Almacenamiento de la sesión. En Android/iOS usa el llavero cifrado del sistema (SecureStore);
 * en web, donde SecureStore no existe, recurre a localStorage.
 */
const web = Platform.OS === 'web';

export const storage = {
  async get(key: string) {
    if (web) return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (web) { globalThis.localStorage?.setItem(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (web) { globalThis.localStorage?.removeItem(key); return; }
    await SecureStore.deleteItemAsync(key);
  },
};
