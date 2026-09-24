/** Margen para renovar el access token antes de que venza durante una petición. */
const EXPIRY_MARGIN_MS = 30_000;

export function isTokenExpiring(expira: string) {
  const time = Date.parse(expira);
  return Number.isFinite(time) && time - Date.now() < EXPIRY_MARGIN_MS;
}
