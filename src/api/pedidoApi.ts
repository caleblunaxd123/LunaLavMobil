import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { api } from './http';
import type { MetodoPago, Servicio } from './operationsApi';

/*
 * Operaciones avanzadas del pedido y de delivery: las mismas que usa LunaLav web
 * (registrar, detalle de pedido, mapa de ubicación y motorizados).
 */

// ---------- Configuración del negocio ----------

export interface ConfiguracionNegocio {
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
  /** Servicio de sistema que representa la tarifa de domicilio (no es un servicio de lavandería). */
  servicioDeliveryId?: number | null;
  // Datos que usa el ticket impreso (los mismos que la web).
  ruc?: string | null;
  logoUrl?: string | null;
  /** 58 u 80 mm según la ticketera del negocio. */
  anchoTicketMm?: number;
  mensajePieTicket?: string | null;
  condicionesServicio?: string | null;
  notasProduccion?: string | null;
}

/**
 * GET /api/configuracion: anónimo en el backend, así que cualquier rol puede leerla. El visitante de la
 * demo tiene bloqueado todo /api/configuracion con su sesión, así que ahí se usa la versión pública
 * del espacio "demo" (misma información, sin autenticación).
 */
export async function getConfiguracion() {
  const session = useAuthStore.getState().session;
  if (session?.isDemo) {
    const { data } = await axios.get<ConfiguracionNegocio>(`${session.apiOrigin}/api/configuracion/publico/demo`, { timeout: 15_000 });
    return data;
  }
  const { data } = await api.get<ConfiguracionNegocio>('/api/configuracion');
  return data;
}

export interface AreaLavado { id: number; nombre: string; orden: number; tiempoEstMinutos: number }

export async function getAreasLavado() {
  const { data } = await api.get<AreaLavado[]>('/api/areas-lavado');
  return data;
}

export async function getSiguienteNumero() {
  const { data } = await api.get<number>('/api/pedidos/siguiente-numero');
  return data;
}

/** Alta rápida de un servicio durante el registro (módulo REGISTRAR). Si ya existe con ese nombre, lo reutiliza. */
export async function crearServicioRapido(nombre: string, precio: number, unidad: string) {
  const { data } = await api.post<Servicio>('/api/servicios', { nombre, precio, unidad });
  return data;
}

export interface PromocionValida {
  id: number;
  descripcion: string;
  descuentoPct?: number | null;
  descuentoMonto?: number | null;
  servicioId?: number | null;
  cantidadMinima: number;
}

export async function validarPromocion(codigo: string, clienteId?: number) {
  const { data } = await api.get<PromocionValida>('/api/pedidos/promocion/validar', { params: { codigo, clienteId } });
  return data;
}

// ---------- Geocodificación (OpenStreetMap vía el backend) ----------

export interface ResultadoGeo {
  id: string;
  latitud: number;
  longitud: number;
  etiqueta: string;
  direccion?: string | null;
  distrito?: string | null;
}

export async function buscarDireccion(direccion: string, distrito: string) {
  const { data } = await api.get<ResultadoGeo[]>('/api/geocodificacion/buscar', { params: { direccion, distrito } });
  return data;
}

export async function direccionDePunto(latitud: number, longitud: number) {
  const { data } = await api.get<ResultadoGeo>('/api/geocodificacion/reversa', { params: { latitud, longitud } });
  return data;
}

// ---------- Detalle del pedido ----------

export interface HistorialPedido {
  id: number;
  areaNombre?: string | null;
  estadoProceso: string;
  fecha: string;
  actorTipo: string;
  actorDescripcion?: string | null;
  nota?: string | null;
  notificadoWsp: boolean;
}

export async function getHistorial(id: number) {
  const { data } = await api.get<HistorialPedido[]>(`/api/pedidos/${id}/historial`);
  return data;
}

export interface EntregaPedido {
  id: number;
  fecha: string;
  usuarioNombre?: string | null;
  recibidoPor?: string | null;
  nota?: string | null;
  esFinal: boolean;
  montoCobrado: number;
  items: { pedidoItemId: number; servicioNombre?: string | null; servicioUnidad?: string | null; cantidad: number }[];
}

export async function getEntregas(id: number) {
  const { data } = await api.get<EntregaPedido[]>(`/api/pedidos/${id}/entregas`);
  return data;
}

export interface EntregarPayload {
  items: { pedidoItemId: number; cantidad: number }[];
  pagos: { monto: number; metodo: MetodoPago }[];
  recibidoPor?: string;
  nota?: string;
}

