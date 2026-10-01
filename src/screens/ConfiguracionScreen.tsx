import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Switch, View } from 'react-native';
import { apiErrorMessage } from '../api/errors';
import {
  cambiarEstadoUsuario, getServiciosAdmin, getUsuariosAdmin, type ServicioEditable, type UsuarioAdmin,
} from '../api/gestionApi';
import {
  AppText, Avatar, Badge, Button, Card, Divider, EmptyState, ErrorState, IconButton, ListItem, ListSkeleton, LockedState,
  Pager, Screen, SearchBar, SegmentedControl, StackHeader, toast,
  alerta,
} from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import { usePermissions } from '../hooks/usePermissions';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, space } from '../theme';
import { money } from '../utils/format';
import { useOpenWeb } from '../utils/web';
import { MotorizadosTab } from './config/MotorizadosTab';
import { NegocioTab } from './config/NegocioTab';
import { UsuarioFormSheet } from './ajustes/UsuarioFormSheet';
import { ServicioFormSheet } from './config/ServicioFormSheet';

type Tab = 'servicios' | 'motorizados' | 'negocio' | 'usuarios' | 'mas';
type IconName = keyof typeof Ionicons.glyphMap;

const normalize = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type RutaAjuste = 'Areas' | 'Personal' | 'Sedes' | 'PlantillasWhatsapp' | 'Permisos' | 'CatalogoSimple';
interface AjusteNativo { label: string; hint: string; icon: IconName; ruta: RutaAjuste; params?: { tipo: 'categorias' | 'tipos-gasto' | 'roles-personal' } }

// Ajustes que se editan desde la propia app.
const ajustesNativos: AjusteNativo[] = [
  { label: 'Roles y permisos', hint: 'Qué ve y qué puede hacer cada rol', icon: 'key-outline', ruta: 'Permisos' },
  { label: 'Categorías de servicio', hint: 'Agrupan tu lista de precios', icon: 'albums-outline', ruta: 'CatalogoSimple', params: { tipo: 'categorias' } },
  { label: 'Tipos de gasto', hint: 'Para ordenar los gastos de caja', icon: 'wallet-outline', ruta: 'CatalogoSimple', params: { tipo: 'tipos-gasto' } },
  { label: 'Áreas de lavado', hint: 'Etapas por las que pasa un pedido', icon: 'git-branch-outline', ruta: 'Areas' },
  { label: 'Mensajes de WhatsApp', hint: 'Lo que reciben tus clientes', icon: 'logo-whatsapp', ruta: 'PlantillasWhatsapp' },
  { label: 'Personal', hint: 'Tu equipo de trabajo', icon: 'people-outline', ruta: 'Personal' },
  { label: 'Cargos del personal', hint: 'Cajero, planchador, repartidor…', icon: 'briefcase-outline', ruta: 'CatalogoSimple', params: { tipo: 'roles-personal' } },
  { label: 'Sedes', hint: 'Tus locales', icon: 'storefront-outline', ruta: 'Sedes' },
];

// Conexión con SUNAT y pagos de la suscripción: quedan en la web (certificados, claves y 3D Secure).
const webSettings: { label: string; hint: string; icon: IconName; path: string }[] = [
  { label: 'Facturación electrónica', hint: 'Conexión con SUNAT y certificado digital', icon: 'document-text-outline', path: 'ajustes/facturacion-electronica' },
  { label: 'Suscripción y pagos', hint: 'Tu plan, cobro con tarjeta y pagos en línea', icon: 'card-outline', path: 'ajustes/suscripcion' },
];

