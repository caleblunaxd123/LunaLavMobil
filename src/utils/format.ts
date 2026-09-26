import type { Tone } from '../components/ui/Badge';

export const money = (value: number | undefined | null) => `S/ ${(value ?? 0).toFixed(2)}`;

/** "1 cliente" / "3 clientes": evita el "1 clientes" en contadores. */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Match the C# API's commercial rounding to the nearest S/ 0.10. */
export function roundMoney(value: number) {
  // Match PedidoCalculos.RedondearA10Centimos in the C# API so the preview
  // agrees with the amount persisted by the server.
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

/** Public signup stores trial expiry as UTC calendar date + 14 days. */
export function trialEndsOnUtc(startedAt = new Date(), trialDays = 14) {
  const date = new Date(Date.UTC(
    startedAt.getUTCFullYear(), startedAt.getUTCMonth(), startedAt.getUTCDate() + trialDays,
  ));
  return date.toISOString().slice(0, 10);
}

/**
 * ISO dates without a time represent a local calendar day, not midnight UTC.
 * La API guarda y devuelve fechas con hora en hora local de Perú y SIN zona
 * ("2026-09-27T18:00:00"); Hermes las leería como UTC y correría todo 5 horas.
 * Sin zona explícita se interpretan como hora local del dispositivo.
 */
export function parseDate(value: string) {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
  const local = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?$/.exec(value);
  if (local) {
    const ms = local[7] ? Number(local[7].slice(0, 3).padEnd(3, '0')) : 0;
    return new Date(Number(local[1]), Number(local[2]) - 1, Number(local[3]),
      Number(local[4]), Number(local[5]), Number(local[6] ?? 0), ms);
  }
  return new Date(value);
}

export const relativeDay = (value?: string | null) => {
  if (!value) return '—';
  const date = parseDate(value);
  if (!Number.isFinite(date.getTime())) return '—';
  const today = new Date();
  const diff = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
};

/** La fecha ya pasó (antes de hoy): sirve para marcar entregas atrasadas. */
export function isPastDay(value?: string | null) {
  if (!value) return false;
  const d = parseDate(value);
  if (!Number.isFinite(d.getTime())) return false;
  const t = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()) < new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

export const shortDate = (value?: string | null) => {
  if (!value) return '—';
  const date = parseDate(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '—';
};

export const longDate = (value?: string | null) => {
  if (!value) return '—';
  const date = parseDate(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
};

export const shortDateWithYear = (value?: string | null) => {
  if (!value) return '—';
  const date = parseDate(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
};

export const dateTime = (value?: string | null) =>
  value ? parseDate(value).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const time = (value: string) =>
  parseDate(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

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
  PENDIENTE: 'Recibido', EN_PROCESO: 'En proceso', LISTO: 'Listo para entregar', ENTREGA_PARCIAL: 'Entrega parcial',
  ENTREGADO: 'Entregado', DONADO: 'Donado', ANULADO: 'Anulado',
};
const processTones: Record<string, Tone> = {
  PENDIENTE: 'warning', EN_PROCESO: 'primary', LISTO: 'success', ENTREGA_PARCIAL: 'teal',
  ENTREGADO: 'neutral', DONADO: 'violet', ANULADO: 'danger',
};
const paymentLabels: Record<string, string> = { PENDIENTE: 'Por cobrar', PARCIAL: 'Pago parcial', PAGADO: 'Pagado' };
const paymentTones: Record<string, Tone> = { PENDIENTE: 'danger', PARCIAL: 'warning', PAGADO: 'success' };

export const processLabel = (estado: string) => processLabels[estado] ?? estado;
export const processTone = (estado: string): Tone => processTones[estado] ?? 'neutral';
export const paymentLabel = (estado: string) => paymentLabels[estado] ?? estado;
export const paymentTone = (estado: string): Tone => paymentTones[estado] ?? 'neutral';

/** Etapas visibles del pedido, en el orden en que avanza. */
export const PROCESS_STEPS = [
  { estado: 'PENDIENTE', label: 'Recibido' },
  { estado: 'EN_PROCESO', label: 'En proceso' },
  { estado: 'LISTO', label: 'Listo' },
  { estado: 'ENTREGADO', label: 'Entregado' },
];

const plurals: Record<string, string> = { unidad: 'unidades', par: 'pares', docena: 'docenas', prenda: 'prendas', juego: 'juegos', metro: 'metros' };

/** "4 unidades", "1 par", "2.5 kg": cantidad con su unidad en singular o plural. */
export function quantityLabel(cantidad: number, unidad?: string | null) {
  const u = (unidad ?? '').toLowerCase();
  const n = Number.isInteger(cantidad) ? String(cantidad) : cantidad.toFixed(2).replace(/0$/, '');
  return `${n} ${cantidad === 1 ? u : plurals[u] ?? u}`.trim();
}

export const methodLabel = (metodo: string) =>
  ({ EFECTIVO: 'Efectivo', YAPE: 'Yape', PLIN: 'Plin', TRANSFERENCIA: 'Transferencia', POS: 'Tarjeta (POS)', TARJETA: 'Tarjeta' } as Record<string, string>)[metodo] ?? metodo;

/** Enlace de WhatsApp; los celulares peruanos de 9 dígitos se completan con el código 51. */
export function whatsappUrl(celular: string) {
  const digits = celular.replace(/\D/g, '');
  return `https://wa.me/${/^9\d{8}$/.test(digits) ? `51${digits}` : digits}`;
}
