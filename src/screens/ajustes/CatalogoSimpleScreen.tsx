import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import {
  categoriasApi, rolesPersonalApi, tiposGastoApi, type CategoriaServicio, type CrudApi, type RolPersonal, type TipoGasto,
} from '../../api/ajustesApi';
import { confirmarBorrado, ListaAdmin } from '../../components/ajustes/ListaAdmin';
import { Button, InlineAlert, Sheet, TextField, toast } from '../../components/ui';
import { useCrudAdmin } from '../../hooks/useCrudAdmin';
import type { AppScreenProps } from '../../navigation/types';
import { space } from '../../theme';

type Item = { id: number; nombre: string; enUso?: boolean } & ({ activa: boolean } | { activo: boolean });
const esActivo = (x: Item) => ('activa' in x ? x.activa : x.activo);
const conEstado = (x: Item, activo: boolean): Item => ('activa' in x ? { ...x, activa: activo } : { ...x, activo });

interface Config {
  titulo: string;
  subtitulo: string;
  singular: string;
  /** Con su artículo: «Nueva categoría», «Nuevo cargo». */
  nuevo: string;
  vacioTitulo: string;
  placeholder: string;
  vacioTexto: string;
  icono: 'albums-outline' | 'wallet-outline' | 'people-outline';
  api: CrudApi<CategoriaServicio> | CrudApi<TipoGasto> | CrudApi<RolPersonal>;
  /** Nombre del campo de estado en lo que devuelve y recibe el servidor. */
  campoActivo: 'activa' | 'activo';
  max: number;
}

const CONFIG: Record<'categorias' | 'tipos-gasto' | 'roles-personal', Config> = {
  categorias: {
    titulo: 'Categorías de servicio', subtitulo: 'Agrupan tu lista de precios', singular: 'categoría', nuevo: 'Nueva categoría', vacioTitulo: 'Sin categorías', placeholder: 'Ej. Edredones',
    vacioTexto: 'Crea categorías para ordenar tus servicios (ropa, hogar, calzado…).', icono: 'albums-outline',
    api: categoriasApi, campoActivo: 'activa', max: 80,
  },
  'tipos-gasto': {
    titulo: 'Tipos de gasto', subtitulo: 'Para ordenar los gastos de caja', singular: 'tipo de gasto', nuevo: 'Nuevo tipo de gasto', vacioTitulo: 'Sin tipos de gasto', placeholder: 'Ej. Detergente',
    vacioTexto: 'Crea tipos de gasto para clasificar lo que sale de la caja.', icono: 'wallet-outline',
    api: tiposGastoApi, campoActivo: 'activo', max: 80,
  },
  'roles-personal': {
    titulo: 'Cargos del personal', subtitulo: 'Para tu lista de empleados', singular: 'cargo', nuevo: 'Nuevo cargo', vacioTitulo: 'Sin cargos', placeholder: 'Ej. Planchador',
    vacioTexto: 'Crea los cargos de tu equipo (cajero, planchador, repartidor…).', icono: 'people-outline',
    api: rolesPersonalApi, campoActivo: 'activo', max: 60,
  },
};

export function CatalogoSimpleScreen({ navigation, route }: AppScreenProps<'CatalogoSimple'>) {
  const cfg = CONFIG[route.params.tipo];
  const api = cfg.api as CrudApi<Item>;
  const { query, toggle, refrescar } = useCrudAdmin<Item>(route.params.tipo, api, esActivo, conEstado);
  // undefined = cerrado, null = nuevo, Item = editar
  const [form, setForm] = useState<Item | null | undefined>(undefined);
  const items = [...(query.data ?? [])].sort((a, b) => Number(esActivo(b)) - Number(esActivo(a)) || a.nombre.localeCompare(b.nombre));

  return (
    <>
      <ListaAdmin<Item> titulo={cfg.titulo} subtitulo={cfg.subtitulo} onBack={navigation.goBack} datos={items}
        cargando={query.isLoading} error={query.isError} onReintentar={() => void query.refetch()}
        refrescando={query.isRefetching} onRefrescar={() => void query.refetch()}
        vista={(x) => ({ titulo: x.nombre, activo: esActivo(x), icono: cfg.icono, etiquetas: x.enUso ? [{ label: 'En uso', tone: 'primary' }] : [] })}
        onEditar={setForm} onToggle={(x) => toggle.mutate(x)} onNuevo={() => setForm(null)} nuevoLabel={cfg.nuevo}
        vacioTitulo={cfg.vacioTitulo} vacioTexto={cfg.vacioTexto} />
      {form !== undefined && <NombreSheet cfg={cfg} api={api} item={form} onClose={() => setForm(undefined)} onHecho={() => void refrescar()} />}
    </>
  );
}

function NombreSheet({ cfg, api, item, onClose, onHecho }: { cfg: Config; api: CrudApi<Item>; item: Item | null; onClose: () => void; onHecho: () => void }) {
  const [nombre, setNombre] = useState(item?.nombre ?? '');
  const [touched, setTouched] = useState(false);
  const error = nombre.trim().length < 2 ? 'Escribe al menos 2 letras.' : '';
  const guardar = useMutation({
    mutationFn: async () => {
      const cuerpo = { nombre: nombre.trim(), [cfg.campoActivo]: item ? esActivo(item) : true } as unknown as Partial<Item>;
      if (item) await api.actualizar(item.id, cuerpo);
      else await api.crear(cuerpo);
    },
    onSuccess: () => { onHecho(); toast(item ? 'Cambios guardados' : `Se agregó «${nombre.trim()}»`); onClose(); },
  });
  const borrar = useMutation({
    mutationFn: () => api.borrar(item!.id),
    onSuccess: (r) => { onHecho(); toast(r.mensaje || 'Listo'); onClose(); },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  return (
    <Sheet visible onClose={onClose} title={item ? `Editar ${cfg.singular}` : cfg.nuevo}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Nombre" placeholder={cfg.placeholder} value={nombre} onChangeText={setNombre} maxLength={cfg.max} autoCapitalize="sentences"
          autoFocus={!item} error={touched ? error : ''} />
        {guardar.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(guardar.error)} />}
      </ScrollView>
      <Button label={item ? 'Guardar cambios' : `Crear ${cfg.singular}`} icon="checkmark" busy={guardar.isPending}
        onPress={() => { setTouched(true); if (!error) guardar.mutate(); }} />
      {item && <Button label={item.enUso ? 'Desactivar' : 'Eliminar'} icon="trash-outline" variant="ghost" size="sm" busy={borrar.isPending}
        onPress={() => confirmarBorrado(item.nombre, item.enUso, () => borrar.mutate())} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 300 },
  content: { gap: space.md, paddingBottom: space.sm },
});
