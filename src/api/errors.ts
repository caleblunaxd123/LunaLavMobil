import { isAxiosError } from 'axios';

/** Extrae el mensaje que devuelve la API de LunaLav (`{ mensaje }`) o uno legible por defecto. */
export function apiErrorMessage(error: unknown, fallback = 'Ocurrió un problema inesperado. Inténtalo nuevamente.') {
  if (isAxiosError(error)) {
    const data = error.response?.data as { mensaje?: unknown; title?: unknown; errors?: Record<string, string[]> } | undefined;
    if (typeof data?.mensaje === 'string') return data.mensaje;
    const firstValidation = data?.errors && Object.values(data.errors).flat()[0];
    if (typeof firstValidation === 'string') return firstValidation;
    if (!error.response) return 'No pudimos conectar con LunaLav. Revisa tu conexión.';
    if (error.response.status === 403) return 'Tu usuario no tiene permiso para realizar esta acción.';
    if (error.response.status === 404) return 'El registro ya no existe o pertenece a otra sede.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** La API rechazó el refresh token: la sesión ya no puede renovarse y hay que volver a ingresar. */
export class SessionExpiredError extends Error {}
