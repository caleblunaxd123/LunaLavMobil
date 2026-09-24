import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCliente, getPedidosCliente } from '../api/operationsApi';
import { Button, Card, ScreenTitle, SectionLabel, StateView } from '../components/ui';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { colors } from '../theme/colors';
import { whatsappUrl } from '../utils/format';
import { PedidoRow } from './PedidosScreen';

export function ClienteDetalleScreen({ navigation, route }: AppScreenProps<'ClienteDetalle'>) {
  const { id } = route.params;
  const can = usePermissions();
  const cliente = useQuery({ queryKey: ['cliente', id], queryFn: () => getCliente(id) });
  const pedidos = useQuery({ queryKey: ['cliente', id, 'pedidos'], queryFn: () => getPedidosCliente(id) });
  const c = cliente.data;

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={cliente.isRefetching} onRefresh={() => { void cliente.refetch(); void pedidos.refetch(); }} tintColor={colors.primary} />}>
      <ScreenTitle kicker="FICHA DEL CLIENTE" title={c?.nombre ?? 'Cliente'} onBack={navigation.goBack}
        right={c && <Pressable style={styles.edit} onPress={() => navigation.navigate('ClienteForm', { id })} accessibilityLabel="Editar cliente">
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </Pressable>} />
      {!c ? <StateView loading={cliente.isLoading} error={cliente.isError} empty={false} /> : <>
        <Card>
          <Info icon="call-outline" label="Celular" value={c.celular} />
          <Info icon="card-outline" label="DNI" value={c.dni} />
          <Info icon="document-text-outline" label="RUC" value={c.documentoFiscal} />
          <Info icon="location-outline" label="Dirección" value={c.direccion} />
          <Info icon="star-outline" label="Puntos" value={String(c.puntos)} />
        </Card>
        <View style={styles.actions}>
          {!!c.celular && <Button label="WhatsApp" icon="logo-whatsapp" variant="secondary" style={styles.flex}
            onPress={() => void Linking.openURL(whatsappUrl(c.celular!))} />}
          {can('REGISTRAR') && <Button label="Nuevo pedido" icon="add-circle-outline" style={styles.flex}
            onPress={() => navigation.navigate('NuevoPedido', { clienteId: c.id })} />}
        </View>
        <SectionLabel>Pedidos del cliente{pedidos.data ? ` (${pedidos.data.total})` : ''}</SectionLabel>
        {pedidos.data?.items.length
          ? pedidos.data.items.map((p) => <PedidoRow key={p.id} pedido={p}
            onPress={() => can('PEDIDOS') && navigation.navigate('PedidoDetalle', { id: p.id })} />)
          : <StateView loading={pedidos.isLoading} error={pedidos.isError} empty
            emptyTitle="Sin pedidos todavía" emptyText="Los pedidos de este cliente en la sede aparecerán aquí." />}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null }) {
  return <View style={styles.info}>
    <Ionicons name={icon} size={19} color={colors.primary} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, !value && styles.empty]} numberOfLines={2}>{value || 'No registrado'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  edit: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#DFF4FF', alignItems: 'center', justifyContent: 'center' },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  infoLabel: { color: colors.muted, width: 78, fontSize: 13 },
  infoValue: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 14, textAlign: 'right' },
  empty: { color: '#A5B5C4', fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
});
