import axios, { isAxiosError } from 'axios';
import type { LoginPayload, Session } from '../types/auth';
import { apiErrorMessage, SessionExpiredError } from './errors';

export const API_ORIGINS = {
  production: process.env.EXPO_PUBLIC_API_ORIGIN?.replace(/\/$/, '') || 'https://app.lunalav.pe',
  demo: process.env.EXPO_PUBLIC_DEMO_API_ORIGIN?.replace(/\/$/, '') || 'https://demo.lunalav.pe',
};

type LoginResponse = Omit<Session, 'apiOrigin' | 'isDemo'>;

const errorMessage = (error: unknown) => apiErrorMessage(error);

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

/**
 * Canjea el refresh token por una sesión nueva. La API rota el token en cada uso, por eso
 * la sesión devuelta reemplaza por completo a la anterior.
 */
export async function refreshRequest(session: Session): Promise<Session> {
  try {
    const { data } = await axios.post<LoginResponse>(`${session.apiOrigin}/api/auth/refresh`,
      { refreshToken: session.refreshToken }, { timeout: 15_000 });
    return { ...data, apiOrigin: session.apiOrigin, isDemo: session.isDemo };
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    if (status === 401 || status === 403) throw new SessionExpiredError(errorMessage(error));
    throw new Error(errorMessage(error));
  }
}

export async function selectSedeRequest(session: Session, sedeId: number): Promise<Session> {
  try {
    const { data } = await axios.post<LoginResponse>(`${session.apiOrigin}/api/auth/seleccionar-sede`,
      { sedeId, refreshToken: session.refreshToken },
      { timeout: 15_000, headers: { Authorization: `Bearer ${session.accessToken}` } });
    return { ...data, apiOrigin: session.apiOrigin, isDemo: session.isDemo };
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

/** El servidor todavía no publica el alta autónoma (endpoint inexistente). */
export class RegistrationUnavailableError extends Error {}

const endpointMissing = (error: unknown) =>
  isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 405);

export async function registerTrial(payload: TrialRegistrationPayload): Promise<TrialRegistrationResponse> {
  try {
    const { data } = await axios.post<TrialRegistrationResponse>(
      `${API_ORIGINS.production}/api/registro/prueba`, payload, { timeout: 25_000 },
    );
    return data;
  } catch (error) {
    if (endpointMissing(error)) throw new RegistrationUnavailableError('El alta automática no está disponible.');
    throw new Error(errorMessage(error));
  }
}

export type SlugCheck = { status: 'available' } | { status: 'taken'; message: string } | { status: 'unknown' };

/** Consulta si el código de empresa está libre. Si el servidor no lo soporta, no bloquea el registro. */
export async function checkSlug(slug: string): Promise<SlugCheck> {
  try {
    const { data } = await axios.get<{ disponible: boolean; mensaje?: string }>(
      `${API_ORIGINS.production}/api/registro/disponible`, { params: { slug }, timeout: 8_000 },
    );
    return data.disponible ? { status: 'available' } : { status: 'taken', message: data.mensaje ?? 'Ese código ya está en uso.' };
  } catch {
    return { status: 'unknown' };
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
