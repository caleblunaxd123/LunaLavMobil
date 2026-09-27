import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Switch, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import { cambiarEstadoMotorizado, getMotorizadosTodos, guardarMotorizado, type MotorizadoAdmin } from '../../api/gestionApi';
import { AppText, Avatar, Button, Card, EmptyState, ErrorState, InlineAlert, ListSkeleton, Sheet, TextField, toast } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { colors, space } from '../../theme';
import { celularValido } from '../../utils/validation';

/** Repartidores de la sede: los que se asignan a pedidos de recojo y delivery. */
export function MotorizadosTab() {
  const sedeId = useAuthStore((s) => s.session?.usuario.sedeId);
  const queryClient = useQueryClient();
  const key = ['motorizados-admin', sedeId];
  const query = useQuery({ queryKey: key, queryFn: getMotorizadosTodos });
  const [editing, setEditing] = useState<MotorizadoAdmin | null>(null);
  const toggle = useMutation({
    mutationFn: (m: MotorizadoAdmin) => cambiarEstadoMotorizado(m.id, !m.activo),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['motorizados'] }); await query.refetch(); },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const list = [...(query.data ?? [])].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre));

  return <>
    <FlatList data={list} keyExtractor={(m) => String(m.id)} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
      ListHeaderComponent={<View style={styles.header}>
        <Button label="Nuevo motorizado" icon="add" size="md" onPress={() => setEditing({ id: 0, nombre: '', celular: '', activo: true })} />
        <AppText variant="caption">Asígnalos a pedidos de recojo o delivery. Les envías la ruta por WhatsApp y el cliente sigue su ubicación en vivo.</AppText>
      </View>}
      ListEmptyComponent={query.isLoading ? <ListSkeleton /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} />
        : <EmptyState icon="bicycle-outline" title="Sin motorizados" text="Agrega a las personas que hacen tus recojos y entregas." />}
      renderItem={({ item: m }) => (
        <Card onPress={() => setEditing(m)} style={[styles.row, !m.activo && styles.inactive]}>
          <Avatar name={m.nombre} size={40} tone={m.activo ? 'violet' : 'neutral'} />
          <View style={styles.flex}>
            <AppText variant="subheading" numberOfLines={1}>{m.nombre}</AppText>
            <AppText variant="caption">{m.celular || 'Sin celular'}</AppText>
          </View>
          <Switch value={m.activo} onValueChange={() => toggle.mutate(m)} accessibilityLabel={m.activo ? `Desactivar a ${m.nombre}` : `Activar a ${m.nombre}`}
            trackColor={{ true: colors.teal, false: colors.borderStrong }} thumbColor="#FFFFFF" />
        </Card>
      )} />
    {editing && <MotorizadoSheet motorizado={editing} onClose={() => setEditing(null)}
      onSaved={async () => { await queryClient.invalidateQueries({ queryKey: ['motorizados'] }); await query.refetch(); setEditing(null); }} />}
  </>;
}

function MotorizadoSheet({ motorizado, onClose, onSaved }: { motorizado: MotorizadoAdmin; onClose: () => void; onSaved: () => Promise<void> }) {
  const [nombre, setNombre] = useState(motorizado.nombre);
  const [celular, setCelular] = useState(motorizado.celular ?? '');
  const [touched, setTouched] = useState(false);
  const errors = {
    nombre: nombre.trim().length < 2 ? 'Escribe el nombre.' : '',
    celular: celular.trim() && !celularValido(celular) ? 'Solo números (y + con código de país).' : '',
  };
  const save = useMutation({
    mutationFn: () => guardarMotorizado({ ...motorizado, nombre: nombre.trim(), celular: celular.replace(/\s/g, '') }),
    onSuccess: async () => { toast(motorizado.id ? 'Motorizado actualizado' : 'Motorizado agregado'); await onSaved(); },
  });
  return (
    <Sheet visible onClose={onClose} title={motorizado.id ? 'Editar motorizado' : 'Nuevo motorizado'}>
      <TextField label="Nombre" icon="person-outline" value={nombre} onChangeText={setNombre} autoCapitalize="words" maxLength={120} autoFocus={!motorizado.id}
        error={touched ? errors.nombre : ''} />
      <TextField label="Celular / WhatsApp" optional icon="logo-whatsapp" value={celular} onChangeText={(v) => setCelular(v.replace(/[^\d+\s]/g, ''))}
        keyboardType="phone-pad" maxLength={20} error={touched ? errors.celular : ''} hint="Para enviarle la ruta de cada entrega." />
      {save.isError && <InlineAlert text={apiErrorMessage(save.error)} />}
      <Button label="Guardar" icon="checkmark" busy={save.isPending} onPress={() => { setTouched(true); if (!errors.nombre && !errors.celular) save.mutate(); }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  content: { padding: space.lg, paddingTop: space.sm, paddingBottom: space.xxxl, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm, padding: space.md },
  inactive: { opacity: 0.6 },
});
