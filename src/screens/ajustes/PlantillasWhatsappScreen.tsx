import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import { actualizarPlantilla, getPlantillasAdmin, type PlantillaWhatsapp } from '../../api/ajustesApi';
import {
  AppText, Button, Card, ErrorState, InlineAlert, ListSkeleton, Screen, Sheet, StackHeader, TextField, toast,
} from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { colors, space } from '../../theme';

const EVENTOS: Record<string, { titulo: string; cuando: string }> = {
  INGRESO: { titulo: 'Pedido registrado', cuando: 'Al registrar un pedido nuevo' },
  CAMBIO_AREA: { titulo: 'Cambio de etapa', cuando: 'Cuando el pedido pasa a otra área' },
  LISTO: { titulo: 'Pedido listo', cuando: 'Cuando está listo para recoger' },
  EN_RUTA: { titulo: 'Pedido en camino', cuando: 'Cuando sale a reparto a domicilio' },
  DEMORA: { titulo: 'Aviso de demora', cuando: 'Cuando el pedido se retrasa' },
  ENTREGADO: { titulo: 'Pedido entregado', cuando: 'Al entregar el pedido' },
};
const VARIABLES = ['{cliente}', '{numero}', '{negocio}', '{total}', '{saldo}', '{area}', '{entrega}', '{items}', '{seguimiento}'];
const nombreEvento = (e: string) => EVENTOS[e]?.titulo ?? e.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

/** Mensajes de WhatsApp que la app arma para tus clientes en cada momento del pedido. */
export function PlantillasWhatsappScreen({ navigation }: AppScreenProps<'PlantillasWhatsapp'>) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const queryClient = useQueryClient();
  const key = ['ajustes', 'plantillas', negocioId];
  const query = useQuery({ queryKey: key, queryFn: getPlantillasAdmin });
  const [editar, setEditar] = useState<PlantillaWhatsapp | null>(null);
  const toggle = useMutation({
    mutationFn: (p: PlantillaWhatsapp) => actualizarPlantilla({ ...p, activa: !p.activa }),
    onMutate: (p) => queryClient.setQueryData<PlantillaWhatsapp[]>(key, (l) => l?.map((x) => (x.id === p.id ? { ...x, activa: !p.activa } : x))),
    onError: (e) => { toast(apiErrorMessage(e), 'error'); void query.refetch(); },
  });
  return (
    <Screen>
      <StackHeader title="Mensajes de WhatsApp" subtitle="Lo que reciben tus clientes" onBack={navigation.goBack} />
      <FlatList
        data={query.data ?? []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={<AppText variant="caption" style={styles.hint}>Toca un mensaje para editarlo. Las palabras entre llaves, como {'{cliente}'}, se reemplazan solas con los datos del pedido.</AppText>}
        ListEmptyComponent={query.isLoading ? <ListSkeleton /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : null}
        renderItem={({ item: p }) => (
          <Card style={[styles.row, !p.activa && styles.inactive]} onPress={() => setEditar(p)} accessibilityLabel={`Editar mensaje ${nombreEvento(p.evento)}`}>
            <View style={styles.icon}><Ionicons name="logo-whatsapp" size={19} color={p.activa ? colors.teal : colors.muted} /></View>
            <View style={styles.flex}>
              <AppText variant="subheading" numberOfLines={1}>{nombreEvento(p.evento)}</AppText>
              {!!EVENTOS[p.evento] && <AppText variant="caption" numberOfLines={1}>{EVENTOS[p.evento].cuando}</AppText>}
              <AppText variant="caption" color={colors.muted} numberOfLines={2} style={styles.preview}>{p.mensaje}</AppText>
            </View>
            <Switch value={p.activa} onValueChange={() => toggle.mutate(p)} accessibilityLabel={p.activa ? 'Desactivar mensaje' : 'Activar mensaje'}
              trackColor={{ true: colors.teal, false: colors.borderStrong }} thumbColor="#FFFFFF" />
          </Card>
        )}
      />
      {editar && <PlantillaSheet plantilla={editar} onClose={() => setEditar(null)}
        onHecho={() => void queryClient.invalidateQueries({ queryKey: key })} />}
    </Screen>
  );
}

function PlantillaSheet({ plantilla, onClose, onHecho }: { plantilla: PlantillaWhatsapp; onClose: () => void; onHecho: () => void }) {
  const [mensaje, setMensaje] = useState(plantilla.mensaje);
  const [touched, setTouched] = useState(false);
  const error = mensaje.trim().length < 3 ? 'El mensaje debe tener al menos 3 caracteres.' : mensaje.length > 1000 ? 'Máximo 1000 caracteres.' : '';
  const guardar = useMutation({
    mutationFn: () => actualizarPlantilla({ ...plantilla, mensaje: mensaje.trim() }),
    onSuccess: () => { onHecho(); toast('Mensaje actualizado'); onClose(); },
  });
  return (
    <Sheet visible onClose={onClose} title={nombreEvento(plantilla.evento)} subtitle={EVENTOS[plantilla.evento]?.cuando}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        <TextField label="Mensaje" value={mensaje} onChangeText={setMensaje} multiline maxLength={1000} autoFocus textAlignVertical="top"
          style={styles.input} error={touched ? error : ''} hint={`${mensaje.length}/1000`} />
        <AppText variant="caption" color={colors.muted}>Variables que se reemplazan solas: {VARIABLES.join('  ')}</AppText>
        {guardar.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(guardar.error)} />}
      </ScrollView>
      <Button label="Guardar mensaje" icon="checkmark" busy={guardar.isPending} onPress={() => { setTouched(true); if (!error) guardar.mutate(); }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  content: { padding: space.lg, paddingBottom: space.xxxl, flexGrow: 1 },
  hint: { marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm, padding: space.md },
  inactive: { opacity: 0.6 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tealSoft },
  preview: { marginTop: 2 },
  scroll: { maxHeight: 460 },
  sheetContent: { gap: space.md, paddingBottom: space.sm },
  input: { minHeight: 150 },
});
