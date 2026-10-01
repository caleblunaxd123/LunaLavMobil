import { api } from './http';
import { compartirArchivo, descargarArchivo, MIME } from '../documents/files';
import type { Ionicons } from '@expo/vector-icons';
import type { Rango } from '../utils/rangos';

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

export { RANGOS, parseFechaPeru, rangoDe, type Rango, type RangoPreset } from '../utils/rangos';

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
