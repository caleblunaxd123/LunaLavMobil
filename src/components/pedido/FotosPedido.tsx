import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import { api } from '../../api/http';
import { eliminarFoto, fotoPath, getFotos, MAX_FOTOS, subirFoto, type FotoPedido, type MomentoFoto } from '../../api/pedidoApi';
import { colors, radius, space } from '../../theme';
import { dateTime } from '../../utils/format';
import { alerta, AppText, Badge, Button, Choice, toast } from '../ui';
import { pickPhoto } from './FotosPicker';

const MOMENTOS: { value: MomentoFoto; label: string }[] = [
  { value: 'RECEPCION', label: 'Recepción' }, { value: 'ENTREGA', label: 'Entrega' }, { value: 'OTRO', label: 'Otro' },
];

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** La foto requiere el token de la sesión: se descarga con el cliente autenticado y se muestra en memoria. */
function useFotoUri(pedidoId: number, fotoId: number) {
  return useQuery({
    queryKey: ['foto-pedido', pedidoId, fotoId],
    queryFn: async () => {
      const res = await api.get<ArrayBuffer>(fotoPath(pedidoId, fotoId), { responseType: 'arraybuffer', timeout: 30_000 });
      const type = String(res.headers['content-type'] ?? 'image/jpeg');
      return `data:${type};base64,${toBase64(res.data)}`;
    },
    staleTime: Infinity,
  });
}

function Thumb({ pedidoId, foto, onOpen }: { pedidoId: number; foto: FotoPedido; onOpen: (uri: string, foto: FotoPedido) => void }) {
  const uri = useFotoUri(pedidoId, foto.id);
  return (
    <Pressable onPress={() => uri.data && onOpen(uri.data, foto)} style={styles.thumb} accessibilityLabel={`Foto de ${foto.momento.toLowerCase()}`}>
      {uri.data ? <Image source={{ uri: uri.data }} style={styles.img} /> : uri.isError
        ? <Ionicons name="image-outline" size={24} color={colors.placeholder} /> : <ActivityIndicator color={colors.primary} />}
      <View style={styles.tag}><AppText style={styles.tagText}>{MOMENTOS.find((m) => m.value === foto.momento)?.label ?? foto.momento}</AppText></View>
    </Pressable>
  );
}

/** Evidencia fotográfica del pedido: al recibir, al entregar u otro momento. */
export function FotosPedido({ pedidoId, editable }: { pedidoId: number; editable: boolean }) {
  const queryClient = useQueryClient();
  const fotos = useQuery({ queryKey: ['pedido', pedidoId, 'fotos'], queryFn: () => getFotos(pedidoId) });
  const [momento, setMomento] = useState<MomentoFoto>('RECEPCION');
  const [ampliada, setAmpliada] = useState<{ uri: string; foto: FotoPedido } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId, 'fotos'] });

  const subir = useMutation({
    mutationFn: async (source: 'camera' | 'library') => {
      const uri = await pickPhoto(source);
      if (!uri) return false;
      await subirFoto(pedidoId, uri, momento);
      return true;
    },
    onSuccess: async (ok) => { if (ok) { await refresh(); toast('Foto guardada'); } },
    onError: (e) => toast(apiErrorMessage(e, 'No se pudo subir la foto.'), 'error'),
  });
  const borrar = useMutation({
    mutationFn: (fotoId: number) => eliminarFoto(pedidoId, fotoId),
    onSuccess: async () => { setAmpliada(null); await refresh(); toast('Foto eliminada'); },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const lista = fotos.data ?? [];
  const lleno = lista.length >= MAX_FOTOS;
  return (
    <View style={styles.wrap}>
      {fotos.isLoading ? <ActivityIndicator color={colors.primary} /> : lista.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {lista.map((f) => <Thumb key={f.id} pedidoId={pedidoId} foto={f} onOpen={(uri, foto) => setAmpliada({ uri, foto })} />)}
        </ScrollView>
      ) : <AppText variant="caption">Aún no hay fotos. Fotografía manchas o daños: te protege ante reclamos.</AppText>}
      {editable && !lleno && <>
        <View style={styles.choices}>{MOMENTOS.map((m) => <Choice key={m.value} label={m.label} selected={momento === m.value} onPress={() => setMomento(m.value)} />)}</View>
        <View style={styles.actions}>
          <Button label="Tomar foto" icon="camera-outline" size="md" variant="secondary" onPress={() => subir.mutate('camera')} busy={subir.isPending} style={styles.flex} />
          <Button label="Galería" icon="images-outline" size="md" variant="secondary" onPress={() => subir.mutate('library')} disabled={subir.isPending} style={styles.flex} />
        </View>
      </>}
      {lleno && <AppText variant="caption">Llegaste al máximo de {MAX_FOTOS} fotos por pedido.</AppText>}

      <Modal visible={!!ampliada} transparent animationType="fade" onRequestClose={() => setAmpliada(null)}>
        <View style={styles.viewer}>
          {ampliada && <Image source={{ uri: ampliada.uri }} style={styles.full} resizeMode="contain" />}
          <View style={styles.viewerBar}>
            {ampliada && <Badge label={`${MOMENTOS.find((m) => m.value === ampliada.foto.momento)?.label} · ${dateTime(ampliada.foto.fechaSubida)}`} tone="neutral" dot={false} />}
            <View style={styles.flex} />
            {editable && ampliada && <Pressable accessibilityLabel="Eliminar foto" hitSlop={10} onPress={() => alerta('Eliminar foto', '¿Seguro? No se puede deshacer.', [
              { text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => borrar.mutate(ampliada.foto.id) },
            ], { icon: 'image' })}><Ionicons name="trash-outline" size={24} color="#FFFFFF" /></Pressable>}
            <Pressable onPress={() => setAmpliada(null)} accessibilityLabel="Cerrar" hitSlop={10}><Ionicons name="close" size={28} color="#FFFFFF" /></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: space.md },
  row: { gap: space.sm },
  thumb: { width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  img: { width: '100%', height: '100%' },
  tag: { position: 'absolute', left: 4, bottom: 4, backgroundColor: 'rgba(0,36,94,0.75)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  tagText: { color: '#FFFFFF', fontSize: 10 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
  viewerBar: { position: 'absolute', top: 48, left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.lg },
});
