import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    // Un cobro o un pedido no se deja en cola sin conexión: falla al instante con un mensaje claro,
    // para que nadie crea que quedó registrado ni se duplique al volver la señal.
    mutations: { networkMode: 'always', retry: 0 },
  },
});
