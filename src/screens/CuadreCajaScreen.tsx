import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../api/errors';
import {
  getCuadreDelUsuario, getMovimientosUsuario, getUltimoCuadreAnterior, getUsuariosDelDia, guardarCuadre, type CuadreCaja,
} from '../api/gestionApi';
import {
  AppText, Badge, Button, Card, Choice, Divider, ErrorState, IconButton, InlineAlert, ListSkeleton, LockedState,
  Screen, Section, StackHeader, TextField, toast,
} from '../components/ui';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, radius, space } from '../theme';
import { dateTime, isoDate, money, parseAmount } from '../utils/format';
import { useOpenWeb } from '../utils/web';

const toText = (n: number) => (n ? n.toFixed(2) : '');

export function CuadreCajaScreen({ navigation }: AppScreenProps<'CuadreCaja'>) {
  const usuario = useAuthStore((s) => s.session!.usuario);
  const isAdmin = usuario.rol === 'ADMIN';
  const can = usePermissions();
  const openWeb = useOpenWeb();
  const queryClient = useQueryClient();
  const [day, setDay] = useState(() => new Date());
  const fecha = isoDate(day);
  const isToday = fecha === isoDate(new Date());
  const [usuarioId, setUsuarioId] = useState(usuario.id);
  const allowed = can('CAJA');

  // El administrador puede cuadrar a cualquier colaborador que movió caja ese día.
  const equipo = useQuery({ queryKey: ['cuadre', 'equipo', usuario.sedeId, fecha], queryFn: () => getUsuariosDelDia(fecha), enabled: allowed && isAdmin });
  const movs = useQuery({ queryKey: ['cuadre', 'movs', usuario.sedeId, fecha, usuarioId], queryFn: () => getMovimientosUsuario(fecha, usuarioId), enabled: allowed });
  const cuadre = useQuery({ queryKey: ['cuadre', 'guardado', usuario.sedeId, fecha, usuarioId], queryFn: () => getCuadreDelUsuario(fecha, usuarioId), enabled: allowed });
  const anterior = useQuery({ queryKey: ['cuadre', 'anterior', usuario.sedeId, fecha], queryFn: () => getUltimoCuadreAnterior(fecha), enabled: allowed });

  const totals = useMemo(() => {
    const list = movs.data ?? [];
    const sum = (tipo: string, metodos: string[]) => list.filter((m) => m.tipo === tipo && metodos.includes(m.metodoPago)).reduce((a, m) => a + m.monto, 0);
    return {
      efectivo: sum('INGRESO', ['EFECTIVO']),
      gastos: sum('GASTO', ['EFECTIVO']),
      digital: sum('INGRESO', ['YAPE', 'PLIN', 'TRANSFERENCIA']),
      tarjeta: sum('INGRESO', ['POS', 'TARJETA']),
      count: list.length,
    };
  }, [movs.data]);

  const shift = (days: number) => setDay((d) => { const n = new Date(d); n.setDate(d.getDate() + days); return n; });
  const webButton = <IconButton icon="open-outline" label="Abrir cuadre en la web" onPress={() => openWeb('cuadre-caja')} />;

  if (!allowed) return <Screen><StackHeader title="Cuadre de caja" onBack={navigation.goBack} /><View style={styles.content}><LockedState module="cuadrar la caja" /></View></Screen>;

  const colaboradores = (equipo.data ?? []).some((u) => u.id === usuario.id)
    ? equipo.data!
    : [{ id: usuario.id, nombreCompleto: usuario.nombreCompleto, rolNombre: '', movimientos: 0, tieneCuadre: false }, ...(equipo.data ?? [])];
  const loading = movs.isLoading || cuadre.isLoading;
  const failed = movs.isError || cuadre.isError;
  const refetchAll = () => { void movs.refetch(); void cuadre.refetch(); void anterior.refetch(); void equipo.refetch(); };

  return (
    <Screen>
      <StackHeader title="Cuadre de caja" subtitle="Cierre del día" onBack={navigation.goBack} right={webButton} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={movs.isRefetching} onRefresh={refetchAll} tintColor={colors.primary} />}>
        <View style={styles.dayBar}>
          <DayButton icon="chevron-back" label="Día anterior" onPress={() => shift(-1)} />
          <View style={styles.dayCenter}>
            <AppText variant="subheading">{isToday ? 'Hoy' : day.toLocaleDateString('es-PE', { weekday: 'long' })}</AppText>
            <AppText variant="caption">{day.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</AppText>
          </View>
          <DayButton icon="chevron-forward" label="Día siguiente" onPress={() => shift(1)} disabled={isToday} />
        </View>

        {isAdmin && colaboradores.length > 1 && <View style={styles.choices}>
          {colaboradores.map((u) => <Choice key={u.id} label={`${u.id === usuario.id ? 'Yo' : u.nombreCompleto.split(' ')[0]}${u.tieneCuadre ? ' ✓' : ''}`}
            selected={usuarioId === u.id} onPress={() => setUsuarioId(u.id)} />)}
        </View>}

        {loading ? <ListSkeleton rows={4} /> : failed ? <ErrorState onRetry={refetchAll} /> : cuadre.data
          ? <CuadreGuardado c={cuadre.data} onPrint={() => openWeb('cuadre-caja')} />
          : <CuadreForm key={`${fecha}-${usuarioId}`} totals={totals} sugerido={anterior.data?.cajaFinal ?? 0}
            onSave={async (form) => {
              const saved = await guardarCuadre({ fecha, usuarioId, ...form });
              queryClient.setQueryData(['cuadre', 'guardado', usuario.sedeId, fecha, usuarioId], saved);
              void queryClient.invalidateQueries({ queryKey: ['cuadre', 'equipo'] });
              toast('Cuadre guardado');
            }} />}
      </ScrollView>
    </Screen>
  );
}

