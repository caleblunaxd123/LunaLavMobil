import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CrudApi } from '../api/ajustesApi';
import { apiErrorMessage } from '../api/errors';
import { toast } from '../components/ui';
import { useAuthStore } from '../store/authStore';

/**
 * Lista + activar/desactivar de un recurso de Ajustes. El interruptor responde al instante y, si el
 * servidor lo rechaza, se vuelve a leer la lista y se muestra el motivo.
 */
export function useCrudAdmin<T extends { id: number }>(
  clave: string, api: CrudApi<T>, esActivo: (x: T) => boolean, conEstado: (x: T, activo: boolean) => T,
) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const queryClient = useQueryClient();
  const key = ['ajustes', clave, negocioId];
  const query = useQuery({ queryKey: key, queryFn: api.listar });
  const refrescar = () => queryClient.invalidateQueries({ queryKey: key });
  const toggle = useMutation({
    mutationFn: (x: T) => api.cambiarEstado(x.id, !esActivo(x)),
    onMutate: (x) => queryClient.setQueryData<T[]>(key, (lista) => lista?.map((i) => (i.id === x.id ? conEstado(i, !esActivo(x)) : i))),
    onError: (e) => { toast(apiErrorMessage(e), 'error'); void query.refetch(); },
  });
  return { query, toggle, refrescar, key };
}
