import { colors } from '../theme/colors';

export const money = (value: number | undefined | null) => `S/ ${(value ?? 0).toFixed(2)}`;

export const shortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '—';

export const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const time = (value: string) =>
  new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

/** Fecha local en formato ISO (yyyy-MM-dd), la que espera la API para filtrar por día. */
export function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Convierte un texto con coma o punto decimal en número; devuelve NaN si no es válido. */
export function parseAmount(text: string) {
  const normalized = text.replace(',', '.').trim();
  return /^\d+(\.\d{0,2})?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

const processLabels: Record<string, string> = {
  PENDIENTE: 'Pendiente', EN_PROCESO: 'En proceso', LISTO: 'Listo', ENTREGA_PARCIAL: 'Entrega parcial',
  ENTREGADO: 'Entregado', DONADO: 'Donado', ANULADO: 'Anulado',
};
const processColors: Record<string, string> = {
  PENDIENTE: colors.warning, EN_PROCESO: colors.primary, LISTO: colors.success, ENTREGA_PARCIAL: colors.mint,
  ENTREGADO: colors.muted, DONADO: colors.violet, ANULADO: colors.danger,
};
const paymentLabels: Record<string, string> = { PENDIENTE: 'Por cobrar', PARCIAL: 'Pago parcial', PAGADO: 'Pagado' };
const paymentColors: Record<string, string> = { PENDIENTE: colors.danger, PARCIAL: colors.warning, PAGADO: colors.success };

export const processLabel = (estado: string) => processLabels[estado] ?? estado;
export const processColor = (estado: string) => processColors[estado] ?? colors.muted;
export const paymentLabel = (estado: string) => paymentLabels[estado] ?? estado;
export const paymentColor = (estado: string) => paymentColors[estado] ?? colors.muted;

export const methodLabel = (metodo: string) =>
  ({ EFECTIVO: 'Efectivo', YAPE: 'Yape', PLIN: 'Plin', TRANSFERENCIA: 'Transferencia', POS: 'Tarjeta (POS)', TARJETA: 'Tarjeta' } as Record<string, string>)[metodo] ?? metodo;

/** Enlace de WhatsApp; los celulares peruanos de 9 dígitos se completan con el código 51. */
export function whatsappUrl(celular: string) {
  const digits = celular.replace(/\D/g, '');
  return `https://wa.me/${/^9\d{8}$/.test(digits) ? `51${digits}` : digits}`;
}
