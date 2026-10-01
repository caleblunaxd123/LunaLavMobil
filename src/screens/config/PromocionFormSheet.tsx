import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import {
  actualizarPromocion, crearPromocion, eliminarPromocion, getServiciosAdmin, type Promocion, type PromocionPayload,
} from '../../api/gestionApi';
import { parseFechaPeru } from '../../api/reportesApi';
import { alerta, AppText, Button, Choice, InlineAlert, Sheet, TextField, toast } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { colors, space } from '../../theme';
import { fechaPeru, parseAmount } from '../../utils/format';

type Tipo = PromocionPayload['tipo'];
const TIPOS: { value: Tipo; label: string; hint: string }[] = [
  { value: 'VOLUMEN', label: 'Por volumen', hint: 'Descuento al llevar una cantidad mínima.' },
  { value: 'FRECUENCIA', label: 'Cliente frecuente', hint: 'Premia a quienes vuelven.' },
  { value: 'FIJA', label: 'Descuento fijo', hint: 'Se aplica siempre que esté vigente.' },
  { value: 'CODIGO', label: 'Código', hint: 'El cliente lo dicta al pagar.' },
];

/** Crear o editar una promoción o código de descuento, con las mismas reglas que valida la API. */
export function PromocionFormSheet({ promocion, onClose }: { promocion: Promocion | null; onClose: () => void }) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const queryClient = useQueryClient();
  const servicios = useQuery({ queryKey: ['servicios-admin', negocioId], queryFn: getServiciosAdmin });
  const editable = (TIPOS.some((t) => t.value === promocion?.tipo) ? promocion?.tipo : null) as Tipo | null;

  const [tipo, setTipo] = useState<Tipo>(editable ?? (promocion?.codigo ? 'CODIGO' : 'VOLUMEN'));
  const [descripcion, setDescripcion] = useState(promocion?.descripcion ?? '');
  const [porcentaje, setPorcentaje] = useState(promocion ? !promocion.descuentoMonto : true);
  const [valor, setValor] = useState(promocion ? String(Number((promocion.descuentoPct ?? promocion.descuentoMonto ?? 0).toFixed(2))) : '');
  const [servicioId, setServicioId] = useState<number | null>(promocion?.servicioId ?? null);
  const [minima, setMinima] = useState(String(promocion?.cantidadMinima ?? 1));
  const [desde, setDesde] = useState(fechaPeru(promocion?.fechaInicio));
  const [hasta, setHasta] = useState(fechaPeru(promocion?.fechaFin));
  const [codigo, setCodigo] = useState(promocion?.codigo ?? '');
  const [maxUsos, setMaxUsos] = useState(promocion?.maxUsos != null ? String(promocion.maxUsos) : '');
  const [activa, setActiva] = useState(promocion?.activa ?? true);
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => {
    const v = parseAmount(valor);
    const min = parseAmount(minima);
    const fi = desde.trim() ? parseFechaPeru(desde) : null;
    const ff = hasta.trim() ? parseFechaPeru(hasta) : null;
    const usos = maxUsos.trim() ? Number(maxUsos) : null;
    return {
      descripcion: descripcion.trim().length < 3 ? 'Escribe una descripción (mínimo 3 letras).' : '',
      valor: !(v > 0) ? 'Indica un descuento mayor a cero.' : porcentaje && v > 100 ? 'El porcentaje no puede pasar de 100.' : !porcentaje && v > 100_000 ? 'El monto es demasiado alto.' : '',
      minima: !(min >= 0.01) ? 'La cantidad mínima debe ser al menos 0.01.' : '',
      desde: desde.trim() && !fi ? 'Usa dd/mm/aaaa.' : '',
      hasta: hasta.trim() && !ff ? 'Usa dd/mm/aaaa.' : fi && ff && ff < fi ? 'No puede ser anterior a la fecha inicial.' : '',
      codigo: tipo === 'CODIGO' && !codigo.trim() ? 'Escribe el código que dictará el cliente.' : codigo.trim() && !/^[A-Za-z0-9_-]{3,30}$/.test(codigo.trim()) ? 'Usa 3 a 30 letras o números, sin espacios.' : '',
      maxUsos: usos != null && (!Number.isInteger(usos) || usos < 1) ? 'Debe ser un número entero mayor a cero.' : '',
    };
  }, [descripcion, valor, porcentaje, minima, desde, hasta, codigo, maxUsos, tipo]);
  const valid = Object.values(errors).every((e) => !e);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['promociones'] });
  const save = useMutation({
    mutationFn: async () => {
      const v = Math.round(parseAmount(valor) * 100) / 100;
      const payload: PromocionPayload = {
        tipo, descripcion: descripcion.trim(),
        descuentoPct: porcentaje ? v : null, descuentoMonto: porcentaje ? null : v,
        servicioId, cantidadMinima: parseAmount(minima),
        fechaInicio: desde.trim() ? parseFechaPeru(desde) : null, fechaFin: hasta.trim() ? parseFechaPeru(hasta) : null,
        activa, codigo: codigo.trim() ? codigo.trim().toUpperCase() : null, maxUsos: maxUsos.trim() ? Number(maxUsos) : null,
      };
      if (promocion) await actualizarPromocion(promocion.id, payload);
      else await crearPromocion(payload);
    },
    onSuccess: async () => { await refresh(); toast(promocion ? 'Promoción actualizada' : 'Promoción creada'); onClose(); },
  });
  const borrar = useMutation({
    mutationFn: () => eliminarPromocion(promocion!.id),
    onSuccess: async () => { await refresh(); toast('Promoción eliminada'); onClose(); },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const confirmDelete = () => alerta('Eliminar promoción', '¿Eliminar esta promoción? Los pedidos ya registrados no cambian. Si solo quieres detenerla, pausa con el interruptor.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => borrar.mutate() },
  ], { icon: 'pricetag' });

  const tipoActual = TIPOS.find((t) => t.value === tipo);
  return (
    <Sheet visible onClose={onClose} title={promocion ? 'Editar promoción' : 'Nueva promoción'} subtitle={tipoActual?.hint}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <AppText variant="captionStrong" color={colors.text} style={styles.label}>Tipo</AppText>
          <View style={styles.choices}>{TIPOS.map((t) => <Choice key={t.value} label={t.label} selected={tipo === t.value} onPress={() => setTipo(t.value)} />)}</View>
        </View>
        <TextField label="Descripción" icon="pricetag-outline" placeholder="Ej. 10% en edredones de temporada" value={descripcion} onChangeText={setDescripcion}
          maxLength={200} autoCapitalize="sentences" autoFocus={!promocion} error={touched ? errors.descripcion : ''} />
        <View>
          <AppText variant="captionStrong" color={colors.text} style={styles.label}>Tipo de descuento</AppText>
          <View style={styles.choices}>
            <Choice label="Porcentaje (%)" selected={porcentaje} onPress={() => setPorcentaje(true)} />
            <Choice label="Monto fijo (S/)" selected={!porcentaje} onPress={() => setPorcentaje(false)} />
          </View>
        </View>
        <TextField label={porcentaje ? 'Descuento' : 'Descuento en soles'} prefix={porcentaje ? '%' : 'S/'} keyboardType="decimal-pad" value={valor} onChangeText={setValor}
          error={touched ? errors.valor : ''} />
        <View>
          <AppText variant="captionStrong" color={colors.text} style={styles.label}>Aplica a</AppText>
          <View style={styles.choices}>
            <Choice label="Todos los servicios" selected={servicioId == null} onPress={() => setServicioId(null)} />
            {(servicios.data ?? []).filter((s) => s.activo || s.id === servicioId).map((s) =>
              <Choice key={s.id} label={s.nombre} selected={servicioId === s.id} onPress={() => setServicioId(s.id)} />)}
          </View>
        </View>
        <TextField label="Cantidad mínima" keyboardType="decimal-pad" value={minima} onChangeText={setMinima} error={touched ? errors.minima : ''}
          hint="Prendas o kilos necesarios para que se aplique." />
        <View style={styles.row}>
          <View style={styles.flex}><TextField label="Vigente desde" optional placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" value={desde} onChangeText={setDesde} maxLength={10} error={touched ? errors.desde : ''} /></View>
          <View style={styles.flex}><TextField label="Hasta" optional placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" value={hasta} onChangeText={setHasta} maxLength={10} error={touched ? errors.hasta : ''} /></View>
        </View>
        <TextField label="Código" icon="ticket-outline" optional={tipo !== 'CODIGO'} placeholder="Ej. VERANO10" autoCapitalize="characters" value={codigo} onChangeText={(v) => setCodigo(v.toUpperCase())}
          maxLength={30} error={touched ? errors.codigo : ''} hint={tipo === 'CODIGO' ? 'Lo escribe el cliente o el cajero al registrar el pedido.' : undefined} />
        <TextField label="Máximo de usos" optional keyboardType="number-pad" value={maxUsos} onChangeText={(v) => setMaxUsos(v.replace(/\D/g, ''))} maxLength={6}
          error={touched ? errors.maxUsos : ''} hint="Con 1 se usa una sola vez y se desactiva sola." />
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText variant="subheading">Activa</AppText>
            <AppText variant="caption">{activa ? 'Se aplica a los pedidos nuevos' : 'Pausada: no se aplica'}</AppText>
          </View>
          <Switch value={activa} onValueChange={setActiva} trackColor={{ true: colors.teal, false: colors.borderStrong }} thumbColor="#FFFFFF" />
        </View>
        {save.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(save.error)} />}
      </ScrollView>
      <Button label={promocion ? 'Guardar cambios' : 'Crear promoción'} icon="checkmark" busy={save.isPending}
        onPress={() => { setTouched(true); if (valid) save.mutate(); }} />
      {promocion && <Button label="Eliminar promoción" icon="trash-outline" variant="ghost" size="sm" onPress={confirmDelete} busy={borrar.isPending} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { maxHeight: 520 },
  content: { gap: space.md, paddingBottom: space.sm },
  label: { marginBottom: space.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
