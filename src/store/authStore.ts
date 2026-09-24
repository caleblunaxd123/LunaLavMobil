import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { demoRequest, loginRequest, logoutRequest, refreshRequest, selectSedeRequest } from '../api/authApi';
import { SessionExpiredError } from '../api/errors';
import { queryClient } from '../api/queryClient';
import { isTokenExpiring } from '../api/session';
import type { LoginPayload, Session } from '../types/auth';

const SESSION_KEY = 'lunalav.mobile.session.v1';

interface AuthState {
  session: Session | null;
  hydrated: boolean;
  busy: boolean;
  error: string | null;
  restore: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<boolean>;
  enterDemo: () => Promise<boolean>;
  refresh: () => Promise<Session | null>;
  selectSede: (sedeId: number) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

async function save(session: Session | null) {
  if (session) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}

// Una sola renovación a la vez: la API invalida el refresh token al usarlo, así que dos
// peticiones concurrentes que renueven por separado cerrarían la sesión.
let refreshing: Promise<Session | null> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  hydrated: false,
  busy: false,
  error: null,
  restore: async () => {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      set({ session: raw ? JSON.parse(raw) as Session : null, hydrated: true });
    } catch {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      set({ session: null, hydrated: true });
    }
  },
  login: async (payload) => {
    set({ busy: true, error: null });
    try {
      const session = await loginRequest(payload);
      await save(session);
      set({ session, busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : 'No se pudo iniciar sesión.' });
      return false;
    }
  },
  enterDemo: async () => {
    set({ busy: true, error: null });
    try {
      const session = await demoRequest();
      await save(session);
      set({ session, busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : 'No se pudo abrir la demo.' });
      return false;
    }
  },
  refresh: () => {
    refreshing ??= (async () => {
      const current = get().session;
      if (!current) return null;
      try {
        const next = await refreshRequest(current);
        await save(next);
        set({ session: next });
        return next;
      } catch (error) {
        if (error instanceof SessionExpiredError) {
          await save(null);
          queryClient.clear();
          set({ session: null, error: error.message });
        }
        return null;
      }
    })().finally(() => { refreshing = null; });
    return refreshing;
  },
  selectSede: async (sedeId) => {
    let current = get().session;
    if (current && isTokenExpiring(current.expira)) current = (await get().refresh()) ?? get().session;
    if (!current) return false;
    set({ busy: true, error: null });
    try {
      const session = await selectSedeRequest(current, sedeId);
      await save(session);
      queryClient.clear();
      set({ session, busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error: error instanceof Error ? error.message : 'No se pudo seleccionar la sede.' });
      return false;
    }
  },
  logout: async () => {
    const session = get().session;
    set({ session: null, error: null });
    queryClient.clear();
    await save(null);
    if (session) await logoutRequest(session);
  },
  clearError: () => set({ error: null }),
}));
