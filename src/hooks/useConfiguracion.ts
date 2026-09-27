import { useQuery } from '@tanstack/react-query';
import { getConfiguracion } from '../api/pedidoApi';
import { useAuthStore } from '../store/authStore';

/** Configuración del negocio (tarifa de delivery, canje de puntos, tope de descuento, Yape…). */
export function useConfiguracion() {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  return useQuery({ queryKey: ['configuracion', negocioId], queryFn: getConfiguracion, staleTime: 5 * 60_000 });
}
