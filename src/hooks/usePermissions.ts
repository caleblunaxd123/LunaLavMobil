import { useAuthStore } from '../store/authStore';

/** Módulos del SaaS: los mismos códigos que la política `Modulo:*` de la API. */
export type Modulo = 'INICIO' | 'REGISTRAR' | 'PEDIDOS' | 'CLIENTES' | 'CAJA' | 'AJUSTES' | 'INVENTARIO';

export function usePermissions() {
  const usuario = useAuthStore((state) => state.session?.usuario);
  return (modulo: Modulo) => !!usuario && (usuario.rol === 'ADMIN' || usuario.modulosPermitidos.includes(modulo));
}
