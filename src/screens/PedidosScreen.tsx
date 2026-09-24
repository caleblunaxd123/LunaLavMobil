import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { getPedidos, PAGE_SIZE, type FiltroPedidos } from '../api/operationsApi';
import { PedidoCard } from '../components/PedidoCard';
import {
  AppText, Button, EmptyState, ErrorState, ListSkeleton, LockedState, Pager, Screen, SearchBar, SegmentedControl, TabHeader,
} from '../components/ui';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePermissions } from '../hooks/usePermissions';
import type { TabScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, space } from '../theme';

const filtros: { value: FiltroPedidos; label: string; empty: string }[] = [
  { value: 'pendientes', label: 'En curso', empty: 'No hay pedidos en curso. Los nuevos aparecerán aquí.' },
  { value: 'listos', label: 'Por entregar', empty: 'Ningún pedido está listo para entregar todavía.' },
  { value: 'entregados', label: 'Entregados', empty: 'Aún no hay pedidos entregados.' },
  { value: 'ultimos', label: 'Todos', empty: 'Todavía no se registraron pedidos en esta sede.' },
];

/** La API limita "Todos" a los 500 más recientes: se avisa para que el usuario busque. */
const ULTIMOS_CAP = 500;

export function PedidosScreen({ navigation, route }: TabScreenProps<'Pedidos'>) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const sedeId = useAuthStore((s) => s.session?.usuario.sedeId);
  const can = usePermissions();
  const listRef = useRef<FlatList>(null);
  const [filtroElegido, setFiltroElegido] = useState<FiltroPedidos>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const term = useDebouncedValue(busqueda.trim());
  const allowed = can('PEDIDOS');
  // Los indicadores del Inicio abren esta pestaña con un filtro ya elegido; manda hasta que el usuario elija otro.
  const filtro = route.params?.filtro ?? filtroElegido;
  const setFiltro = (value: FiltroPedidos) => { setFiltroElegido(value); navigation.setParams({ filtro: undefined }); };
  // La página vuelve a 1 al cambiar de filtro o búsqueda.
  const pageKey = `${filtro}|${term}`;
  const [pageState, setPageState] = useState({ page: 1, key: pageKey });
  const page = pageState.key === pageKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ page: next, key: pageKey });

  const query = useQuery({
    queryKey: ['pedidos', negocioId, sedeId, filtro, term, page],
    queryFn: () => getPedidos(filtro, term, page),
    enabled: allowed,
    placeholderData: keepPreviousData,
  });

  const changePage = (next: number) => { setPage(next); listRef.current?.scrollToOffset({ offset: 0, animated: true }); };
  const newOrder = can('REGISTRAR') ? () => navigation.navigate('NuevoPedido') : undefined;

  if (!allowed) return <Screen><View style={styles.content}><TabHeader title="Pedidos" /><LockedState module="ver pedidos" /></View></Screen>;

  const data = query.data;
  const current = filtros.find((f) => f.value === filtro)!;
  return (
    <Screen>
      <FlatList
        ref={listRef}
        data={data?.items ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isPlaceholderData} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={styles.header}>
          <TabHeader title="Pedidos" subtitle={data ? `${data.total} ${term ? 'resultados' : current.label.toLowerCase()}` : 'Cargando…'}
            right={newOrder && <Button label="Nuevo" icon="add" size="sm" onPress={newOrder} />} />
          <SearchBar value={busqueda} onChangeText={setBusqueda} placeholder="Buscar por N°, cliente, DNI o celular" />
          {term ? <AppText variant="caption">Buscando en todos los pedidos de la sede</AppText>
            : <SegmentedControl segments={filtros} value={filtro} onChange={setFiltro} />}
        </View>}
        ListEmptyComponent={query.isLoading ? <ListSkeleton /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} />
          : <EmptyState icon={term ? 'search-outline' : 'receipt-outline'} title={term ? 'Sin coincidencias' : 'Nada por aquí'}
            text={term ? 'Prueba con el número del pedido, el nombre o el celular del cliente.' : current.empty}
            actionLabel={!term && newOrder ? 'Registrar un pedido' : undefined} onAction={newOrder} />}
        renderItem={({ item }) => <PedidoCard pedido={item} onPress={() => navigation.navigate('PedidoDetalle', { id: item.id })} />}
        ListFooterComponent={data ? <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onChange={changePage}
          capped={filtro === 'ultimos' && !term && data.total >= ULTIMOS_CAP} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxxl, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.md },
});
