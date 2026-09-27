import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import type { Servicio } from '../../api/operationsApi';
import { crearServicioRapido } from '../../api/pedidoApi';
import { normalizeText } from '../../constants/distritos';
import { colors, space } from '../../theme';
import { parseAmount } from '../../utils/format';
import { AppText, Button, Choice, InlineAlert, Sheet, TextField } from '../ui';

/** Unidades de cobro: las mismas que ofrece la web al crear un producto al vuelo. */
export const UNIDADES = [
  { value: 'kg', label: 'Por kilo' },
  { value: 'prenda', label: 'Por prenda' },
  { value: 'pieza', label: 'Por pieza' },
  { value: 'und', label: 'Por unidad' },
  { value: 'servicio', label: 'Por servicio' },
  { value: 'm2', label: 'Por m²' },
];

/**
 * Crear un servicio sin salir del pedido: se guarda en el catálogo del negocio y se devuelve para
 * agregarlo de una vez. Si ya existe uno con el mismo nombre, se reutiliza en vez de duplicarlo.
 */
export function NuevoServicioSheet({ visible, onClose, onCreated, catalogo, nombreInicial = '' }: {
  visible: boolean; onClose: () => void; onCreated: (s: Servicio, yaExistia: boolean) => void; catalogo: Servicio[]; nombreInicial?: string;
}) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState(nombreInicial);
  const [precio, setPrecio] = useState('');
  const [unidad, setUnidad] = useState('prenda');
  const [touched, setTouched] = useState(false);
  const precioNum = parseAmount(precio);
  const errors = {
    nombre: nombre.trim().length < 2 ? 'Escribe el nombre (mínimo 2 letras).' : '',
    precio: !(precioNum > 0) || precioNum > 10_000 ? 'Ingresa un precio entre S/ 0.10 y S/ 10,000.' : '',
  };
  const valid = !errors.nombre && !errors.precio;

  const save = useMutation({
    mutationFn: () => crearServicioRapido(nombre.trim(), Math.round(precioNum * 100) / 100, unidad),
    onSuccess: async (s) => {
      await queryClient.invalidateQueries({ queryKey: ['servicios'] });
      onCreated(s, false);
      reset();
    },
  });

  const reset = () => { setNombre(''); setPrecio(''); setUnidad('prenda'); setTouched(false); save.reset(); };
  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const existente = catalogo.find((s) => normalizeText(s.nombre) === normalizeText(nombre));
    if (existente) { onCreated(existente, true); reset(); return; }
    save.mutate();
  };

  return (
    <Sheet visible={visible} onClose={() => { reset(); onClose(); }} title="Nuevo servicio" subtitle="Se guarda en tu lista de precios y se agrega al pedido">
      <TextField label="Nombre" icon="pricetag-outline" placeholder="Ej. Lavado de edredón 2 plazas" value={nombre} onChangeText={setNombre}
        autoCapitalize="sentences" maxLength={120} autoFocus error={touched ? errors.nombre : ''} />
      <TextField label="Precio" prefix="S/" placeholder="0.00" value={precio} onChangeText={setPrecio} keyboardType="decimal-pad"
        error={touched ? errors.precio : ''} hint="Podrás ajustarlo en cada pedido si hace falta." />
      <View>
        <AppText variant="captionStrong" color={colors.text} style={styles.label}>¿Cómo se cobra?</AppText>
        <View style={styles.choices}>{UNIDADES.map((u) => <Choice key={u.value} label={u.label} selected={unidad === u.value} onPress={() => setUnidad(u.value)} />)}</View>
      </View>
      {save.isError && <InlineAlert text={apiErrorMessage(save.error, 'No se pudo crear el servicio.')} />}
      <Button label="Crear y agregar al pedido" icon="add-circle-outline" onPress={submit} busy={save.isPending} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: space.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
