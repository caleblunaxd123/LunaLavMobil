import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPedidos, type FiltroPedidos, type Pedido } from '../api/operationsApi';
import { Badge, Card, Chip, Fab, Message, ScreenTitle, SearchBar, StateView } from '../components/ui';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePermissions } from '../hooks/usePermissions';
import type { TabScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { money, paymentColor, paymentLabel, processColor, processLabel, shortDate } from '../utils/format';

const filtros: { value: FiltroPedidos; label: string }[] = [
  { value: 'pendientes', label: 'En curso' },
  { value: 'listos', label: 'Listos' },
  { value: 'entregados', label: 'Entregados' },
  { value: 'ultimos', label: 'Todos' },
];

export function PedidoRow({ pedido, onPress }: { pedido: Pedido; onPress: () => void }) {
  const saldo = pedido.total - pedido.montoPagado;
  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={styles.number}><Text style={styles.numberText}>#{pedido.numero}</Text></View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{pedido.clienteNombre || 'Cliente'}</Text>
        <Text style={styles.meta}>{pedido.modalidad} · Ingreso {shortDate(pedido.fechaIngreso)}{pedido.fechaEntregaEst ? ` · Entrega ${shortDate(pedido.fechaEntregaEst)}` : ''}</Text>
        <View style={styles.badges}>
          <Badge label={pedido.anulado ? 'Anulado' : processLabel(pedido.estadoProceso)} color={pedido.anulado ? colors.danger : processColor(pedido.estadoProceso)} />
          <Badge label={paymentLabel(pedido.estadoPago)} color={paymentColor(pedido.estadoPago)} />
        </View>
      </View>
      <View style={styles.amounts}>
        <Text style={styles.amount}>{money(pedido.total)}</Text>
        {saldo > 0.009 && !pedido.anulado && <Text style={styles.saldo}>Debe {money(saldo)}</Text>}
      </View>
    </Card>
  );
}

export function PedidosScreen({ navigation }: TabScreenProps<'Pedidos'>) {
  const negocioId = useAuthStore((state) => state.session?.usuario.negocioId);
  const sedeId = useAuthStore((state) => state.session?.usuario.sedeId);
  const can = usePermissions();
  const [filtro, setFiltro] = useState<FiltroPedidos>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const term = useDebouncedValue(busqueda.trim());
  const allowed = can('PEDIDOS');
  const query = useQuery({
    queryKey: ['pedidos', negocioId, sedeId, filtro, term],
    queryFn: () => getPedidos(filtro, term),
    enabled: allowed,
  });

  if (!allowed) return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.content}>
    <ScreenTitle title="Pedidos" icon="receipt-outline" />
    <Message icon="lock-closed-outline" title="Módulo no incluido" text="Tu usuario no tiene permiso para acceder a pedidos." />
  </View></SafeAreaView>;

  const items = query.data?.items ?? [];
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
      ListHeaderComponent={<>
        <ScreenTitle title="Pedidos" icon="receipt-outline" />
        <SearchBar value={busqueda} onChangeText={setBusqueda} placeholder="Número, cliente, DNI o celular..." />
        {!term && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filtros.map((item) => <Chip key={item.value} label={item.label} active={filtro === item.value} onPress={() => setFiltro(item.value)} />)}
        </ScrollView>}
        {!!query.data && <Text style={styles.count}>{query.data.total} pedido{query.data.total === 1 ? '' : 's'}</Text>}
      </>}
      ListEmptyComponent={<StateView loading={query.isLoading} error={query.isError} empty
        emptyTitle={term ? 'Sin coincidencias' : 'No hay pedidos aquí'}
        emptyText={term ? 'Prueba con otro número, nombre o celular.' : 'Los pedidos de esta sede aparecerán aquí.'} />}
      renderItem={({ item }) => <PedidoRow pedido={item} onPress={() => navigation.navigate('PedidoDetalle', { id: item.id })} />}
    />
    {can('REGISTRAR') && <Fab label="Nuevo pedido" onPress={() => navigation.navigate('NuevoPedido')} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 96, flexGrow: 1 },
  filters: { gap: 8, paddingBottom: 12 },
  count: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  number: { minWidth: 50, height: 46, borderRadius: 13, backgroundColor: '#E4F5FF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  numberText: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  body: { flex: 1, gap: 3 },
  title: { color: colors.text, fontWeight: '900', fontSize: 14 },
  meta: { color: colors.muted, fontSize: 11 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 3 },
  amounts: { alignItems: 'flex-end', gap: 4 },
  amount: { color: colors.navy, fontSize: 13, fontWeight: '900' },
  saldo: { color: colors.danger, fontSize: 10, fontWeight: '800' },
});
