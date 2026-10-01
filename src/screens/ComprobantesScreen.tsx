import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../api/errors';
import {
  COMPROBANTES_PAGE, getComprobante, getComprobantes, getKpiComprobantes, sincronizarComprobante, type Comprobante, type FiltroComprobante,
} from '../api/gestionApi';
import {
  AppText, Badge, Button, Card, Divider, EmptyState, ErrorState, IconButton, InlineAlert, ListSkeleton, LockedState, Pager, Screen,
  SearchBar, SegmentedControl, Sheet, StackHeader, toast, type Tone,
} from '../components/ui';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, space } from '../theme';
import { dateTime, money, plural } from '../utils/format';
import { useOpenWeb } from '../utils/web';
import { compartirComprobante, type FormatoComprobante } from '../api/documentosApi';

const tipoLabel: Record<string, string> = {
  BOLETA: 'Boleta', FACTURA: 'Factura', NOTA_CREDITO: 'Nota de crédito', NOTA_DEBITO: 'Nota de débito', GUIA_REMISION: 'Guía de remisión',
};
const estados: Record<string, { label: string; tone: Tone }> = {
  ACEPTADO: { label: 'Aceptado por SUNAT', tone: 'success' },
  PENDIENTE: { label: 'En envío', tone: 'warning' },
  RECHAZADO: { label: 'Rechazado', tone: 'danger' },
  ERROR: { label: 'Con error', tone: 'danger' },
  ANULADO: { label: 'Anulado', tone: 'neutral' },
  SIMULADO: { label: 'De prueba', tone: 'violet' },
};
const estadoDe = (c: Comprobante) => estados[c.estadoAnulacion === 'ACEPTADO' ? 'ANULADO' : c.estado] ?? { label: c.estado, tone: 'neutral' as Tone };
const filtros: { value: FiltroComprobante; label: string }[] = [
  { value: 'todos', label: 'Todos' }, { value: 'ACEPTADO', label: 'Aceptados' }, { value: 'PENDIENTE', label: 'En envío' }, { value: 'RECHAZADO', label: 'Rechazados' },
];

