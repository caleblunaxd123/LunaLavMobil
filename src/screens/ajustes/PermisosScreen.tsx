import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import {
  crearRolAcceso, eliminarRolAcceso, ETIQUETA_MODULO, getMatrizPermisos, getModulosPermisos, getPermisosFinos, getRolesAcceso,
  guardarMatrizPermisos, renombrarRolAcceso, type PermisoItem, type RolAcceso,
} from '../../api/ajustesApi';
import {
  AppText, BottomBar, Button, Card, Divider, ErrorState, IconButton, InlineAlert, ListSkeleton, Screen, SegmentedControl, Sheet, StackHeader, TextField, toast,
  alerta,
} from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, space } from '../../theme';

const clave = (rolId: number, modulo: string) => `${rolId}::${modulo}`;

/**
 * Roles del negocio y qué ve cada uno: módulos (Pedidos, Caja…) y, dentro de cada módulo, los
 * sub-permisos finos (ver montos, anular, registrar gastos…). El Administrador siempre tiene todo.
 */
export function PermisosScreen({ navigation }: AppScreenProps<'Permisos'>) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const queryClient = useQueryClient();
  const base = ['ajustes', 'permisos', negocioId];
  const roles = useQuery({ queryKey: [...base, 'roles'], queryFn: getRolesAcceso });
  const modulos = useQuery({ queryKey: [...base, 'modulos'], queryFn: getModulosPermisos });
  const finos = useQuery({ queryKey: [...base, 'finos'], queryFn: getPermisosFinos });
  const matriz = useQuery({ queryKey: [...base, 'matriz'], queryFn: getMatrizPermisos });

  // Lo guardado en el servidor + los cambios que el usuario aún no guarda (solo las diferencias).
  const guardado = useMemo(() => new Map((matriz.data ?? []).map((p) => [clave(p.rolId, p.modulo), p.puedeAcceder] as const)), [matriz.data]);
  const [cambios, setCambios] = useState<Map<string, boolean>>(new Map());
  const sucio = cambios.size > 0;
  const [rolId, setRolId] = useState<number | null>(null);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [rolForm, setRolForm] = useState<RolAcceso | null | undefined>(undefined);

  const editables = useMemo(() => (roles.data ?? []).filter((r) => !r.esSistema), [roles.data]);
  const rol = editables.find((r) => r.id === rolId) ?? editables[0] ?? null;

  const tiene = (r: number, m: string) => cambios.get(clave(r, m)) ?? guardado.get(clave(r, m)) ?? false;
  const cambiar = (r: number, m: string) => {
    const k = clave(r, m);
    const nuevo = !tiene(r, m);
    setCambios((prev) => {
      const next = new Map(prev);
      if (nuevo === (guardado.get(k) ?? false)) next.delete(k); else next.set(k, nuevo);
      return next;
    });
  };

  const guardar = useMutation({
    mutationFn: () => {
      const permisos: PermisoItem[] = [];
      for (const r of editables) {
        for (const m of modulos.data ?? []) permisos.push({ rolId: r.id, modulo: m, puedeAcceder: tiene(r.id, m) });
        for (const f of finos.data ?? []) permisos.push({ rolId: r.id, modulo: f.clave, puedeAcceder: tiene(r.id, f.clave) });
      }
      return guardarMatrizPermisos(permisos);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...base, 'matriz'] });
      setCambios(new Map());
      toast('Permisos guardados. Cada usuario los verá en su próximo inicio de sesión.');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const cargando = roles.isLoading || modulos.isLoading || matriz.isLoading;
  const fallo = roles.isError || modulos.isError || matriz.isError;
  const refrescar = () => { void roles.refetch(); void modulos.refetch(); void finos.refetch(); void matriz.refetch(); };
  const finosDe = (m: string) => (finos.data ?? []).filter((f) => f.modulo === m);

  return (
    <Screen>
      <StackHeader title="Roles y permisos" subtitle="Qué puede ver cada rol" onBack={navigation.goBack}
        right={<IconButton icon="add" label="Nuevo rol" tone="primary" onPress={() => setRolForm(null)} />} />
      {cargando ? <View style={styles.pad}><ListSkeleton rows={6} /></View> : fallo ? <ErrorState onRetry={refrescar} />
        : editables.length === 0 || !rol ? (
          <View style={styles.pad}>
            <AppText variant="body">Aún no tienes roles propios. Crea uno (por ejemplo «Cajero») y elige qué puede hacer.</AppText>
            <Button label="Crear rol" icon="add" onPress={() => setRolForm(null)} style={styles.top} />
          </View>
        ) : <>
          <View style={styles.roles}>
            <SegmentedControl<number> value={rol.id} onChange={setRolId} segments={editables.map((r) => ({ value: r.id, label: r.nombre }))} />
          </View>
          <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={matriz.isRefetching} onRefresh={refrescar} tintColor={colors.primary} />}>
            <View style={styles.rolActions}>
              <Button label="Renombrar" icon="create-outline" variant="secondary" size="sm" onPress={() => setRolForm(rol)} />
              <Button label="Eliminar rol" icon="trash-outline" variant="danger" size="sm" disabled={rol.enUso}
                onPress={() => alerta('Eliminar rol', `¿Eliminar el rol «${rol.nombre}»?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Eliminar', style: 'destructive', onPress: async () => {
                    try { await eliminarRolAcceso(rol.id); toast('Rol eliminado'); setRolId(null); void queryClient.invalidateQueries({ queryKey: base }); }
                    catch (e) { toast(apiErrorMessage(e), 'error'); }
                  } },
                ], { icon: 'trash' })} />
            </View>
            {rol.enUso && <AppText variant="caption" style={styles.note}>Este rol tiene usuarios asignados: cámbialos de rol antes de eliminarlo.</AppText>}
            <Card padded={false}>
              {(modulos.data ?? []).map((m, i) => {
                const hijos = finosDe(m);
                const abierto = abiertos.has(m);
                const activos = hijos.filter((f) => tiene(rol.id, f.clave)).length;
                return (
                  <View key={m}>
                    {i > 0 && <Divider inset={space.lg} />}
                    <View style={styles.moduloRow}>
                      <Pressable style={styles.flex} disabled={hijos.length === 0}
                        onPress={() => setAbiertos((s) => { const n = new Set(s); if (n.has(m)) n.delete(m); else n.add(m); return n; })}
                        accessibilityRole="button" accessibilityLabel={`${ETIQUETA_MODULO[m] ?? m}: ${hijos.length} sub-permisos`}>
                        <AppText variant="subheading">{ETIQUETA_MODULO[m] ?? m}</AppText>
                        {hijos.length > 0 && <View style={styles.sub}>
                          <AppText variant="caption">{activos} de {hijos.length} sub-permisos</AppText>
                          <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
                        </View>}
                      </Pressable>
                      <Switch value={tiene(rol.id, m)} onValueChange={() => cambiar(rol.id, m)} accessibilityLabel={`${ETIQUETA_MODULO[m] ?? m} para ${rol.nombre}`}
                        trackColor={{ true: colors.teal, false: colors.borderStrong }} thumbColor="#FFFFFF" />
                    </View>
                    {abierto && hijos.map((f) => (
                      <View key={f.clave} style={styles.finoRow}>
                        <View style={styles.flex}>
                          <AppText variant="body">{f.etiqueta}</AppText>
                          {!!f.descripcion && <AppText variant="caption">{f.descripcion}</AppText>}
                        </View>
                        <Switch value={tiene(rol.id, f.clave)} onValueChange={() => cambiar(rol.id, f.clave)} accessibilityLabel={f.etiqueta}
                          trackColor={{ true: colors.teal, false: colors.borderStrong }} thumbColor="#FFFFFF" />
                      </View>
                    ))}
                  </View>
                );
              })}
            </Card>
            <AppText variant="caption" style={styles.note}>El Administrador siempre tiene todos los permisos y no se edita aquí. Un sub-permiso solo cuenta si el módulo también está activo.</AppText>
            {guardar.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(guardar.error)} />}
          </ScrollView>
          <BottomBar>
            <Button label={sucio ? 'Guardar cambios' : 'Sin cambios'} icon="checkmark" disabled={!sucio} busy={guardar.isPending} onPress={() => guardar.mutate()} />
          </BottomBar>
        </>}
      {rolForm !== undefined && <RolSheet rol={rolForm} onClose={() => setRolForm(undefined)}
        onHecho={() => { void queryClient.invalidateQueries({ queryKey: base }); }} />}
    </Screen>
  );
}

function RolSheet({ rol, onClose, onHecho }: { rol: RolAcceso | null; onClose: () => void; onHecho: () => void }) {
  const [nombre, setNombre] = useState(rol?.nombre ?? '');
  const [touched, setTouched] = useState(false);
  const error = nombre.trim().length < 2 ? 'El nombre debe tener entre 2 y 60 caracteres.' : '';
  const guardar = useMutation({
    mutationFn: async () => { if (rol) await renombrarRolAcceso(rol.id, nombre.trim()); else await crearRolAcceso(nombre.trim()); },
    onSuccess: () => { onHecho(); toast(rol ? 'Rol actualizado' : 'Rol creado: ahora elige qué puede hacer'); onClose(); },
  });
  return (
    <Sheet visible onClose={onClose} title={rol ? 'Renombrar rol' : 'Nuevo rol'}>
      <TextField label="Nombre del rol" placeholder="Ej. Cajero" value={nombre} onChangeText={setNombre} maxLength={60} autoCapitalize="words" autoFocus error={touched ? error : ''} />
      {guardar.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(guardar.error)} />}
      <Button label={rol ? 'Guardar' : 'Crear rol'} icon="checkmark" busy={guardar.isPending} onPress={() => { setTouched(true); if (!error) guardar.mutate(); }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  pad: { padding: space.lg },
  top: { marginTop: space.lg },
  roles: { paddingHorizontal: space.lg, paddingTop: space.sm },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  rolActions: { flexDirection: 'row', gap: space.sm },
  note: { marginTop: 2 },
  moduloRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  finoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.xl + space.lg, paddingRight: space.lg, paddingVertical: space.sm, backgroundColor: colors.surfaceMuted },
});