/** Entrega parcial o total, con uno o varios cobros (pago mixto). */
export async function entregarPedido(id: number, payload: EntregarPayload) {
  const { data } = await api.post<{ mensaje?: string; estadoProceso?: string }>(`/api/pedidos/${id}/entregar`, payload);
  return data;
}

export async function agregarItem(id: number, servicioId: number, cantidad: number, descripcion?: string) {
  await api.post(`/api/pedidos/${id}/items`, { servicioId, cantidad, descripcion: descripcion?.trim() || undefined });
}

export async function cambiarFechaEntrega(id: number, fecha: string, motivo?: string) {
  await api.put(`/api/pedidos/${id}/fecha-entrega`, { fecha, motivo: motivo?.trim() || undefined });
}

export interface DestinoDelivery {
  direccionEntrega: string;
  distritoEntrega: string;
  referenciaEntrega?: string | null;
  latitudEntrega: number;
  longitudEntrega: number;
  costoDelivery?: number | null;
}

export async function convertirDelivery(id: number, destino: DestinoDelivery) {
  await api.post(`/api/pedidos/${id}/convertir-delivery`, destino);
}

export async function anularPedido(id: number, motivo: string) {
  await api.post(`/api/pedidos/${id}/anular`, { motivo });
}

export async function editarMetodoPago(pedidoId: number, pagoId: number, metodo: MetodoPago) {
  await api.put(`/api/pedidos/${pedidoId}/pagos/${pagoId}/metodo`, { metodo });
}

export async function emitirComprobante(pedidoId: number, tipo: 'BOLETA' | 'FACTURA') {
  const { data } = await api.post<{ id: number; numeroCompleto?: string; estado?: string; descripcionRespuestaSunat?: string | null }>(
    `/api/pedidos/${pedidoId}/comprobante`, { tipo });
  return data;
}

// ---------- Motorizados y enlaces públicos ----------

export interface Motorizado { id: number; nombre: string; celular?: string | null; activo: boolean }

export async function getMotorizados() {
  const { data } = await api.get<Motorizado[]>('/api/motorizados');
  return data;
}

export async function asignarMotorizado(pedidoId: number, motorizadoId: number | null) {
  await api.put(`/api/pedidos/${pedidoId}/motorizado`, { motorizadoId });
}

/** Página pública de seguimiento (también sirve para pagar en línea). */
export async function linkSeguimiento(pedidoId: number) {
  const { data } = await api.get<{ token: string }>(`/api/pedidos/${pedidoId}/link-seguimiento`);
  return data.token;
}

/** Enlace para que el motorizado comparta su ubicación y marque la entrega. */
export async function linkRepartidor(pedidoId: number) {
  const { data } = await api.get<{ token: string }>(`/api/pedidos/${pedidoId}/link-repartidor`);
  return data.token;
}

// ---------- Plantillas de WhatsApp ----------

export interface PlantillaWhatsapp { evento: string; mensaje: string }

export async function getPlantillasWhatsapp() {
  const { data } = await api.get<PlantillaWhatsapp[]>('/api/plantillas-whatsapp');
  return data;
}

// ---------- Fotos de evidencia ----------

export type MomentoFoto = 'RECEPCION' | 'ENTREGA' | 'OTRO';
export interface FotoPedido { id: number; momento: MomentoFoto; fechaSubida: string; tamanoBytes: number }
export const MAX_FOTOS = 15;

export async function getFotos(pedidoId: number) {
  const { data } = await api.get<FotoPedido[]>(`/api/pedidos/${pedidoId}/fotos`);
  return data;
}

export const fotoPath = (pedidoId: number, fotoId: number) => `/api/pedidos/${pedidoId}/fotos/${fotoId}/archivo`;

/** Sube una foto (JPG) tomada con la cámara o elegida de la galería. */
export async function subirFoto(pedidoId: number, uri: string, momento: MomentoFoto) {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('archivo', blob, 'foto.jpg');
  } else {
    // React Native acepta { uri, name, type } como archivo de un FormData.
    form.append('archivo', { uri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  form.append('momento', momento);
  const { data } = await api.post<FotoPedido>(`/api/pedidos/${pedidoId}/fotos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000,
  });
  return data;
}

export async function eliminarFoto(pedidoId: number, fotoId: number) {
  await api.delete(`/api/pedidos/${pedidoId}/fotos/${fotoId}`);
}