function CuadreForm({ totals, sugerido, onSave }: {
  totals: { efectivo: number; gastos: number; digital: number; tarjeta: number; count: number };
  sugerido: number;
  onSave: (form: { cajaInicial: number; totalContado: number; corte: number; nota?: string }) => Promise<void>;
}) {
  const [inicial, setInicial] = useState(toText(sugerido));
  const [contado, setContado] = useState('');
  const [corte, setCorte] = useState('');
  const [nota, setNota] = useState('');
  const num = (t: string) => (t.trim() ? parseAmount(t) : 0);
  const cajaInicial = num(inicial);
  const totalContado = num(contado);
  const corteN = num(corte);
  const esperado = (Number.isFinite(cajaInicial) ? cajaInicial : 0) + totals.efectivo - totals.gastos;
  const diferencia = totalContado - esperado;
  const invalid = [cajaInicial, totalContado, corteN].some((n) => !Number.isFinite(n));
  const corteError = !invalid && corteN > totalContado ? 'No puede ser mayor que el efectivo contado' : undefined;
  const cuadra = Math.abs(diferencia) < 0.005;

  const save = useMutation({ mutationFn: () => onSave({ cajaInicial, totalContado, corte: corteN, nota: nota.trim() || undefined }) });
  const confirm = () => {
    const detalle = cuadra ? 'La caja cuadra exacto.' : `Hay ${diferencia > 0 ? 'un sobrante' : 'un faltante'} de ${money(Math.abs(diferencia))}.`;
    Alert.alert('Guardar cuadre', `${detalle}\nDespués de guardarlo ya no se puede editar.`, [
      { text: 'Revisar', style: 'cancel' },
      { text: 'Guardar', onPress: () => save.mutate() },
    ]);
  };

  return (
    <>
      <Section title="Lo que dice el sistema">
        <Card padded={false}>
          <Line label="Caja inicial" value={money(Number.isFinite(cajaInicial) ? cajaInicial : 0)} />
          <Divider inset={space.lg} />
          <Line label="Cobros en efectivo" value={`+${money(totals.efectivo)}`} tint={colors.success} />
          <Divider inset={space.lg} />
          <Line label="Gastos en efectivo" value={`−${money(totals.gastos)}`} tint={colors.danger} />
          <Divider inset={space.lg} />
          <Line label="Efectivo esperado" value={money(esperado)} strong />
        </Card>
        <AppText variant="caption" style={styles.note}>
          Además cobraste {money(totals.digital)} por Yape, Plin o transferencia y {money(totals.tarjeta)} con tarjeta; no entran al conteo de efectivo.
        </AppText>
      </Section>

      <Section title="Tu conteo">
        <Card style={styles.form}>
          <TextField label="Caja inicial" prefix="S/" keyboardType="decimal-pad" value={inicial} onChangeText={setInicial} placeholder="0.00"
            hint={sugerido > 0 ? `Sugerido: lo que quedó en el último cuadre (${money(sugerido)})` : undefined} />
          <TextField label="Efectivo contado" prefix="S/" keyboardType="decimal-pad" value={contado} onChangeText={setContado} placeholder="0.00"
            hint="Todo el efectivo que hay ahora en la caja" />
          <TextField label="Corte" optional prefix="S/" keyboardType="decimal-pad" value={corte} onChangeText={setCorte} placeholder="0.00"
            hint="Efectivo que retiras o entregas al cerrar" error={corteError} />
          <TextField label="Nota" optional value={nota} onChangeText={setNota} placeholder="Ej. Faltante por vuelto mal dado" maxLength={300} autoCapitalize="sentences" />
        </Card>
      </Section>

      {contado.trim() !== '' && !invalid && <View style={[styles.result, { backgroundColor: cuadra ? colors.successSoft : diferencia > 0 ? colors.warningSoft : colors.dangerSoft }]}>
        <Ionicons name={cuadra ? 'checkmark-circle' : 'alert-circle'} size={24} color={cuadra ? colors.success : diferencia > 0 ? colors.warning : colors.danger} />
        <View style={styles.flex}>
          <AppText variant="subheading">{cuadra ? 'La caja cuadra' : diferencia > 0 ? `Sobran ${money(diferencia)}` : `Faltan ${money(-diferencia)}`}</AppText>
          <AppText variant="caption">Quedará en caja {money(totalContado - corteN)} para mañana.</AppText>
        </View>
      </View>}
      {save.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(save.error)} />}
      <Button label="Guardar cuadre" icon="checkmark" onPress={confirm} disabled={invalid || !contado.trim() || !!corteError} busy={save.isPending} />
    </>
  );
}

