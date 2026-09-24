import axios from 'axios';
import type { LoginPayload, Session } from '../types/auth';

export const API_ORIGINS = {
  production: process.env.EXPO_PUBLIC_API_ORIGIN?.replace(/\/$/, '') || 'https://app.lunalav.pe',
  demo: process.env.EXPO_PUBLIC_DEMO_API_ORIGIN?.replace(/\/$/, '') || 'https://demo.lunalav.pe',
};

type LoginResponse = Omit<Session, 'apiOrigin' | 'isDemo'>;

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.mensaje;
    if (typeof message === 'string') return message;
    if (!error.response) return 'No pudimos conectar con LunaLav. Revisa tu conexión.';
  }
  return 'Ocurrió un problema inesperado. Inténtalo nuevamente.';
}

export async function loginRequest(payload: LoginPayload): Promise<Session> {
  try {
    const { data } = await axios.post<LoginResponse>(`${API_ORIGINS.production}/api/auth/login`, payload, {
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
    });
    return { ...data, apiOrigin: API_ORIGINS.production, isDemo: false };
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}

export async function demoRequest(): Promise<Session> {
  try {
    const { data } = await axios.post<LoginResponse>(`${API_ORIGINS.demo}/api/auth/demo-acceso`, {}, { timeout: 15_000 });
    return { ...data, apiOrigin: API_ORIGINS.demo, isDemo: true };
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}

export async function logoutRequest(session: Session) {
  if (!session.refreshToken) return;
  await axios.post(`${session.apiOrigin}/api/auth/logout`, { refreshToken: session.refreshToken }, {
    timeout: 8_000,
    headers: { Authorization: `Bearer ${session.accessToken}` },
  }).catch(() => undefined);
}

export interface TrialLeadPayload {
  nombre: string;
  negocio: string;
  celular: string;
  email?: string;
  planInteres: 'BASICO' | 'FACTURA' | 'MULTISEDE';
  consentimiento: boolean;
}

export interface TrialRegistrationPayload {
  nombreNegocio: string;
  slug: string;
  nombreResponsable: string;
  email: string;
  celular: string;
  usuario: string;
  password: string;
  plan: TrialLeadPayload['planInteres'];
  sedeNombre: string;
  aceptaTerminos: boolean;
}

export interface TrialRegistrationResponse {
  negocioId: number;
  slug: string;
  pruebaHasta: string;
  diasPrueba: number;
}

export async function registerTrial(payload: TrialRegistrationPayload): Promise<TrialRegistrationResponse> {
  try {
    const { data } = await axios.post<TrialRegistrationResponse>(
      `${API_ORIGINS.production}/api/registro/prueba`, payload, { timeout: 25_000 },
    );
    return data;
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}

export async function requestTrial(payload: TrialLeadPayload): Promise<string> {
  try {
    const { data } = await axios.post<{ mensaje: string }>(
      `${API_ORIGINS.demo}/api/interesados-demo`, payload, { timeout: 15_000 },
    );
    return data.mensaje;
  } catch (error) {
    throw new Error(errorMessage(error));
  }
}