export function ConfiguracionScreen({ navigation }: AppScreenProps<'Configuracion'>) {
  const isAdmin = useAuthStore((s) => s.session?.usuario.rol === 'ADMIN');
  const can = usePermissions();
  const openWeb = useOpenWeb();
  const [tab, setTab] = useState<Tab>('servicios');
  // Servicios y usuarios se administran solo con rol ADMIN (igual que en la web).
  const allowed = isAdmin && can('AJUSTES');
  const webButton = <IconButton icon="open-outline" label="Abrir configuración en la web" onPress={() => openWeb('ajustes')} />;

  if (!allowed) return <Screen><StackHeader title="Configuración" onBack={navigation.goBack} /><View style={styles.content}><LockedState module="cambiar la configuración" /></View></Screen>;

  return (
    <Screen>
      <StackHeader title="Configuración" subtitle="Precios, equipo y ajustes" onBack={navigation.goBack} right={webButton} />
      <View style={styles.tabs}>
        <SegmentedControl<Tab> value={tab} onChange={setTab} segments={[
          { value: 'servicios', label: 'Precios' }, { value: 'motorizados', label: 'Reparto' }, { value: 'negocio', label: 'Negocio' },
          { value: 'usuarios', label: 'Equipo' }, { value: 'mas', label: 'Más' },
        ]} />
      </View>
      {tab === 'servicios' ? <ServiciosTab />
        : tab === 'motorizados' ? <MotorizadosTab />
        : tab === 'negocio' ? <NegocioTab />
        : tab === 'usuarios' ? <UsuariosTab />
          : <FlatList data={[0]} keyExtractor={String} contentContainerStyle={styles.content} renderItem={() => <>
            <Card padded={false}>
              {ajustesNativos.map((x, i) => <Fragment key={x.label}>
                {i > 0 && <Divider inset={68} />}
                <ListItem title={x.label} subtitle={x.hint} chevron
                  onPress={() => (x.params ? navigation.navigate('CatalogoSimple', x.params) : navigation.navigate(x.ruta as 'Areas'))}
                  leading={<View style={styles.icon}><Ionicons name={x.icon} size={19} color={colors.navySoft} /></View>} />
              </Fragment>)}
            </Card>
            <AppText variant="caption" style={styles.note}>Se abren en el navegador con tu misma cuenta:</AppText>
            <Card padded={false}>
              {webSettings.map((x, i) => <Fragment key={x.path}>
                {i > 0 && <Divider inset={68} />}
                <ListItem title={x.label} subtitle={x.hint} onPress={() => openWeb(x.path)}
                  leading={<View style={styles.icon}><Ionicons name={x.icon} size={19} color={colors.navySoft} /></View>}
                  trailing={<Ionicons name="open-outline" size={17} color={colors.placeholder} />} />
              </Fragment>)}
            </Card>
          </>} />}
    </Screen>
  );
}

function ServiciosTab() {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const listRef = useRef<FlatList>(null);
  const [texto, setTexto] = useState('');
  // null = cerrado; 'nuevo' = alta de servicio.
  const [editing, setEditing] = useState<ServicioEditable | 'nuevo' | null>(null);
  const query = useQuery({ queryKey: ['servicios-admin', negocioId], queryFn: getServiciosAdmin });
  const filtered = useMemo(() => {
    const t = normalize(texto.trim());
    return (query.data ?? [])
      .filter((s) => !t || normalize(`${s.nombre} ${s.categoriaNombre ?? ''}`).includes(t))
      .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre));
  }, [query.data, texto]);
  const { page, setPage, pageItems, total, pageSize } = usePagination(filtered, 20, texto);

  return <>
    <FlatList
      ref={listRef}
      data={pageItems}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
      ListHeaderComponent={<View style={styles.header}>
        <SearchBar value={texto} onChangeText={setTexto} placeholder="Buscar servicio o categoría" />
        <Button label="Nuevo servicio" icon="add" size="md" onPress={() => setEditing('nuevo')} />
        <AppText variant="caption">Toca un servicio para cambiar su precio, categoría u ocultarlo.</AppText>
      </View>}
      ListEmptyComponent={query.isLoading ? <ListSkeleton /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} />
        : <EmptyState icon="shirt-outline" title={texto ? 'Sin coincidencias' : 'Sin servicios'} text={texto ? 'Prueba con otra palabra.' : 'Agrega tus servicios con su precio para registrar pedidos.'}
          actionLabel={texto ? undefined : 'Crear servicio'} onAction={() => setEditing('nuevo')} />}
      renderItem={({ item: s }) => (
        <Card onPress={() => setEditing(s)} style={[styles.row, !s.activo && styles.inactive]}>
          <View style={styles.flex}>
            <AppText variant="subheading" numberOfLines={1}>{s.nombre}</AppText>
            <AppText variant="caption" numberOfLines={1}>{[s.categoriaNombre, `por ${s.unidad.toLowerCase()}`].filter(Boolean).join(' · ')}</AppText>
          </View>
          {!s.activo && <Badge label="Oculto" tone="neutral" dot={false} />}
          <AppText variant="subheading">{money(s.precio)}</AppText>
        </Card>
      )}
      ListFooterComponent={<Pager page={page} pageSize={pageSize} total={total}
        onChange={(p) => { setPage(p); listRef.current?.scrollToOffset({ offset: 0, animated: true }); }} />}
    />
    {editing && <ServicioFormSheet servicio={editing === 'nuevo' ? null : editing} onClose={() => setEditing(null)} />}
  </>;
}

