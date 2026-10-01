import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MAX_FOTOS } from '../../api/pedidoApi';
import { colors, radius, space } from '../../theme';
import { alerta, AppText } from '../ui';

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false };

/** Toma una foto o la elige de la galería; devuelve la uri local o null si se canceló. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<string | null> {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    alerta('Permiso necesario', source === 'camera'
      ? 'Activa el acceso a la cámara en los ajustes del teléfono para fotografiar las prendas.'
      : 'Activa el acceso a tus fotos en los ajustes del teléfono.', undefined,
    { tone: 'warning', icon: source === 'camera' ? 'camera' : 'images' });
    return null;
  }
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(PICK_OPTIONS)
    : await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS);
  return result.canceled ? null : result.assets[0]?.uri ?? null;
}

/** Fotos de evidencia antes de guardar: se suben al registrar el pedido. */
export function FotosPicker({ uris, onChange }: { uris: string[]; onChange: (uris: string[]) => void }) {
  const add = async (source: 'camera' | 'library') => {
    if (uris.length >= MAX_FOTOS) { alerta('Límite de fotos', `Puedes adjuntar hasta ${MAX_FOTOS} fotos por pedido.`, undefined, { tone: 'warning', icon: 'images' }); return; }
    const uri = await pickPhoto(source);
    if (uri) onChange([...uris, uri]);
  };
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Pressable onPress={() => void add('camera')} style={styles.add} accessibilityRole="button" accessibilityLabel="Tomar foto">
          <Ionicons name="camera" size={24} color={colors.primary} /><AppText variant="captionStrong" color={colors.primary}>Cámara</AppText>
        </Pressable>
        <Pressable onPress={() => void add('library')} style={styles.add} accessibilityRole="button" accessibilityLabel="Elegir de la galería">
          <Ionicons name="images" size={24} color={colors.primary} /><AppText variant="captionStrong" color={colors.primary}>Galería</AppText>
        </Pressable>
        {uris.map((u, i) => (
          <View key={u} style={styles.thumbWrap}>
            <Image source={{ uri: u }} style={styles.thumb} />
            <Pressable onPress={() => onChange(uris.filter((_, j) => j !== i))} style={styles.remove} hitSlop={8} accessibilityLabel="Quitar foto">
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <AppText variant="caption">{uris.length ? `${uris.length} de ${MAX_FOTOS} fotos · se suben al registrar` : 'Fotografía manchas o daños al recibir las prendas: te protege ante reclamos.'}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { gap: space.sm },
  add: { width: 84, height: 84, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.primarySoft },
  thumbWrap: { width: 84, height: 84 },
  thumb: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.border },
  remove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
});
