import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Switch, View } from 'react-native';
import { apiErrorMessage } from '../api/errors';
import { cambiarEstadoPromocion, getPromociones, type Promocion } from '../api/gestionApi';
import {
  AppText, Badge, Button, Card, EmptyState, ErrorState, IconButton, ListSkeleton, LockedState, Pager, Screen, SegmentedControl, StackHeader, toast,
} from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, space } from '../theme';
import { isPastDay, money, shortDateWithYear } from '../utils/format';
import { useOpenWeb } from '../utils/web';

type Filtro = 'activas' | 'codigos' | 'inactivas';
const tipoLabel: Record<string, string> = { VOLUMEN: 'Por volumen', FRECUENCIA: 'Cliente frecuente', FIJA: 'Descuento fijo', CODIGO: 'Código', RESTA: 'Canje de puntos' };
const esCodigo = (p: Promocion) => !!p.codigo;
const vencida = (p: Promocion) => !!p.fechaFin && isPastDay(p.fechaFin);
const agotada = (p: Promocion) => p.maxUsos != null && p.usos >= p.maxUsos;

function descuento(p: Promocion) {
  if (p.descuentoPct) return `${Number(p.descuentoPct.toFixed(2))}% de descuento`;
  if (p.descuentoMonto) return `${money(p.descuentoMonto)} de descuento`;
  return 'Descuento';
}

export function PromocionesScreen({ navigation }: AppScreenProps<'Promociones'>) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const isAdmin = useAuthStore((s) => s.session?.usuario.rol === 'ADMIN');
  const can = usePermissions();
  const openWeb = useOpenWeb();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const [filtro, setFiltro] = useState<Filtro>('activas');
  // La API de promociones es solo para administradores.
  const allowed = isAdmin && can('PROMOCIONES');
  const query = useQuery({ queryKey: ['promociones', negocioId], queryFn: getPromociones, enabled: allowed });

  const toggle = useMutation({
    mutationFn: (p: Promocion) => cambiarEstadoPromocion(p.id, !p.activa),
    onMutate: (p) => queryClient.setQueryData<Promocion[]>(['promociones', negocioId], (list) => list?.map((x) => (x.id === p.id ? { ...x, activa: !p.activa } : x))),
    onSuccess: (_, p) => toast(p.activa ? 'Promoción pausada' : 'Promoción activada'),
    onError: (e) => { toast(apiErrorMessage(e), 'error'); void query.refetch(); },
  });

  const groups = useMemo(() => {
    const all = query.data ?? [];
    return {
      activas: all.filter((p) => p.activa && !esCodigo(p)),
      codigos: all.filter((p) => p.activa && esCodigo(p)),
      inactivas: all.filter((p) => !p.activa),
    };
  }, [query.data]);
  const items = groups[filtro];
  const { page, setPage, pageItems, total, pageSize } = usePagination(items, 15, filtro);
  const webButton = <IconButton icon="open-outline" label="Abrir promociones en la web" onPress={() => openWeb('promociones')} />;

  if (!allowed) return <Screen><StackHeader title="Promociones" onBack={navigation.goBack} /><View style={styles.content}><LockedState module="gestionar promociones" /></View></Screen>;

  return (
    <Screen>
      <StackHeader title="Promociones" subtitle="Descuentos y códigos" onBack={navigation.goBack} right={webButton} />
      <FlatList
        ref={listRef}
        data={pageItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={styles.header}>
          <SegmentedControl<Filtro> value={filtro} onChange={setFiltro} segments={[
            { value: 'activas', label: 'Promociones', count: groups.activas.length },
            { value: 'codigos', label: 'Códigos', count: groups.codigos.length },
            { value: 'inactivas', label: 'Pausadas', count: groups.inactivas.length },
          ]} />
          <Button label="Crear promoción o código en la web" icon="add" variant="secondary" size="md" onPress={() => openWeb('promociones')} />
        </View>}
        ListEmptyComponent={query.isLoading ? <ListSkeleton /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} />
          : <EmptyState icon="pricetag-outline" title={filtro === 'inactivas' ? 'Nada pausado' : 'Sin promociones'}
            text={filtro === 'codigos' ? 'Los códigos de cumpleaños, referidos y puntos que generes aparecerán aquí.'
              : filtro === 'inactivas' ? 'Las promociones que pauses quedan aquí para reactivarlas cuando quieras.'
                : 'Crea descuentos por volumen, para clientes frecuentes o por temporada.'} />}
        renderItem={({ item: p }) => {
          const off = vencida(p) || agotada(p);
          return (
            <Card style={styles.row}>
              <View style={[styles.icon, { backgroundColor: p.activa && !off ? colors.tealSoft : colors.surfaceMuted }]}>
                <Ionicons name={esCodigo(p) ? 'ticket-outline' : 'pricetag-outline'} size={19} color={p.activa && !off ? colors.teal : colors.muted} />
              </View>
              <View style={styles.flex}>
                <AppText variant="subheading" numberOfLines={2}>{esCodigo(p) ? p.codigo : p.descripcion}</AppText>
                <AppText variant="caption" numberOfLines={2}>
                  {[descuento(p), esCodigo(p) ? p.clienteNombre ?? p.descripcion : p.servicioNombre, p.cantidadMinima > 1 ? `desde ${p.cantidadMinima}` : null].filter(Boolean).join(' · ')}
                </AppText>
                <View style={styles.badges}>
                  <Badge label={tipoLabel[p.tipo] ?? p.tipo} tone="neutral" dot={false} />
                  {p.maxUsos != null && <Badge label={`${p.usos}/${p.maxUsos} usos`} tone={agotada(p) ? 'danger' : 'primary'} dot={false} />}
                  {p.fechaFin && <Badge label={vencida(p) ? 'Vencida' : `Hasta ${shortDateWithYear(p.fechaFin)}`} tone={vencida(p) ? 'danger' : 'neutral'} dot={false} />}
                </View>
              </View>
              <Switch value={p.activa} onValueChange={() => toggle.mutate(p)} accessibilityLabel={p.activa ? 'Pausar promoción' : 'Activar promoción'}
                trackColor={{ true: colors.teal, false: colors.borderStrong }} thumbColor="#FFFFFF" />
            </Card>
          );
        }}
        ListFooterComponent={<Pager page={page} pageSize={pageSize} total={total}
          onChange={(p) => { setPage(p); listRef.current?.scrollToOffset({ offset: 0, animated: true }); }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  content: { padding: space.lg, paddingBottom: space.xxxl, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm, padding: space.md },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
});