function UsuariosTab() {
  const [form, setForm] = useState<UsuarioAdmin | null | undefined>(undefined);
  const me = useAuthStore((s) => s.session?.usuario);
  const queryClient = useQueryClient();
  const key = ['usuarios-admin', me?.negocioId];
  const query = useQuery({ queryKey: key, queryFn: getUsuariosAdmin });
  const toggle = useMutation({
    mutationFn: (u: UsuarioAdmin) => cambiarEstadoUsuario(u.id, !u.activo),
    onMutate: (u) => queryClient.setQueryData<UsuarioAdmin[]>(key, (list) => list?.map((x) => (x.id === u.id ? { ...x, activo: !u.activo } : x))),
    onSuccess: (_, u) => toast(u.activo ? `${u.nombreCompleto} ya no puede entrar` : `${u.nombreCompleto} puede volver a entrar`),
    onError: (e) => { toast(apiErrorMessage(e), 'error'); void query.refetch(); },
  });
  const confirm = (u: UsuarioAdmin) => {
    if (!u.activo) { toggle.mutate(u); return; }
    alerta('Desactivar usuario', `${u.nombreCompleto} no podrá iniciar sesión hasta que lo actives otra vez. Sus pedidos y cobros se conservan.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desactivar', style: 'destructive', onPress: () => toggle.mutate(u) },
    ], { tone: 'warning', icon: 'person-remove' });
  };
  const users = [...(query.data ?? [])].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombreCompleto.localeCompare(b.nombreCompleto));

  return (
    <>
    <FlatList
      data={users}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
      ListHeaderComponent={<View style={styles.header}>
        <Button label="Nuevo usuario" icon="person-add-outline" variant="secondary" size="md" onPress={() => setForm(null)} />
      </View>}
      ListEmptyComponent={query.isLoading ? <ListSkeleton /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : null}
      renderItem={({ item: u }) => {
        const self = u.id === me?.id;
        return (
          <Card style={[styles.row, !u.activo && styles.inactive]} onPress={() => setForm(u)} accessibilityLabel={`Editar a ${u.nombreCompleto}`}>
            <Avatar name={u.nombreCompleto} size={40} tone={u.activo ? 'primary' : 'neutral'} />
            <View style={styles.flex}>
              <AppText variant="subheading" numberOfLines={1}>{u.nombreCompleto}{self ? ' (tú)' : ''}</AppText>
              <AppText variant="caption" numberOfLines={1}>@{u.usuario} · {[u.rolNombre, u.sedeNombre].filter(Boolean).join(' · ')}</AppText>
            </View>
            {self ? <Badge label="Activo" tone="success" /> : <Switch value={u.activo} onValueChange={() => confirm(u)}
              accessibilityLabel={u.activo ? `Desactivar a ${u.nombreCompleto}` : `Activar a ${u.nombreCompleto}`}
              trackColor={{ true: colors.teal, false: colors.borderStrong }} thumbColor="#FFFFFF" />}
          </Card>
        );
      }}
    />
    {form !== undefined && <UsuarioFormSheet usuario={form} onClose={() => setForm(undefined)} />}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  tabs: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  content: { padding: space.lg, paddingTop: space.sm, paddingBottom: space.xxxl, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm, padding: space.md },
  inactive: { opacity: 0.6 },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.navySoft}14` },
  note: { marginTop: space.sm, paddingHorizontal: space.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
