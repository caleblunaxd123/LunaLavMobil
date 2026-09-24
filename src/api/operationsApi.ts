import axios from 'axios';
import type { Session } from '../types/auth';

export interface DashboardData {
  ordenesHoy: number;
  ventasDelDia: number;
  totalPendientes: number;
  totalListos: number;
  totalClientes: number;
  ordenesRecientes: Array<{
    numero: number;
    clienteNombre: string;
    servicioPrincipal: string;
    estadoProceso: string;
    total: number;
  }>;
}

export interface Pedido {
  id: number;
  numero: number;
  clienteNombre?: string;
  fechaIngreso: string;
  total: number;
  montoPagado: number;
  estadoPago: string;
  estadoProceso: string;
  modalidad: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  celular?: string;
  direccion?: string;
  puntos: number;
}

export interface MovimientoCaja {
  id: number;
  fecha: string;
  tipo: string;
  metodoPago: string;
  monto: number;
  descripcion?: string;
  pedidoNumero?: number;
  clienteNombre?: string;
}

interface PagedResult<T> { items: T[]; total: number; pagina: number; tamanoPagina: number }

function client(session: Session) {
  return axios.create({
    baseURL: session.apiOrigin,
    timeout: 15_000,
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
}

export async function getDashboard(session: Session) {
  const { data } = await client(session).get<DashboardData>('/api/pedidos/dashboard');
  return data;
}

export async function getPedidos(session: Session, busqueda = '') {
  const { data } = await client(session).get<PagedResult<Pedido>>('/api/pedidos', {
    params: { busqueda: busqueda || undefined, pagina: 1, tamanoPagina: 40 },
  });
  return data;
}

export async function getClientes(session: Session, texto = '') {
  const { data } = await client(session).get<Cliente[]>('/api/clientes', {
    params: { texto: texto || undefined, limite: 60 },
  });
  return data;
}

export async function getMovimientos(session: Session) {
  const { data } = await client(session).get<MovimientoCaja[]>('/api/caja/movimientos');
  return data;
}
