import axios, { AxiosHeaders, CanceledError, isAxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { isTokenExpiring } from './session';

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

const bearer = (token: string) => `Bearer ${token}`;

/**
 * Cliente HTTP autenticado. Toma siempre la sesión vigente del store (origen y token),
 * renueva el access token antes de que expire y reintenta una vez si la API responde 401.
 */
export const api = axios.create({ timeout: 15_000 });

api.interceptors.request.use(async (config) => {
  const store = useAuthStore.getState();
  let session = store.session;
  if (session && isTokenExpiring(session.expira)) session = (await store.refresh()) ?? useAuthStore.getState().session;
  if (!session) throw new CanceledError('Sesión cerrada.');
  config.baseURL = session.apiOrigin;
  config.headers = AxiosHeaders.from(config.headers);
  config.headers.set('Authorization', bearer(session.accessToken));
  return config;
});

api.interceptors.response.use(undefined, async (error) => {
  const config = error?.config as RetriableConfig | undefined;
  if (!isAxiosError(error) || error.response?.status !== 401 || !config || config._retried) throw error;
  config._retried = true;
  // Si otra petición ya renovó la sesión mientras esta viajaba, basta con reintentar:
  // volver a renovar gastaría (y rotaría) el refresh token sin necesidad.
  const current = useAuthStore.getState().session;
  const sentWith = AxiosHeaders.from(config.headers).get('Authorization');
  const renewed = current && sentWith !== bearer(current.accessToken) ? current : await useAuthStore.getState().refresh();
  if (!renewed) throw error;
  return api(config);
});
