import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  exportarReporteExcel, getReporte, parseFechaPeru, RANGOS, rangoDe, reporteMeta, type Rango, type RangoPreset,
} from '../api/reportesApi';
import { apiErrorMessage } from '../api/errors';
import {
  AppText, BottomBar, Button, Card, EmptyState, ErrorState, InlineAlert, ListSkeleton, LockedState, Screen, SegmentedControl, StackHeader, TextField, toast,
} from '../components/ui';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { colors, fonts, radius, space } from '../theme';
import { isoDate, shortDateWithYear } from '../utils/format';

/** Para no congelar el teléfono con miles de filas: la tabla muestra las primeras, el Excel trae todas. */
const FILAS_EN_PANTALLA = 150;
const ANCHO_COLUMNA = 132;

export function ReporteDetalleScreen({ navigation, route }: AppScreenProps<'ReporteDetalle'>) {
  const meta = reporteMeta(route.params.clave);
  const can = usePermissions();
  const allowed = can('REPORTES');
  const [preset, setPreset] = useState<RangoPreset>('30d');
  const [desdeTexto, setDesdeTexto] = useState('');
  const [hastaTexto, setHastaTexto] = useState('');
  const [exportando, setExportando] = useState(false);

  const personalizado = useMemo(() => {
    const desde = parseFechaPeru(desdeTexto);
    const hasta = parseFechaPeru(hastaTexto);
    return desde && hasta ? { desde, hasta } : null;
  }, [desdeTexto, hastaTexto]);
  const errorRango = preset === 'personalizado' && (desdeTexto || hastaTexto) && !personalizado ? 'Usa el formato dd/mm/aaaa en ambas fechas.'
    : personalizado && personalizado.desde > personalizado.hasta ? 'La fecha inicial no puede ser posterior a la final.' : '';
  const rango: Rango | null = !meta.usaRango ? { desde: isoDate(new Date()), hasta: isoDate(new Date()) }
    : preset === 'personalizado' ? (errorRango ? null : personalizado) : rangoDe(preset);

  const query = useQuery({
    queryKey: ['reporte', meta.clave, meta.usaRango ? rango?.desde : null, meta.usaRango ? rango?.hasta : null],
    queryFn: () => getReporte(meta.clave, meta.usaRango ? rango! : undefined),
    enabled: allowed && rango != null,
  });

  const exportar = async () => {
    if (!rango) return;
    setExportando(true);
    try { await exportarReporteExcel(meta.clave, rango); }
    catch (error) { toast(error instanceof Error && error.message ? error.message : apiErrorMessage(error), 'error'); }
    finally { setExportando(false); }
  };

  if (!allowed) return <Screen><StackHeader title={meta.titulo} onBack={navigation.goBack} /><View style={styles.content}><LockedState module="ver reportes" /></View></Screen>;

  const data = query.data;
  const filas = data?.filas ?? [];
  const columnas = (data?.columnas ?? []).filter((c) => c !== '_id');
  return (
    <Screen edges={['top']}>
      <StackHeader title={meta.titulo} subtitle={meta.usaRango && rango ? `${shortDateWithYear(rango.desde)} al ${shortDateWithYear(rango.hasta)}` : 'Al día de hoy'} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}>
        <AppText variant="caption">{meta.descripcion}</AppText>

        {meta.usaRango && <>
          <SegmentedControl<RangoPreset> segments={RANGOS} value={preset} onChange={setPreset} />
          {preset === 'personalizado' && <Card>
            <View style={styles.dates}>
              <View style={styles.flex}><TextField label="Desde" placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" value={desdeTexto} onChangeText={setDesdeTexto} maxLength={10} /></View>
              <View style={styles.flex}><TextField label="Hasta" placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" value={hastaTexto} onChangeText={setHastaTexto} maxLength={10} /></View>
            </View>
            {!!errorRango && <InlineAlert tone="warning" title="Revisa las fechas" text={errorRango} />}
          </Card>}
        </>}

        {!rango ? <EmptyState icon="calendar-outline" title="Elige un rango de fechas" text="Escribe las dos fechas para ver el reporte." />
          : query.isLoading ? <ListSkeleton rows={6} />
            : query.isError || !data ? <ErrorState onRetry={() => void query.refetch()} />
              : filas.length === 0 ? <EmptyState icon="document-outline" title="Sin datos en este rango" text="Prueba con otro rango de fechas." />
                : <>
                  <AppText variant="captionStrong">{filas.length} {filas.length === 1 ? 'fila' : 'filas'}{filas.length > FILAS_EN_PANTALLA ? ` · mostrando las primeras ${FILAS_EN_PANTALLA} (el Excel trae todas)` : ''}</AppText>
                  <Card padded={false} style={styles.table}>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View>
                        <View style={[styles.row, styles.head]}>
                          {columnas.map((c) => <AppText key={c} style={[styles.cell, styles.headText]} numberOfLines={2}>{c}</AppText>)}
                        </View>
                        {filas.slice(0, FILAS_EN_PANTALLA).map((f, i) => (
                          <View key={i} style={[styles.row, i % 2 === 1 && styles.zebra]}>
                            {columnas.map((c) => <AppText key={c} style={styles.cell} numberOfLines={3}>{f[c] ?? ''}</AppText>)}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </Card>
                </>}
      </ScrollView>
      <BottomBar>
        <Button label="Exportar a Excel" icon="download-outline" busy={exportando} disabled={!rango || !data || filas.length === 0} onPress={() => void exportar()}
          accessibilityHint="Genera el archivo .xlsx y abre el menú de compartir" />
      </BottomBar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  flex: { flex: 1 },
  dates: { flexDirection: 'row', gap: space.md },
  table: { overflow: 'hidden' },
  row: { flexDirection: 'row' },
  head: { backgroundColor: colors.navy },
  zebra: { backgroundColor: colors.surfaceMuted },
  cell: { width: ANCHO_COLUMNA, paddingHorizontal: space.sm, paddingVertical: space.sm, fontSize: 12, color: colors.text, fontFamily: fonts.regular },
  headText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12, borderRadius: radius.sm },
});