export function ComprobantesScreen({ navigation }: AppScreenProps<'Comprobantes'>) {
  const sedeId = useAuthStore((s) => s.session?.usuario.sedeId);
  const can = usePermissions();
  const openWeb = useOpenWeb();
  const listRef = useRef<FlatList>(null);
  const [filtro, setFiltro] = useState<FiltroComprobante>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const term = useDebouncedValue(busqueda.trim());
  const allowed = can('PEDIDOS');
  const pageKey = `${filtro}|${term}`;
  const [pageState, setPageState] = useState({ page: 1, key: pageKey });
  const page = pageState.key === pageKey ? pageState.page : 1;

  const query = useQuery({
    queryKey: ['comprobantes', sedeId, filtro, term, page],
    queryFn: () => getComprobantes(filtro, term, page),
    enabled: allowed,
    placeholderData: keepPreviousData,
  });
  const kpi = useQuery({ queryKey: ['comprobantes', 'kpi', sedeId], queryFn: getKpiComprobantes, enabled: allowed });
  const mes = kpi.data?.[kpi.data.length - 1];
  const webButton = <IconButton icon="open-outline" label="Abrir facturación en la web" onPress={() => openWeb('facturacion/comprobantes')} />;

  if (!allowed) return <Screen><StackHeader title="Comprobantes" onBack={navigation.goBack} /><View style={styles.content}><LockedState module="ver comprobantes" /></View></Screen>;

  const data = query.data;
  return (
    <Screen>
      <StackHeader title="Comprobantes" subtitle="Boletas y facturas SUNAT" onBack={navigation.goBack} right={webButton} />
      <FlatList
        ref={listRef}
        data={data?.items ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isPlaceholderData} onRefresh={() => { void query.refetch(); void kpi.refetch(); }} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={styles.header}>
          {mes && <Card style={styles.kpi}>
            <View style={styles.kpiCol}>
              <AppText variant="caption">Boletas del mes</AppText>
              <AppText variant="heading">{mes.boletasCantidad}</AppText>
              <AppText variant="caption">{money(mes.boletasMonto)}</AppText>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiCol}>
              <AppText variant="caption">Facturas del mes</AppText>
              <AppText variant="heading">{mes.facturasCantidad}</AppText>
              <AppText variant="caption">{money(mes.facturasMonto)}</AppText>
            </View>
          </Card>}
          <SearchBar value={busqueda} onChangeText={setBusqueda} placeholder="Buscar por número, cliente o RUC/DNI" />
          <SegmentedControl segments={filtros} value={filtro} onChange={setFiltro} />
          {data && <AppText variant="caption">{plural(data.total, 'comprobante', 'comprobantes')}</AppText>}
        </View>}
        ListEmptyComponent={query.isLoading ? <ListSkeleton /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} />
          : <EmptyState icon="document-text-outline" title={term ? 'Sin coincidencias' : 'Sin comprobantes'}
            text={term ? 'Prueba con el número (B001-25), el nombre o el documento del cliente.' : 'Las boletas y facturas se emiten desde el detalle de cada pedido.'} />}
        renderItem={({ item }) => {
          const e = estadoDe(item);
          return (
            <Card onPress={() => setSelected(item.id)} style={styles.row}>
              <View style={styles.rowIcon}><Ionicons name={item.tipo === 'FACTURA' ? 'business-outline' : 'document-text-outline'} size={19} color={colors.navySoft} /></View>
              <View style={styles.flex}>
                <AppText variant="subheading" numberOfLines={1}>{tipoLabel[item.tipo] ?? item.tipo} {item.numeroCompleto}</AppText>
                <AppText variant="caption" numberOfLines={1}>{item.clienteNombre} · {dateTime(item.fechaEmision)}</AppText>
                <View style={styles.badge}><Badge label={e.label} tone={e.tone} /></View>
              </View>
              <AppText variant="subheading">{money(item.total)}</AppText>
            </Card>
          );
        }}
        ListFooterComponent={data ? <Pager page={page} pageSize={COMPROBANTES_PAGE} total={data.total}
          onChange={(p) => { setPageState({ page: p, key: pageKey }); listRef.current?.scrollToOffset({ offset: 0, animated: true }); }} /> : null}
      />
      <ComprobanteSheet id={selected} onClose={() => setSelected(null)}
        onPedido={(id) => { setSelected(null); navigation.navigate('PedidoDetalle', { id }); }}
        onWeb={() => openWeb('facturacion/comprobantes')} />
    </Screen>
  );
}

