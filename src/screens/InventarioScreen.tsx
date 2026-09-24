import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../api/errors';
import { getInsumos, METODOS_PAGO, registrarMovimientoInsumo, type Insumo, type MetodoPago, type TipoMovimientoInsumo } from '../api/operationsApi';
import {
  AppText, Badge, Button, Card, Choice, EmptyState, ErrorState, InlineAlert, ListSkeleton, LockedState, Pager, Screen,
  SearchBar, SegmentedControl, Sheet, StackHeader, TextField, toast,
} from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, radius, space } from '../theme';
import { methodLabel, parseAmount, shortDate } from '../utils/format';

type Filtro = 'todos' | 'bajo' | 'favoritos';
const isLow = (i: Insumo) => i.stockMinimo > 0 && i.stockActual <= i.stockMinimo;
const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function InventarioScreen({ navigation }: AppScreenProps<'Inventario'>) {
  const sedeId = useAuthStore((s) => s.session?.usuario.sedeId);
  const isAdmin = useAuthStore((s) => s.session?.usuario.rol === 'ADMIN');
  const can = usePermissions();
  const listRef = useRef<FlatList>(null);
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [selected, setSelected] = useState<Insumo | null>(null);
  const allowed = can('INVENTARIO');
  const query = useQuery({ queryKey: ['insumos', sedeId], queryFn: getInsumos, enabled: allowed });

  const activos = useMemo(() => (query.data ?? []).filter((i) => i.activo)
    .sort((a, b) => Number(isLow(b)) - Number(isLow(a)) || Number(b.favorito) - Number(a.favorito) || a.nombre.localeCompare(b.nombre)), [query.data]);
  const filtered = useMemo(() => {
    const t = texto.trim().toLowerCase();
    return activos.filter((i) => (filtro === 'todos' || (filtro === 'bajo' ? isLow(i) : i.favorito)) && (!t || i.nombre.toLowerCase().includes(t)));
  }, [activos, filtro, texto]);
  const { page, setPage, pageItems, total, pageSize } = usePagination(filtered, 15, `${filtro}-${texto}`);
  const lowCount = activos.filter(isLow).length;

  if (!allowed) return <Screen><StackHeader title="Inventario" onBack={navigation.goBack} /><View style={styles.content}><LockedState module="ver el inventario" /></View></Screen>;

  return (
    <Screen>
      <StackHeader title="Inventario" subtitle={query.data ? `${activos.length} insumos activos` : undefined} onBack={navigation.goBack} />
      <FlatList
        ref={listRef}
        data={pageItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={styles.header}>
          {lowCount > 0 && <InlineAlert tone="warning" title={`${lowCount} ${lowCount === 1 ? 'insumo necesita' : 'insumos necesitan'} reposición`}
            text="Están en o por debajo de su stock mínimo. Registra la compra cuando los repongas." />}
          <SearchBar value={texto} onChangeText={setTexto} placeholder="Buscar insumo" />
          <SegmentedControl<Filtro> value={filtro} onChange={setFiltro} segments={[
            { value: 'todos', label: 'Todos', count: activos.length },
            { value: 'bajo', label: 'Stock bajo', count: lowCount },
            { value: 'favoritos', label: 'Favoritos' },
          ]} />
        </View>}
        ListEmptyComponent={query.isLoading ? <ListSkeleton /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} />
          : <EmptyState icon="cube-outline" title={filtro === 'bajo' ? 'Todo con buen stock' : 'Sin insumos'}
            text={filtro === 'bajo' ? 'Ningún insumo está por debajo de su mínimo.' : 'Crea tu catálogo de insumos desde LunaLav web (Inventario).'} />}
        renderItem={({ item }) => <InsumoCard insumo={item} onPress={() => setSelected(item)} />}
        ListFooterComponent={<Pager page={page} pageSize={pageSize} total={total}
          onChange={(p) => { setPage(p); listRef.current?.scrollToOffset({ offset: 0, animated: true }); }} />}
      />
      <MovimientoSheet insumo={selected} isAdmin={isAdmin} onClose={() => setSelected(null)} />
    </Screen>
  );
}

