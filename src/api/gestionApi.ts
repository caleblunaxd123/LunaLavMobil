import { isAxiosError } from 'axios';
import { api } from './http';
import type { MovimientoCaja, PagedResult } from './operationsApi';

/** 404 significa "todavía no existe" (p. ej. cuadre sin guardar): se devuelve null en vez de error. */
async function orNull<T>(request: Promise<{ data: T }>) {
  try {
    return (await request).data;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

// ---------- Reportes ----------

export interface VistaGerencial {
  ventasHoy: number;
  cobradoHoy: number;
  ventasMes: number;
  ventasMesAnterior: number;
  ventasMesAnteriorAlDia: number;
  pedidosEntregadosHoy: number;
  pedidosEntregadosSemana: number;
  pedidosEntregadosMes: number;
  saldoPorCobrar: number;
  gastosMes: number;
  utilidadMes: number;
  pedidosActivos: number;
  pedidosPendientes: number;
  pedidosEnProceso: number;
  pedidosListosSinRecoger: number;
  comprobantesPendientes: number;
  comprobantesRechazados: number;
  insumosBajoStock: number;
  cajaEsperadaHoy: number;
  pedidosMesCount: number;
  ticketPromedioMes: number;
  ingresosEfectivoMes: number;
  ingresosDigitalMes: number;
  ingresosTarjetaMes: number;
  ventasUltimos14Dias: { fecha: string; total: number }[];
  topServiciosMes: { nombre: string; cantidad: number; total: number }[];
}

export interface ConsolidadoSede {
  sedeId: number;
  sedeNombre: string;
  ventasHoy: number;
  ventasMes: number;
  saldoPorCobrar: number;
  pedidosActivos: number;
  pedidosListos: number;
}

export async function getVistaGerencial() {
  const { data } = await api.get<VistaGerencial>('/api/reportes/vista-gerencial');
  return data;
}

export async function getConsolidado() {
  const { data } = await api.get<ConsolidadoSede[]>('/api/reportes/consolidado');
  return data;
}

// ---------- Cuadre de caja ----------

export interface CuadreCaja {
  id: number;
  fecha: string;
  usuarioId: number;
  usuarioNombre?: string;
  cajaInicial: number;
  pedidosPagadosEfect: number;
  gastos: number;
  totalContado: number;
  diferencia: number;
  cajaFinal: number;
  corte: number;
  ingresosDigital: number;
  ingresosTarjeta: number;
  nota?: string;
  fechaCreacion: string;
}

export interface UsuarioDelDia { id: number; nombreCompleto: string; rolNombre: string; movimientos: number; tieneCuadre: boolean }

export interface GuardarCuadrePayload {
  fecha: string;
  usuarioId: number;
  cajaInicial: number;
  totalContado: number;
  corte: number;
  nota?: string;
}

export async function getUsuariosDelDia(fecha: string) {
  const { data } = await api.get<UsuarioDelDia[]>('/api/caja/usuarios-dia', { params: { fecha } });
  return data;
}

export async function getMovimientosUsuario(fecha: string, usuarioId: number) {
  const { data } = await api.get<MovimientoCaja[]>('/api/caja/movimientos', { params: { fecha, usuarioId } });
  return data;
}

export const getCuadreDelUsuario = (fecha: string, usuarioId: number) =>
  orNull(api.get<CuadreCaja>('/api/caja/cuadres/del-usuario', { params: { fecha, usuarioId } }));

export const getUltimoCuadreAnterior = (fecha: string) =>
  orNull(api.get<CuadreCaja>('/api/caja/cuadres/ultimo-anterior', { params: { fecha } }));

export async function guardarCuadre(payload: GuardarCuadrePayload) {
  // Efectivo cobrado, gastos y cobros digitales los recalcula la API desde los movimientos.
  const { data } = await api.post<CuadreCaja>('/api/caja/cuadres', payload);
  return data;
}

// ---------- Facturación electrónica ----------

export interface Comprobante {
  id: number;
  pedidoId: number;
  pedidoNumero?: number;
  tipo: string;
  numeroCompleto: string;
  clienteNombre: string;
  clienteTipoDoc: string;
  clienteNumDoc?: string;
  opGravada: number;
  igv: number;
  total: number;
  estado: string;
  descripcionRespuestaSunat?: string;
  fechaEmision: string;
  esSimulado: boolean;
  estadoAnulacion?: string;
  detalles: { numeroLinea: number; descripcion: string; cantidad: number; total: number }[];
}

export interface KpiComprobantesMes {
  anio: number;
  mes: number;
  boletasCantidad: number;
  boletasMonto: number;
  facturasCantidad: number;
  facturasMonto: number;
}

export type FiltroComprobante = 'todos' | 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
export const COMPROBANTES_PAGE = 15;

export async function getComprobantes(estado: FiltroComprobante, busqueda: string, pagina: number) {
  const { data } = await api.get<PagedResult<Comprobante>>('/api/facturacion/comprobantes', {
    params: { pagina, tamanoPagina: COMPROBANTES_PAGE, estado: estado === 'todos' ? undefined : estado, busqueda: busqueda || undefined },
  });
  return data;
}

export async function getComprobante(id: number) {
  const { data } = await api.get<Comprobante>(`/api/facturacion/comprobantes/${id}`);
  return data;
}

export async function getKpiComprobantes() {
  const { data } = await api.get<KpiComprobantesMes[]>('/api/facturacion/kpi', { params: { meses: 1 } });
  return data;
}

export async function sincronizarComprobante(id: number) {
  const { data } = await api.post<Comprobante>(`/api/facturacion/comprobantes/${id}/sincronizar`);
  return data;
}

// ---------- Promociones ----------

export interface Promocion {
  id: number;
  tipo: string;
  descripcion: string;
  descuentoPct?: number | null;
  descuentoMonto?: number | null;
  servicioId?: number | null;
  servicioNombre?: string | null;
  cantidadMinima: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  activa: boolean;
  codigo?: string | null;
  clienteNombre?: string | null;
  origen?: string | null;
  maxUsos?: number | null;
  usos: number;
}

export async function getPromociones() {
  const { data } = await api.get<Promocion[]>('/api/promociones');
  return data;
}

export async function cambiarEstadoPromocion(id: number, activa: boolean) {
  await api.patch(`/api/promociones/${id}/estado`, { activa });
}

/** Lo que el servidor guarda de una promoción (las fechas viajan como yyyy-MM-dd). */
export interface PromocionPayload {
  tipo: 'VOLUMEN' | 'FRECUENCIA' | 'FIJA' | 'CODIGO';
  descripcion: string;
  descuentoPct: number | null;
  descuentoMonto: number | null;
  servicioId: number | null;
  cantidadMinima: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  activa: boolean;
  codigo: string | null;
  maxUsos: number | null;
}

export async function crearPromocion(p: PromocionPayload) {
  const { data } = await api.post<Promocion>('/api/promociones', p);
  return data;
}

export async function actualizarPromocion(id: number, p: PromocionPayload) {
  await api.put(`/api/promociones/${id}`, { id, ...p });
}

export async function eliminarPromocion(id: number) {
  await api.delete(`/api/promociones/${id}`);
}

// ---------- Configuración: servicios y usuarios ----------

export interface ServicioEditable {
  id: number;
  nombre: string;
  precio: number;
  costo: number;
  unidad: string;
  categoriaId?: number | null;
  categoriaNombre?: string | null;
  activo: boolean;
  enUso: boolean;
}

export async function getServiciosAdmin() {
  const { data } = await api.get<ServicioEditable[]>('/api/servicios-admin');
  return data;
}

export async function actualizarServicio(servicio: ServicioEditable) {
  await api.put(`/api/servicios-admin/${servicio.id}`, servicio);
}

export interface UsuarioAdmin {
  id: number;
  usuario: string;
  nombreCompleto: string;
  email?: string | null;
  rolId: number;
  rolNombre?: string | null;
  sedeNombre?: string | null;
  activo: boolean;
}

export async function getUsuariosAdmin() {
  const { data } = await api.get<UsuarioAdmin[]>('/api/usuarios');
  return data;
}

export async function cambiarEstadoUsuario(id: number, activo: boolean) {
  await api.patch(`/api/usuarios/${id}/estado`, { activo });
}

export type ServicioNuevo = Omit<ServicioEditable, 'id' | 'enUso' | 'categoriaNombre'>;

export async function crearServicioAdmin(servicio: ServicioNuevo) {
  const { data } = await api.post<ServicioEditable>('/api/servicios-admin', { ...servicio, id: 0 });
  return data;
}

/** Elimina el servicio si nunca se usó; si ya está en pedidos, el backend lo desactiva. */
export async function eliminarServicio(id: number) {
  const { data } = await api.delete<{ mensaje: string; eliminado: boolean }>(`/api/servicios-admin/${id}`);
  return data;
}

export interface Categoria { id: number; nombre: string; activa: boolean; enUso: boolean }

export async function getCategorias() {
  const { data } = await api.get<Categoria[]>('/api/categorias');
  return data;
}

export async function crearCategoria(nombre: string) {
  const { data } = await api.post<Categoria>('/api/categorias', { id: 0, nombre, activa: true });
  return data;
}

// ---------- Motorizados (administración) ----------

export interface MotorizadoAdmin { id: number; nombre: string; celular?: string | null; activo: boolean }

export async function getMotorizadosTodos() {
  const { data } = await api.get<MotorizadoAdmin[]>('/api/motorizados/todos');
  return data;
}

export async function guardarMotorizado(m: MotorizadoAdmin) {
  const body = { ...m, celular: m.celular?.trim() || null };
  if (m.id) { await api.put(`/api/motorizados/${m.id}`, body); return; }
  await api.post('/api/motorizados', body);
}

export async function cambiarEstadoMotorizado(id: number, activo: boolean) {
  await api.patch(`/api/motorizados/${id}/estado`, { activo });
}

// ---------- Datos del negocio ----------

/** La configuración completa: el PUT reemplaza todos los campos, así que se envía lo leído con los cambios. */
export type ConfiguracionCompleta = Record<string, unknown> & {
  nombreNegocio: string;
  direccion?: string | null;
  telefono?: string | null;
  horarioAtencion?: string | null;
  costoDelivery: number;
  valorPuntoCanje: number;
  maxDescuentoPct: number;
  solesPorPunto: number;
  yapeNumero?: string | null;
  yapeTitular?: string | null;
};

export async function getConfiguracionCompleta() {
  const { data } = await api.get<ConfiguracionCompleta>('/api/configuracion');
  return data;
}

export async function guardarConfiguracion(cfg: ConfiguracionCompleta) {
  await api.put('/api/configuracion', cfg);
}
