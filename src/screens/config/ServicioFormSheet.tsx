import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import {
  actualizarServicio, crearCategoria, crearServicioAdmin, eliminarServicio, getCategorias, type ServicioEditable,
} from '../../api/gestionApi';
import { UNIDADES } from '../../components/pedido/NuevoServicioSheet';
import { alerta, AppText, Button, Choice, InlineAlert, Sheet, TextField, toast } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { colors, space } from '../../theme';
import { money, parseAmount } from '../../utils/format';

/**
 * Crear o editar un servicio de la lista de precios: nombre, precio, costo, unidad de cobro,
 * categoría y si está disponible. Se puede crear una categoría nueva sin salir.
 */
export function ServicioFormSheet({ servicio, onClose }: { servicio: ServicioEditable | null; onClose: () => void }) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const queryClient = useQueryClient();
  const categorias = useQuery({ queryKey: ['categorias', negocioId], queryFn: getCategorias });
  const [nombre, setNombre] = useState(servicio?.nombre ?? '');
  const [precio, setPrecio] = useState(servicio ? servicio.precio.toFixed(2) : '');
  const [costo, setCosto] = useState(servicio?.costo ? servicio.costo.toFixed(2) : '');
  const [unidad, setUnidad] = useState(servicio?.unidad ?? 'prenda');
  const [categoriaId, setCategoriaId] = useState<number | null>(servicio?.categoriaId ?? null);
  const [activo, setActivo] = useState(servicio?.activo ?? true);
  const [nuevaCat, setNuevaCat] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const precioNum = parseAmount(precio);
  const costoNum = costo.trim() ? parseAmount(costo) : 0;
  const errors = {
    nombre: nombre.trim().length < 2 ? 'Escribe el nombre del servicio.' : '',
    precio: !(precioNum > 0) || precioNum > 10_000 ? 'Ingresa un precio entre S/ 0.01 y S/ 10,000.' : '',
    costo: !Number.isFinite(costoNum) || costoNum < 0 || costoNum > 10_000 ? 'El costo no es válido.' : '',
  };
  const valid = !errors.nombre && !errors.precio && !errors.costo && unidad.trim().length > 0;
  const unidades = UNIDADES.some((u) => u.value === unidad) ? UNIDADES : [...UNIDADES, { value: unidad, label: `Por ${unidad}` }];

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['servicios-admin'] }),
    queryClient.invalidateQueries({ queryKey: ['servicios'] }),
  ]);
  const save = useMutation({
    mutationFn: async () => {
      const data = { nombre: nombre.trim(), precio: Math.round(precioNum * 100) / 100, costo: Math.round(costoNum * 100) / 100, unidad, categoriaId, activo };
      if (servicio) await actualizarServicio({ ...servicio, ...data });
      else await crearServicioAdmin(data);
    },
    onSuccess: async () => { await refresh(); toast(servicio ? 'Servicio actualizado' : `«${nombre.trim()}» agregado a tu lista de precios`); onClose(); },
  });
  const borrar = useMutation({
    mutationFn: () => eliminarServicio(servicio!.id),
    onSuccess: async (r) => { await refresh(); toast(r.mensaje, r.eliminado ? 'success' : 'info'); onClose(); },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const addCat = useMutation({
    mutationFn: (n: string) => crearCategoria(n),
    onSuccess: async (c) => { await queryClient.invalidateQueries({ queryKey: ['categorias'] }); setCategoriaId(c.id); setNuevaCat(null); },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const confirmDelete = () => alerta('Eliminar servicio', servicio?.enUso
    ? 'Este servicio ya se usó en pedidos: se ocultará para nuevos pedidos y se conserva el historial.'
    : '¿Eliminar este servicio de tu lista de precios?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: servicio?.enUso ? 'Ocultar' : 'Eliminar', style: 'destructive', onPress: () => borrar.mutate() },
  ], servicio?.enUso ? { tone: 'warning', icon: 'eye-off' } : { icon: 'trash' });

  const margen = precioNum > 0 && costoNum > 0 ? Math.round(((precioNum - costoNum) / precioNum) * 100) : null;
  return (
    <Sheet visible onClose={onClose} title={servicio ? 'Editar servicio' : 'Nuevo servicio'} subtitle={servicio ? servicio.categoriaNombre ?? undefined : 'Aparecerá al registrar pedidos'}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Nombre" icon="pricetag-outline" placeholder="Ej. Lavado al seco – Terno" value={nombre} onChangeText={setNombre}
          maxLength={120} autoCapitalize="sentences" autoFocus={!servicio} error={touched ? errors.nombre : ''} />
        <View>
          <AppText variant="captionStrong" color={colors.text} style={styles.label}>¿Cómo se cobra?</AppText>
          <View style={styles.choices}>{unidades.map((u) => <Choice key={u.value} label={u.label} selected={unidad === u.value} onPress={() => setUnidad(u.value)} />)}</View>
        </View>
        <View style={styles.row}>
          <View style={styles.flex}><TextField label={`Precio por ${unidad}`} prefix="S/" keyboardType="decimal-pad" value={precio} onChangeText={setPrecio}
            error={touched ? errors.precio : ''} /></View>
          <View style={styles.flex}><TextField label="Costo" optional prefix="S/" keyboardType="decimal-pad" value={costo} onChangeText={setCosto}
            error={touched ? errors.costo : ''} hint={margen != null ? `Margen ${margen}%` : 'Insumos y mano de obra'} /></View>
        </View>
        <View>
          <AppText variant="captionStrong" color={colors.text} style={styles.label}>Categoría</AppText>
          <View style={styles.choices}>
            <Choice label="Sin categoría" selected={categoriaId == null} onPress={() => setCategoriaId(null)} />
            {(categorias.data ?? []).filter((c) => c.activa || c.id === categoriaId).map((c) =>
              <Choice key={c.id} label={c.nombre} selected={categoriaId === c.id} onPress={() => setCategoriaId(c.id)} />)}
            {nuevaCat == null && <Choice label="Nueva" icon="add" selected={false} onPress={() => setNuevaCat('')} />}
          </View>
          {nuevaCat != null && <View style={[styles.row, styles.gapTop]}>
            <View style={styles.flex}><TextField label="Nueva categoría" placeholder="Ej. Edredones" value={nuevaCat} onChangeText={setNuevaCat} autoFocus maxLength={80} /></View>
            <Button label="Crear" size="md" variant="secondary" onPress={() => addCat.mutate(nuevaCat.trim())} busy={addCat.isPending}
              disabled={nuevaCat.trim().length < 2} style={styles.btnTop} />
          </View>}
        </View>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText variant="subheading">Disponible para nuevos pedidos</AppText>
            <AppText variant="caption">{activo ? 'Aparece al registrar un pedido' : 'Queda oculto, sin borrar su historial'}</AppText>
          </View>
          <Switch value={activo} onValueChange={setActivo} trackColor={{ true: colors.teal, false: colors.borderStrong }} thumbColor="#FFFFFF" />
        </View>
        {servicio && <AppText variant="caption">Los pedidos ya registrados mantienen el precio con el que se cobraron. Precio actual: {money(servicio.precio)}.</AppText>}
        {save.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(save.error)} />}
      </ScrollView>
      <Button label={servicio ? 'Guardar cambios' : 'Crear servicio'} icon="checkmark" busy={save.isPending}
        onPress={() => { setTouched(true); if (valid) save.mutate(); }} />
      {servicio && <Button label={servicio.enUso ? 'Ocultar servicio' : 'Eliminar servicio'} icon="trash-outline" variant="ghost" size="sm"
        onPress={confirmDelete} busy={borrar.isPending} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { maxHeight: 480 },
  content: { gap: space.md, paddingBottom: space.sm },
  label: { marginBottom: space.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  gapTop: { marginTop: space.sm },
  btnTop: { marginTop: 24 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