function InsumoCard({ insumo, onPress }: { insumo: Insumo; onPress: () => void }) {
  const low = isLow(insumo);
  const ratio = insumo.stockMinimo > 0 ? Math.min(1, insumo.stockActual / (insumo.stockMinimo * 2)) : 1;
  const tint = low ? colors.danger : ratio < 0.75 ? colors.warning : colors.success;
  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={`${insumo.nombre}, stock ${qty(insumo.stockActual)} ${insumo.unidadMedida}`}>
      <View style={styles.cardTop}>
        <View style={[styles.icon, { backgroundColor: low ? colors.dangerSoft : colors.primarySoft }]}>
          <Ionicons name={insumo.clase === 'EQUIPO' ? 'hardware-chip-outline' : 'flask-outline'} size={20} color={low ? colors.danger : colors.primary} />
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <AppText variant="subheading" numberOfLines={1} style={styles.flexShrink}>{insumo.nombre}</AppText>
            {insumo.favorito && <Ionicons name="star" size={14} color="#F5A623" />}
          </View>
          <AppText variant="caption">{insumo.ultimaCompra ? `Última compra: ${shortDate(insumo.ultimaCompra)}` : 'Sin compras registradas'}</AppText>
        </View>
        <View style={styles.stock}>
          <AppText variant="heading" color={low ? colors.danger : colors.text}>{qty(insumo.stockActual)}</AppText>
          <AppText variant="caption">{insumo.unidadMedida.toLowerCase()}</AppText>
        </View>
      </View>
      {insumo.stockMinimo > 0 && <View style={styles.meterRow}>
        <View style={styles.meter}><View style={[styles.meterFill, { width: `${Math.max(4, ratio * 100)}%`, backgroundColor: tint }]} /></View>
        {low ? <Badge label="Reponer" tone="danger" /> : <AppText variant="caption">Mín. {qty(insumo.stockMinimo)}</AppText>}
      </View>}
    </Card>
  );
}

function MovimientoSheet({ insumo, isAdmin, onClose }: { insumo: Insumo | null; isAdmin: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<TipoMovimientoInsumo>('COMPRA');
  const [cantidad, setCantidad] = useState('');
  const [costo, setCosto] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const cantidadNum = parseAmount(cantidad);
  const costoNum = costo.trim() ? parseAmount(costo) : 0;
  const valid = cantidadNum > 0 && Number.isFinite(costoNum) && (tipo !== 'CONSUMO' || !insumo || cantidadNum <= insumo.stockActual);

  const reset = () => { setTipo('COMPRA'); setCantidad(''); setCosto(''); setMetodo('EFECTIVO'); save.reset(); };
  const close = () => { reset(); onClose(); };
  const save = useMutation({
    mutationFn: () => registrarMovimientoInsumo(insumo!.id, {
      tipo, cantidad: cantidadNum,
      costoTotal: tipo === 'COMPRA' && costoNum > 0 ? costoNum : undefined,
      metodoPago: tipo === 'COMPRA' && costoNum > 0 ? metodo : undefined,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['insumos'] });
      if (tipo === 'COMPRA' && costoNum > 0) await queryClient.invalidateQueries({ queryKey: ['caja'] });
      toast(tipo === 'COMPRA' ? 'Compra registrada' : 'Uso registrado');
      close();
    },
  });

  return (
    <Sheet visible={!!insumo} onClose={close} title={insumo?.nombre ?? ''}
      subtitle={insumo ? `Stock actual: ${qty(insumo.stockActual)} ${insumo.unidadMedida.toLowerCase()}` : undefined}>
      {isAdmin && <View style={styles.choices}>
        <Choice label="Compra (entra)" icon="add-circle-outline" selected={tipo === 'COMPRA'} onPress={() => setTipo('COMPRA')} />
        <Choice label="Uso (sale)" icon="remove-circle-outline" selected={tipo === 'CONSUMO'} onPress={() => setTipo('CONSUMO')} />
      </View>}
      <TextField label={`Cantidad (${insumo?.unidadMedida.toLowerCase() ?? ''})`} icon="cube-outline" placeholder="0" value={cantidad}
        onChangeText={setCantidad} keyboardType="decimal-pad" autoFocus
        error={tipo === 'CONSUMO' && insumo && cantidadNum > insumo.stockActual ? `Solo hay ${qty(insumo.stockActual)} disponibles.` : ''} />
      {tipo === 'COMPRA' && <>
        <TextField label="Costo total" optional prefix="S/" placeholder="0.00" value={costo} onChangeText={setCosto} keyboardType="decimal-pad"
          hint="Si indicas el costo, también se registra como gasto en la caja de hoy." />
        {costoNum > 0 && <View style={styles.choices}>
          {METODOS_PAGO.map((m) => <Choice key={m} label={methodLabel(m)} selected={metodo === m} onPress={() => setMetodo(m)} />)}
        </View>}
      </>}
      {save.isError && <InlineAlert text={apiErrorMessage(save.error)} />}
      <Button label={tipo === 'COMPRA' ? 'Registrar compra' : 'Registrar uso'} icon="checkmark" onPress={() => save.mutate()} disabled={!valid} busy={save.isPending} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.md },
  card: { marginBottom: space.sm, gap: space.md, padding: space.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stock: { alignItems: 'flex-end' },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meter: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: '#EEF1F5', overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: radius.pill },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
