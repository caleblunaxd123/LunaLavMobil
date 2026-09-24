import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { getClientesPagina, PAGE_SIZE } from '../api/operationsApi';
import {
  AppText, Avatar, Badge, Button, Card, EmptyState, ErrorState, ListSkeleton, LockedState, Pager, Screen, SearchBar, TabHeader,
} from '../components/ui';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePermissions } from '../hooks/usePermissions';
import type { TabScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, space } from '../theme';

export function ClientesScreen({ navigation }: TabScreenProps<'Clientes'>) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const can = usePermissions();
  const listRef = useRef<FlatList>(null);
  const [texto, setTexto] = useState('');
  const term = useDebouncedValue(texto.trim());
  const allowed = can('CLIENTES');
  // La página vuelve a 1 al cambiar la búsqueda.
  const [pageState, setPageState] = useState({ page: 1, key: term });
  const page = pageState.key === term ? pageState.page : 1;

  const query = useQuery({
    queryKey: ['clientes', negocioId, term, page],
    queryFn: () => getClientesPagina(term, page),
    enabled: allowed,
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  const capped = !!data?.capped;

  const changePage = (next: number) => { setPageState({ page: next, key: term }); listRef.current?.scrollToOffset({ offset: 0, animated: true }); };
  const nuevo = () => navigation.navigate('ClienteForm');
  if (!allowed) return <Screen><View style={styles.content}><TabHeader title="Clientes" /><LockedState module="ver clientes" /></View></Screen>;

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
          <TabHeader title="Clientes" subtitle={data ? `${data.total}${capped ? '+' : ''} ${term ? 'resultados' : 'clientes'}` : 'Cargando…'}
            right={<Button label="Nuevo" icon="person-add-outline" size="sm" onPress={nuevo} />} />
          <SearchBar value={texto} onChangeText={setTexto} placeholder="Buscar por nombre, celular o DNI" />
        </View>}
        ListEmptyComponent={query.isLoading ? <ListSkeleton /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} />
          : <EmptyState icon={term ? 'search-outline' : 'people-outline'} title={term ? 'No encontramos ese cliente' : 'Aún no tienes clientes'}
            text={term ? 'Revisa cómo está escrito o regístralo como cliente nuevo.' : 'Registra a tus clientes para tener su historial y contacto a la mano.'}
            actionLabel="Registrar cliente" onAction={nuevo} />}
        renderItem={({ item: c }) => (
          <Card onPress={() => navigation.navigate('ClienteDetalle', { id: c.id })} style={styles.row} accessibilityLabel={c.nombre}>
            <Avatar name={c.nombre} tone="teal" />
            <View style={styles.body}>
              <AppText variant="subheading" numberOfLines={1}>{c.nombre}</AppText>
              <AppText variant="caption" numberOfLines={1}>{[c.celular, c.dni && `DNI ${c.dni}`].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</AppText>
            </View>
            {c.puntos > 0 && <Badge label={`${c.puntos} pts`} tone="violet" dot={false} />}
            <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
          </Card>
        )}
        ListFooterComponent={data ? <Pager page={page} pageSize={PAGE_SIZE} total={data.total} capped={capped} onChange={changePage} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxxl, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm, padding: space.md },
  body: { flex: 1, gap: 2 },
});