function ComprobanteSheet({ id, onClose, onPedido, onWeb }: { id: number | null; onClose: () => void; onPedido: (id: number) => void; onWeb: () => void }) {
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ['comprobante', id], queryFn: () => getComprobante(id!), enabled: id != null });
  const sync = useMutation({
    mutationFn: () => sincronizarComprobante(id!),
    onSuccess: (c) => {
      queryClient.setQueryData(['comprobante', id], c);
      void queryClient.invalidateQueries({ queryKey: ['comprobantes'] });
      toast(c.estado === 'ACEPTADO' ? 'SUNAT ya aceptó el comprobante' : 'Estado actualizado');
    },
  });
  const [descargando, setDescargando] = useState<FormatoComprobante | null>(null);
  const descargar = async (formato: FormatoComprobante) => {
    if (!c) return;
    setDescargando(formato);
    try { await compartirComprobante(c.id, c.numeroCompleto, formato); }
    catch (error) { toast(error instanceof Error && error.message ? error.message : 'No se pudo descargar el archivo.', 'error'); }
    finally { setDescargando(null); }
  };
  const c = detail.data;
  const e = c ? estadoDe(c) : null;
  return (
    <Sheet visible={id != null} onClose={onClose} title={c ? `${tipoLabel[c.tipo] ?? c.tipo} ${c.numeroCompleto}` : 'Comprobante'}
      subtitle={c ? `${c.clienteNombre}${c.clienteNumDoc ? ` · ${c.clienteNumDoc}` : ''}` : undefined}>
      {detail.isLoading ? <ListSkeleton rows={2} /> : detail.isError || !c ? <ErrorState onRetry={() => void detail.refetch()} /> : <>
        <View style={styles.sheetTop}>
          <Badge label={e!.label} tone={e!.tone} />
          <AppText variant="caption">{dateTime(c.fechaEmision)}</AppText>
        </View>
        <Card padded={false}>
          {c.detalles.slice(0, 4).map((d, i) => <View key={d.numeroLinea}>
            {i > 0 && <Divider inset={space.lg} />}
            <View style={styles.line}>
              <AppText variant="body" style={styles.flex} numberOfLines={1}>{Number(d.cantidad.toFixed(2))} × {d.descripcion}</AppText>
              <AppText variant="subheading">{money(d.total)}</AppText>
            </View>
          </View>)}
          {c.detalles.length > 4 && <AppText variant="caption" style={styles.more}>y {plural(c.detalles.length - 4, 'línea más', 'líneas más')}</AppText>}
          <Divider />
          <View style={styles.line}><AppText variant="caption" style={styles.flex}>IGV incluido</AppText><AppText variant="caption">{money(c.igv)}</AppText></View>
          <View style={styles.line}><AppText variant="bodyStrong" style={styles.flex}>Total</AppText><AppText variant="heading">{money(c.total)}</AppText></View>
        </Card>
        {!!c.descripcionRespuestaSunat && c.estado !== 'ACEPTADO' && <InlineAlert tone={c.estado === 'PENDIENTE' ? 'warning' : 'danger'} title="Respuesta de SUNAT" text={c.descripcionRespuestaSunat} />}
        {c.esSimulado && <InlineAlert tone="info" text="Comprobante de prueba: no se envió a SUNAT." />}
        {sync.isError && <InlineAlert title="No se pudo consultar" text={apiErrorMessage(sync.error)} />}
        <View style={styles.actions}>
          {c.estado === 'PENDIENTE' && <Button label="Consultar estado en SUNAT" icon="refresh" variant="secondary" size="md" busy={sync.isPending} onPress={() => sync.mutate()} />}
          <Button label={`Ver pedido${c.pedidoNumero ? ` #${c.pedidoNumero}` : ''}`} icon="receipt-outline" variant="secondary" size="md" onPress={() => onPedido(c.pedidoId)} />
          <View style={styles.downloads}>
            <Button label="PDF" icon="document-outline" variant="secondary" size="md" style={styles.flex} busy={descargando === 'pdf'} disabled={descargando !== null} onPress={() => void descargar('pdf')} />
            {!c.esSimulado && <Button label="XML" icon="code-slash-outline" variant="secondary" size="md" style={styles.flex} busy={descargando === 'xml'} disabled={descargando !== null} onPress={() => void descargar('xml')} />}
            {c.estado === 'ACEPTADO' && !c.esSimulado && <Button label="CDR" icon="shield-checkmark-outline" variant="secondary" size="md" style={styles.flex} busy={descargando === 'cdr'} disabled={descargando !== null} onPress={() => void descargar('cdr')} />}
          </View>
          <Button label="Anular o nota de crédito en la web" icon="open-outline" variant="ghost" size="md" onPress={onWeb} />
        </View>
      </>}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.md },
  kpi: { flexDirection: 'row', alignItems: 'center' },
  kpiCol: { flex: 1, gap: 2 },
  kpiDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border, marginHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm, padding: space.md },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  badge: { flexDirection: 'row', marginTop: 4 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm + 2 },
  more: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  actions: { gap: space.sm },
  downloads: { flexDirection: 'row', gap: space.sm },
});
