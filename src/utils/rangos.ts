import { isoDate } from './format';

export type RangoPreset = 'hoy' | 'ayer' | '7d' | '30d' | 'mes' | 'mesPasado' | '90d' | 'anio' | 'personalizado';

export const RANGOS: { value: RangoPreset; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'ayer', label: 'Ayer' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'mesPasado', label: 'Mes pasado' },
  { value: '90d', label: '90 días' },
  { value: 'anio', label: 'Este año' },
  { value: 'personalizado', label: 'Personalizado' },
];

export interface Rango { desde: string; hasta: string }

const dayOffset = (base: Date, days: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);

/** Rango de fechas (yyyy-MM-dd, inclusivo) de cada atajo, calculado con la fecha local del teléfono. */
export function rangoDe(preset: Exclude<RangoPreset, 'personalizado'>, hoy = new Date()): Rango {
  const t = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  switch (preset) {
    case 'hoy': return { desde: isoDate(t), hasta: isoDate(t) };
    case 'ayer': { const y = dayOffset(t, -1); return { desde: isoDate(y), hasta: isoDate(y) }; }
    case '7d': return { desde: isoDate(dayOffset(t, -6)), hasta: isoDate(t) };
    case '30d': return { desde: isoDate(dayOffset(t, -29)), hasta: isoDate(t) };
    case '90d': return { desde: isoDate(dayOffset(t, -89)), hasta: isoDate(t) };
    case 'mes': return { desde: isoDate(new Date(t.getFullYear(), t.getMonth(), 1)), hasta: isoDate(t) };
    case 'mesPasado': return { desde: isoDate(new Date(t.getFullYear(), t.getMonth() - 1, 1)), hasta: isoDate(new Date(t.getFullYear(), t.getMonth(), 0)) };
    case 'anio': return { desde: isoDate(new Date(t.getFullYear(), 0, 1)), hasta: isoDate(t) };
  }
}

/** "25/12/2026" → "2026-12-25"; null si no es una fecha real. */
export function parseFechaPeru(texto: string) {
  const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return isoDate(date);
}
