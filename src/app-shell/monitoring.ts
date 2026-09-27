import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useAuthStore } from '../store/authStore';

/**
 * Reporte de errores con Sentry. Solo se activa si hay DSN (EXPO_PUBLIC_SENTRY_DSN) y fuera de
 * desarrollo, así las pruebas locales no ensucian el panel.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
export const monitoringEnabled = !!DSN && !__DEV__;

export function initMonitoring() {
  if (!monitoringEnabled) return;
  Sentry.init({
    dsn: DSN,
    environment: Updates.channel || 'production',
    release: `lunalav-mobile@${Constants.expoConfig?.version ?? '0'}`,
    dist: Updates.updateId ?? undefined,
    // Datos de clientes (nombres, celulares, direcciones) no deben salir hacia Sentry.
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeBreadcrumb: (b) => (b.category === 'console' ? null : b),
  });
  // Solo identificadores internos, nunca nombre ni correo.
  const tag = () => {
    const u = useAuthStore.getState().session?.usuario;
    Sentry.setUser(u ? { id: String(u.id) } : null);
    Sentry.setTag('negocio', u ? String(u.negocioId) : 'sin-sesion');
    Sentry.setTag('rol', u?.rol ?? 'sin-sesion');
  };
  tag();
  useAuthStore.subscribe((s, prev) => { if (s.session !== prev.session) tag(); });
}

export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (__DEV__) console.warn(error);
  if (monitoringEnabled) Sentry.captureException(error, context ? { extra: context } : undefined);
}
