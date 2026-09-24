import { api } from './http';

export interface DashboardData {
  ordenesHoy: number;
  ventasDelDia: number;
  totalPendientes: number;
  totalListos: number;
  totalClientes: number;
  ordenesRecientes: {
    numero: number;
    clienteNombre: string;
    servicioPrincipal: string;
    estadoProceso: string;
    total: number;
  }[];
}

export interface PedidoItem {
  id: number;
  servicioId: number;
  servicioNombre?: string;
  servicioUnidad?: string;
  cantidad: number;
  precioUnit: number;
  total: number;
  descripcion?: string;
  cantidadEntregada: number;
}

export interface Pedido {
  id: number;
  numero: number;
  clienteId: number;
  clienteNombre?: string;
  clienteCelular?: string;
  usuarioNombre?: string;
  fechaIngreso: string;
  fechaEntregaEst?: string;
  modalidad: string;
  direccionEntrega?: string;
  subtotal: number;
  descuento: number;
  esUrgente: boolean;
  recargoUrgente: number;
  redondeo: number;
  total: number;
  montoPagado: number;
  estadoPago: string;
  estadoProceso: string;
  areaActualNombre?: string;
  observaciones?: string;
  anulado: boolean;
  motivoAnulacion?: string;
  items: PedidoItem[];
}

export interface PagoPedido {
  id: number;
  fecha: string;
  metodoPago: string;
  monto: number;
  descripcion?: string;
  usuarioNombre?: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  celular?: string | null;
  dni?: string | null;
  documentoFiscal?: string | null;
  direccion?: string | null;
  puntos: number;
  fechaCreacion?: string;
  fechaNacimiento?: string | null;
}

export type ClienteInput = Pick<Cliente, 'nombre' | 'celular' | 'dni' | 'documentoFiscal' | 'direccion'> & {
  puntos?: number;
  fechaNacimiento?: string | null;
};

export interface MovimientoCaja {
  id: number;
  fecha: string;
  tipo: string;
  metodoPago: string;
  monto: number;
  descripcion?: string;
  pedidoId?: number;
  pedidoNumero?: number;
  clienteNombre?: string;
  usuarioNombre?: string;
  tipoGastoNombre?: string;
}

export interface Servicio { id: number; nombre: string; precio: number; unidad: string; categoriaId: number | null }
export interface TipoGasto { id: number; nombre: string }
export interface Sede { id: number; nombre: string; direccion?: string; activo: boolean }

export type MetodoPago = 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'POS';
export const METODOS_PAGO: MetodoPago[] = ['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'POS'];

export type Modalidad = 'Tienda' | 'Recojo';
export type FiltroPedidos = 'pendientes' | 'listos' | 'entregados' | 'ultimos';

export interface PagedResult<T> { items: T[]; total: number; pagina: number; tamanoPagina: number }

export interface CrearPedidoPayload {
  clienteId?: number;
  clienteNuevo?: ClienteInput;
  modalidad: Modalidad;
  items: { servicioId: number; cantidad: number; precioUnit: number; descripcion?: string }[];
  descuentoPct: number;
  esUrgente: boolean;
  montoPagado: number;
  metodoPagoInicial: MetodoPago;
  fechaEntregaEst?: string;
  observaciones?: string;
}

export interface RegistrarGastoPayload {
  monto: number;
  metodoPago: MetodoPago;
  tipoGastoId?: number;
  descripcion?: string;
}

export async function getDashboard() {
  const { data } = await api.get<DashboardData>('/api/pedidos/dashboard');
  return data;
}

// ---------- Pedidos ----------

export async function getPedidos(filtro: FiltroPedidos, busqueda = '') {
  const { data } = await api.get<PagedResult<Pedido>>('/api/pedidos', {
    params: { filtro, busqueda: busqueda.trim() || undefined, pagina: 1, tamanoPagina: 50 },
  });
  return data;
}

export async function getPedido(id: number) {
  const { data } = await api.get<Pedido>(`/api/pedidos/${id}`);
  return data;
}

export async function getPagosPedido(id: number) {
  const { data } = await api.get<PagoPedido[]>(`/api/pedidos/${id}/pagos`);
  return data;
}

export async function crearPedido(payload: CrearPedidoPayload) {
  const { data } = await api.post<Pedido>('/api/pedidos', payload);
  return data;
}

/** Mueve el pedido al siguiente paso del flujo de áreas (o lo entrega si ya está listo). */
export async function avanzarPedido(id: number, recibidoPor?: string) {
  await api.post(`/api/pedidos/${id}/siguiente-area`, { recibidoPor: recibidoPor?.trim() || undefined });
}

export async function registrarPago(id: number, monto: number, metodo: MetodoPago, descripcion?: string) {
  await api.post(`/api/pedidos/${id}/pagos`, { monto, metodo, descripcion: descripcion?.trim() || undefined });
}

export async function getServicios() {
  const { data } = await api.get<Servicio[]>('/api/servicios');
  return data;
}

// ---------- Clientes ----------

export async function getClientes(texto = '') {
  const { data } = await api.get<Cliente[]>('/api/clientes', {
    params: { texto: texto.trim() || undefined, limite: 60 },
  });
  return data;
}

export async function getCliente(id: number) {
  const { data } = await api.get<Cliente>(`/api/clientes/${id}`);
  return data;
}

export async function getPedidosCliente(id: number) {
  const { data } = await api.get<PagedResult<Pedido>>(`/api/pedidos/por-cliente/${id}`, {
    params: { pagina: 1, tamanoPagina: 20 },
  });
  return data;
}

export async function crearCliente(input: ClienteInput) {
  const { data } = await api.post<Cliente>('/api/clientes', { ...input, puntos: input.puntos ?? 0 });
  return data;
}

export async function actualizarCliente(id: number, input: ClienteInput) {
  await api.put(`/api/clientes/${id}`, { ...input, id });
}

// ---------- Caja ----------

export async function getMovimientos(fecha?: string) {
  const { data } = await api.get<MovimientoCaja[]>('/api/caja/movimientos', { params: { fecha } });
  return data;
}

export async function getTiposGasto() {
  const { data } = await api.get<TipoGasto[]>('/api/caja/tipos-gasto');
  return data;
}

export async function registrarGasto(payload: RegistrarGastoPayload) {
  const { data } = await api.post<MovimientoCaja>('/api/caja/gastos', payload);
  return data;
}

// ---------- Sedes ----------

export async function getSedes() {
  const { data } = await api.get<Sede[]>('/api/sedes');
  return data;
}
