import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { getCliente, getPedidosCliente } from '../api/operationsApi';
import { PedidoCard } from '../components/PedidoCard';
import {
  AppText, Avatar, Badge, Button, Card, Divider, EmptyState, ErrorState, IconButton, ListSkeleton, Pager, Screen, Section, StackHeader,
} from '../components/ui';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { colors, space } from '../theme';
import { shortDate, whatsappUrl } from '../utils/format';

export function ClienteDetalleScreen({ navigation, route }: AppScreenProps<'ClienteDetalle'>) {
  const { id } = route.params;
  const can = usePermissions();
  const [page, setPage] = useState(1);
  const cliente = useQuery({ queryKey: ['cliente', id], queryFn: () => getCliente(id) });
  const pedidos = useQuery({ queryKey: ['cliente', id, 'pedidos', page], queryFn: () => getPedidosCliente(id, page), placeholderData: keepPreviousData });
  const c = cliente.data;

  return (
    <Screen>
      <StackHeader title="Ficha del cliente" onBack={navigation.goBack}
        right={c && <IconButton icon="create-outline" label="Editar cliente" tone="primary" onPress={() => navigation.navigate('ClienteForm', { id })} />} />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={cliente.isRefetching} onRefresh={() => { void cliente.refetch(); void pedidos.refetch(); }} tintColor={colors.primary} />}>
        {!c ? (cliente.isError ? <ErrorState onRetry={() => void cliente.refetch()} /> : <ListSkeleton rows={3} />) : <>
          <View style={styles.hero}>
            <Avatar name={c.nombre} size={72} tone="teal" />
            <AppText variant="title" align="center">{c.nombre}</AppText>
            <View style={styles.badges}>
              {c.puntos > 0 && <Badge label={`${c.puntos} puntos`} tone="violet" />}
              {!!c.fechaCreacion && <Badge label={`Cliente desde ${shortDate(c.fechaCreacion)}`} tone="neutral" dot={false} />}
            </View>
          </View>
          <View style={styles.actions}>
            {!!c.celular && <Button label="WhatsApp" icon="logo-whatsapp" variant="secondary" style={styles.flex} onPress={() => void Linking.openURL(whatsappUrl(c.celular!))} />}
            {!!c.celular && <Button label="Llamar" icon="call-outline" variant="secondary" style={styles.flex} onPress={() => void Linking.openURL(`tel:${c.celular}`)} />}
          </View>
          {can('REGISTRAR') && <Button label="Nuevo pedido para este cliente" icon="add-circle-outline" onPress={() => navigation.navigate('NuevoPedido', { clienteId: c.id })} style={styles.cta} />}

          <Section title="Datos">
            <Card padded={false}>
              {([['call-outline', 'Celular', c.celular], ['card-outline', 'DNI', c.dni], ['document-text-outline', 'RUC', c.documentoFiscal], ['location-outline', 'Dirección', c.direccion]] as const)
                .map(([icon, label, value], i) => <Fragment key={label}>
                  {i > 0 && <Divider inset={space.lg} />}
                  <View style={styles.info}>
                    <Ionicons name={icon} size={18} color={colors.muted} />
                    <AppText variant="caption" style={styles.infoLabel}>{label}</AppText>
                    <AppText variant="captionStrong" color={value ? colors.text : colors.placeholder} style={styles.infoValue} numberOfLines={2}>{value || 'No registrado'}</AppText>
                  </View>
                </Fragment>)}
            </Card>
          </Section>

          <Section title={`Pedidos${pedidos.data ? ` (${pedidos.data.total})` : ''}`}>
            {pedidos.isLoading ? <ListSkeleton rows={3} /> : pedidos.isError ? <ErrorState onRetry={() => void pedidos.refetch()} />
              : pedidos.data?.items.length ? <>
                {pedidos.data.items.map((p) => <PedidoCard key={p.id} pedido={p} onPress={can('PEDIDOS') ? () => navigation.navigate('PedidoDetalle', { id: p.id }) : undefined} />)}
                <Pager page={page} pageSize={10} total={pedidos.data.total} onChange={setPage} />
              </> : <EmptyState icon="receipt-outline" title="Sin pedidos todavía" text="Los pedidos de este cliente en tu sede aparecerán aquí." />}
          </Section>
        </>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl },
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  cta: { marginTop: space.md },
  info: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: 13 },
  infoLabel: { width: 80 },
  infoValue: { flex: 1, textAlign: 'right' },
});
