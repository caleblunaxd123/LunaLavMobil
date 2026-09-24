import { useMemo, useState } from 'react';

/**
 * Paginación en el dispositivo para listas que la API entrega completas (clientes con tope,
 * movimientos del día, insumos). Vuelve a la página 1 cuando cambian los filtros (`resetKey`).
 */
export function usePagination<T>(items: T[], pageSize: number, resetKey?: unknown) {
  const [state, setState] = useState({ page: 1, key: resetKey });
  const requested = Object.is(state.key, resetKey) ? state.page : 1;
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requested, pages);
  const pageItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);
  const setPage = (next: number) => setState({ page: next, key: resetKey });
  return { page, setPage, pageItems, total: items.length, pageSize };
}
