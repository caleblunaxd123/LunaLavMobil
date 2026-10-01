import { api } from './http';

/*
 * Ajustes del negocio (solo ADMIN): categorías, tipos de gasto, áreas de lavado, personal, sedes,
 * plantillas de WhatsApp, usuarios, roles y permisos. Las mismas rutas que usa LunaLav web.
 */

/** Respuesta de DELETE: el servidor elimina si nadie lo usa y, si no, solo desactiva, y avisa cuál de las dos. */
export interface RespuestaBorrado { mensaje: string }

/** CRUD estándar de la API: GET lista, POST crea, PUT actualiza, PATCH /estado y DELETE (eliminar o desactivar). */
function crud<T extends { id: number }>(ruta: string) {
  return {
    listar: async () => (await api.get<T[]>(ruta)).data,
    crear: async (cuerpo: Partial<T>) => (await api.post<T>(ruta, cuerpo)).data,
    actualizar: async (id: number, cuerpo: Partial<T>) => { await api.put(`${ruta}/${id}`, { ...cuerpo, id }); },
    cambiarEstado: async (id: number, activo: boolean) => { await api.patch(`${ruta}/${id}/estado`, { activo }); },
    borrar: async (id: number) => (await api.delete<RespuestaBorrado>(`${ruta}/${id}`)).data,
  };
}

export type CrudApi<T extends { id: number }> = ReturnType<typeof crud<T>>;

// ---------- Catálogos de un solo nombre ----------

export interface CategoriaServicio { id: number; nombre: string; activa: boolean; enUso?: boolean }
export interface TipoGasto { id: number; nombre: string; activo: boolean; enUso?: boolean }
export interface RolPersonal { id: number; nombre: string; activo: boolean }

export const categoriasApi = crud<CategoriaServicio>('/api/categorias');
export const tiposGastoApi = crud<TipoGasto>('/api/tipos-gasto-admin');
export const rolesPersonalApi = crud<RolPersonal>('/api/roles-personal');

// ---------- Áreas de lavado ----------

export interface AreaLavado { id: number; nombre: string; orden: number; tiempoEstMinutos: number; activa: boolean; enUso?: boolean }
export const areasApi = crud<AreaLavado>('/api/areas-lavado-admin');

// ---------- Personal ----------

export interface Empleado {
  id: number;
  nombre: string;
  dni: string | null;
  celular: string | null;
  cargo: string | null;
  /** yyyy-MM-dd */
  fechaIngreso: string | null;
  activo: boolean;
}
export const personalApi = crud<Empleado>('/api/personal');

// ---------- Sedes ----------

export interface Sede { id: number; nombre: string; direccion?: string | null; telefono?: string | null; activo: boolean }
export const sedesApi = crud<Sede>('/api/sedes');

// ---------- Plantillas de WhatsApp ----------

export interface PlantillaWhatsapp { id: number; evento: string; mensaje: string; activa: boolean }

export async function getPlantillasAdmin() {
  const { data } = await api.get<PlantillaWhatsapp[]>('/api/plantillas-whatsapp-admin');
  return data;
}

export async function actualizarPlantilla(p: PlantillaWhatsapp) {
  await api.put(`/api/plantillas-whatsapp-admin/${p.id}`, p);
}

// ---------- Usuarios del equipo ----------

export interface UsuarioEquipo {
  id: number;
  usuario: string;
  nombreCompleto: string;
  email?: string | null;
  rolId: number;
  rolCodigo?: string | null;
  rolNombre?: string | null;
  sedeId?: number | null;
  sedeNombre?: string | null;
  activo: boolean;
}

export interface UsuarioPayload {
  id?: number;
  usuario: string;
  nombreCompleto: string;
  email: string | null;
  /** Obligatoria al crear; al editar solo si se quiere cambiar. */
  password?: string | null;
  rolId: number;
  sedeId: number | null;
  activo: boolean;
}

export interface RolDeUsuario { id: number; codigo: string; nombre: string }

export async function getRolesDeUsuario() {
  const { data } = await api.get<RolDeUsuario[]>('/api/usuarios/roles');
  return data;
}

export async function crearUsuario(u: UsuarioPayload) {
  const { data } = await api.post<UsuarioEquipo>('/api/usuarios', u);
  return data;
}

export async function actualizarUsuario(id: number, u: UsuarioPayload) {
  await api.put(`/api/usuarios/${id}`, { ...u, id });
}

// ---------- Roles y permisos ----------

export interface RolAcceso { id: number; nombre: string; esSistema: boolean; enUso: boolean }
export interface PermisoItem { rolId: number; modulo: string; puedeAcceder: boolean }
export interface PermisoFinoCatalogo { clave: string; modulo: string; etiqueta: string; descripcion?: string | null }

export async function getRolesAcceso() {
  const { data } = await api.get<RolAcceso[]>('/api/roles-acceso');
  return data;
}

export async function crearRolAcceso(nombre: string) {
  const { data } = await api.post<RolAcceso>('/api/roles-acceso', { nombre });
  return data;
}

export async function renombrarRolAcceso(id: number, nombre: string) {
  await api.put(`/api/roles-acceso/${id}`, { nombre });
}

export async function eliminarRolAcceso(id: number) {
  await api.delete(`/api/roles-acceso/${id}`);
}

export async function getModulosPermisos() {
  const { data } = await api.get<string[]>('/api/permisos/modulos');
  return data;
}

export async function getPermisosFinos() {
  const { data } = await api.get<PermisoFinoCatalogo[]>('/api/permisos/finos');
  return data;
}

export async function getMatrizPermisos() {
  const { data } = await api.get<PermisoItem[]>('/api/permisos');
  return data;
}

export async function guardarMatrizPermisos(permisos: PermisoItem[]) {
  await api.put('/api/permisos', { permisos });
}

/** Nombre legible de cada módulo (los mismos que la web). */
export const ETIQUETA_MODULO: Record<string, string> = {
  INICIO: 'Inicio',
  PEDIDOS: 'Pedidos',
  REGISTRAR: 'Registrar pedidos',
  CAJA: 'Caja',
  CLIENTES: 'Clientes',
  PROMOCIONES: 'Promociones',
  REPORTES: 'Reportes',
  INVENTARIO: 'Inventario',
  AJUSTES: 'Ajustes',
};