function CuadreGuardado({ c, onPrint }: { c: CuadreCaja; onPrint: () => void }) {
  const cuadra = Math.abs(c.diferencia) < 0.005;
  return (
    <>
      <Card style={styles.savedHead}>
        <Badge label="Cuadre cerrado" tone="success" />
        <AppText variant="caption">{c.usuarioNombre ? `${c.usuarioNombre} · ` : ''}guardado {dateTime(c.fechaCreacion)}</AppText>
      </Card>
      <Card padded={false}>
        <Line label="Caja inicial" value={money(c.cajaInicial)} />
        <Divider inset={space.lg} />
        <Line label="Cobros en efectivo" value={`+${money(c.pedidosPagadosEfect)}`} tint={colors.success} />
        <Divider inset={space.lg} />
        <Line label="Gastos en efectivo" value={`−${money(c.gastos)}`} tint={colors.danger} />
        <Divider inset={space.lg} />
        <Line label="Efectivo contado" value={money(c.totalContado)} strong />
        <Divider inset={space.lg} />
        <Line label={cuadra ? 'Diferencia' : c.diferencia > 0 ? 'Sobrante' : 'Faltante'} value={money(Math.abs(c.diferencia))}
          tint={cuadra ? colors.success : c.diferencia > 0 ? colors.warning : colors.danger} strong />
        <Divider inset={space.lg} />
        <Line label="Corte" value={money(c.corte)} />
        <Divider inset={space.lg} />
        <Line label="Queda en caja" value={money(c.cajaFinal)} />
        <Divider inset={space.lg} />
        <Line label="Yape, Plin y transferencia" value={money(c.ingresosDigital)} />
        <Divider inset={space.lg} />
        <Line label="Tarjeta" value={money(c.ingresosTarjeta)} />
      </Card>
      {!!c.nota && <InlineAlert tone="info" title="Nota" text={c.nota} />}
      <Button label="Imprimir en la web" icon="print-outline" variant="secondary" size="md" onPress={onPrint} />
    </>
  );
}

function Line({ label, value, tint, strong }: { label: string; value: string; tint?: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <AppText variant={strong ? 'bodyStrong' : 'body'} style={styles.flex}>{label}</AppText>
      <AppText variant={strong ? 'heading' : 'subheading'} color={tint}>{value}</AppText>
    </View>
  );
}

function DayButton({ icon, label, onPress, disabled }: { icon: 'chevron-back' | 'chevron-forward'; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.dayButton, disabled && styles.disabled, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl, gap: space.lg },
  dayBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 6 },
  dayCenter: { flex: 1, alignItems: 'center' },
  dayButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.7 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  note: { marginTop: space.sm, paddingHorizontal: space.xs },
  form: { gap: space.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  result: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
  savedHead: { gap: space.xs },
});
