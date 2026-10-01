import { useAuthStore } from '../store/authStore';

/** Módulos del SaaS: los mismos códigos que la política `Modulo:*` de la API. */
export type Modulo = 'INICIO' | 'REGISTRAR' | 'PEDIDOS' | 'CLIENTES' | 'CAJA' | 'AJUSTES' | 'INVENTARIO' | 'REPORTES' | 'PROMOCIONES';

/**
 * Sub-permisos finos (secciones o botones dentro de un módulo): el catálogo `PermisosFinos` de la API.
 * El administrador los activa por rol en "Usuarios y permisos"; el ADMIN siempre los tiene.
 */
export type PermisoFino =
  | 'CAJA_VER_CIERRES_ANTERIORES' | 'CAJA_VER_MONTOS_DIGITALES' | 'CAJA_REPORTE_CUADRES' | 'CAJA_REGISTRAR_GASTO' | 'CAJA_VER_OTROS_TURNOS'
  | 'INICIO_VER_MONTOS' | 'PEDIDOS_ANULAR' | 'REGISTRAR_APLICAR_DESCUENTO' | 'CLIENTES_FUSIONAR' | 'INVENTARIO_VER_COSTOS'
  | 'REPORTES_VER_GERENCIAL' | 'REPORTES_VER_CONSOLIDADO';

export function usePermissions() {
  const usuario = useAuthStore((state) => state.session?.usuario);
  return (permiso: Modulo | PermisoFino) => !!usuario && (usuario.rol === 'ADMIN' || usuario.modulosPermitidos.includes(permiso));
}
