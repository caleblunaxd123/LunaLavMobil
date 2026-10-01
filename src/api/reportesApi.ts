import { api } from './http';
import { compartirArchivo, descargarArchivo, MIME } from '../documents/files';
import { isoDate } from '../utils/format';
import type { Ionicons } from '@expo/vector-icons';

/*
 * Reportes detallados: los mismos que LunaLav web (GET /api/reportes/{clave}), con su exportación
 * a Excel real (.xlsx) generada por el servidor.
 */

export type ReporteClave =
  | 'ordenes-pendientes' | 'gastos' | 'general' | 'servicios' | 'cuadres-caja' | 'ordenes-mensual'
  | 'almacen' | 'anulados' | 'registro-entregas' | 'pagos' | 'descuento-directo';

export interface ReporteMeta {
  clave: ReporteClave;
  titulo: string;
  descripcion: string;
  /** Los reportes "de ahora mismo" (pendientes, almacén) no dependen de un rango de fechas. */
  usaRango: boolean;
  icono: keyof typeof Ionicons.glyphMap;
}

export const REPORTES: ReporteMeta[] = [
  { clave: 'general', titulo: 'General', descripcion: 'Ingresos, gastos y utilidad neta por día.', usaRango: true, icono: 'stats-chart-outline' },
  { clave: 'pagos', titulo: 'Pagos', descripcion: 'Todos los pagos recibidos, método y responsable.', usaRango: true, icono: 'cash-outline' },
  { clave: 'servicios', titulo: 'Servicios', descripcion: 'Qué servicios venden más y cuánto generan.', usaRango: true, icono: 'shirt-outline' },
  { clave: 'gastos', titulo: 'Gastos', descripcion: 'Gastos agrupados por tipo en el rango de fechas.', usaRango: true, icono: 'receipt-outline' },
  { clave: 'ordenes-pendientes', titulo: 'Órdenes pendientes', descripcion: 'Pedidos en proceso ahora mismo, con los días que llevan sin terminar.', usaRango: false, icono: 'time-outline' },
  { clave: 'almacen', titulo: 'Almacén', descripcion: 'Pedidos listos sin recoger, con días en custodia.', usaRango: false, icono: 'cube-outline' },
  { clave: 'ordenes-mensual', titulo: 'Órdenes mensual', descripcion: 'Pedidos, montos facturados y pagados por mes.', usaRango: true, icono: 'calendar-outline' },
  { clave: 'cuadres-caja', titulo: 'Cuadres de caja', descripcion: 'Historial de cuadres diarios guardados.', usaRango: true, icono: 'calculator-outline' },
  { clave: 'registro-entregas', titulo: 'Registro y entregas', descripcion: 'Quién registró y quién entregó cada pedido.', usaRango: true, icono: 'bag-check-outline' },
  { clave: 'anulados', titulo: 'Anulados', descripcion: 'Pedidos anulados, responsable y motivo.', usaRango: true, icono: 'close-circle-outline' },
  { clave: 'descuento-directo', titulo: 'Descuento directo', descripcion: 'Pedidos con descuento aplicado y quién lo hizo.', usaRango: true, icono: 'pricetag-outline' },
];

export const reporteMeta = (clave: ReporteClave) => REPORTES.find((r) => r.clave === clave) ?? REPORTES[0];

export interface ReporteResultado {
  columnas: string[];
  filas: Record<string, string>[];
  accion?: string | null;
}

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

export async function getReporte(clave: ReporteClave, rango?: Rango) {
  const { data } = await api.get<ReporteResultado>(`/api/reportes/${clave}`, { params: rango });
  return data;
}

/** Descarga el .xlsx del reporte y abre el menú de compartir (Excel, WhatsApp, correo, Drive…). */
export async function exportarReporteExcel(clave: ReporteClave, rango: Rango) {
  const meta = reporteMeta(clave);
  const { uri, nombre } = await descargarArchivo(`/api/reportes/export/${clave}`, `reporte-${clave}-${rango.desde}-${rango.hasta}.xlsx`, rango);
  await compartirArchivo(uri, MIME.xlsx, `${meta.titulo} (${rango.desde} a ${rango.hasta})`);
  return nombre;
}
