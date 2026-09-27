import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import { buscarDireccion, direccionDePunto, type ResultadoGeo } from '../../api/pedidoApi';
import { DISTRITOS, matchDistrito, normalizeText } from '../../constants/distritos';
import { colors, radius, space } from '../../theme';
import { AppText, Button, Card, Divider, InlineAlert, SearchBar, Sheet, TextField } from '../ui';
import { MapView } from './MapView';

export interface Destino {
  direccion: string;
  distrito: string;
  referencia: string;
  latitud: number | null;
  longitud: number | null;
  /** El punto del mapa corresponde a la dirección escrita (lo resolvió el mapa o lo confirmó el usuario). */
  confirmada: boolean;
}

export const destinoVacio = (direccion = ''): Destino => ({ direccion, distrito: '', referencia: '', latitud: null, longitud: null, confirmada: false });

/** Lo mismo que exige la web y el backend para un Delivery. */
export function destinoError(d: Destino) {
  if (d.direccion.trim().length < 4) return 'Escribe la dirección exacta de entrega.';
  if (!d.distrito.trim()) return 'Elige el distrito de entrega.';
  if (d.latitud == null || d.longitud == null) return 'Marca el punto de entrega en el mapa (busca la dirección, usa tu ubicación o toca el mapa).';
  if (!d.confirmada) return 'Confirma que el punto del mapa coincide con la dirección.';
  return '';
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Destino de un delivery: dirección, distrito, referencia y punto exacto en el mapa.
 * Tres formas de marcar el punto, como en la web: buscar la dirección, usar el GPS o tocar el mapa.
 */
export function LocationPicker({ value, onChange, showErrors }: { value: Destino; onChange: (d: Destino) => void; showErrors?: boolean }) {
  const [resultados, setResultados] = useState<ResultadoGeo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [distritosOpen, setDistritosOpen] = useState(false);
  const hasPoint = value.latitud != null && value.longitud != null;

  const setField = (patch: Partial<Destino>) => onChange({ ...value, ...patch });

  // Al fijar un punto (toque o GPS) se resuelve la dirección para autocompletar, igual que la web.
  const setPoint = async (lat: number, lng: number) => {
    const latitud = round6(lat); const longitud = round6(lng);
    setAviso(''); setResultados([]);
    onChange({ ...value, latitud, longitud, confirmada: false });
    setResolviendo(true);
    try {
      const r = await direccionDePunto(latitud, longitud);
      onChange({
        ...value, latitud, longitud, confirmada: true,
        direccion: r.direccion?.trim() || value.direccion,
        distrito: matchDistrito(r.distrito) ?? value.distrito,
      });
    } catch {
      setAviso('El punto quedó marcado, pero el mapa no reconoció la dirección. Revisa los datos y confírmalo.');
    } finally {
      setResolviendo(false);
    }
  };

  const buscar = async () => {
    setAviso(''); setResultados([]);
    if (value.direccion.trim().length < 4 || !value.distrito) {
      setAviso('Escribe la dirección y elige el distrito antes de buscar.');
      return;
    }
    setBuscando(true);
    try {
      const r = await buscarDireccion(value.direccion.trim(), value.distrito);
      if (!r.length) setAviso('El mapa no reconoció esa dirección. Revisa calle, número y distrito, o toca el punto en el mapa.');
      setResultados(r);
    } catch (e) {
      setAviso(apiErrorMessage(e, 'No pudimos consultar el mapa. Intenta de nuevo o marca el punto manualmente.'));
    } finally {
      setBuscando(false);
    }
  };

  const usarGps = async () => {
    setAviso('');
    setUbicando(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setAviso('Sin permiso de ubicación. Actívalo en los ajustes del teléfono o toca el punto en el mapa.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await setPoint(pos.coords.latitude, pos.coords.longitude);
    } catch {
      setAviso('No pudimos obtener tu ubicación. Activa el GPS o toca el punto en el mapa.');
    } finally {
      setUbicando(false);
    }
  };

  const elegir = (r: ResultadoGeo) => {
    setResultados([]); setAviso('');
    onChange({ ...value, latitud: round6(r.latitud), longitud: round6(r.longitud), confirmada: true });
  };

  const err = showErrors ? destinoError(value) : '';
  return (
    <View style={styles.stack}>
      <TextField label="Dirección de entrega" icon="location-outline" placeholder="Calle, número, Mz/Lt, dpto."
        value={value.direccion} onChangeText={(v) => setField({ direccion: v, confirmada: false })} autoCapitalize="sentences" maxLength={250}
        error={showErrors && value.direccion.trim().length < 4 ? 'Escribe la dirección exacta.' : ''} />
      <Pressable onPress={() => setDistritosOpen(true)} accessibilityRole="button" accessibilityLabel="Elegir distrito">
        <View pointerEvents="none">
          <TextField label="Distrito" icon="map-outline" placeholder="Elige el distrito" value={value.distrito} editable={false}
            right={<Ionicons name="chevron-down" size={18} color={colors.muted} />}
            error={showErrors && !value.distrito ? 'Elige el distrito.' : ''} />
        </View>
      </Pressable>
      <TextField label="Referencia" optional icon="navigate-outline" placeholder="Ej. frente al parque, portón azul"
        value={value.referencia} onChangeText={(v) => setField({ referencia: v })} autoCapitalize="sentences" maxLength={250} />

      <View style={styles.actions}>
        <Button label="Buscar" icon="search" variant="secondary" size="md" onPress={buscar} busy={buscando} style={styles.flex} />
        <Button label="Mi ubicación" icon="locate" variant="secondary" size="md" onPress={usarGps} busy={ubicando} style={styles.flex} />
      </View>

      {resultados.length > 0 && <Card padded={false}>
        <AppText variant="captionStrong" style={styles.resultsTitle}>¿Cuál es el punto correcto?</AppText>
        {resultados.map((r, i) => (
          <View key={r.id}>
            {i > 0 && <Divider inset={space.lg} />}
            <Pressable onPress={() => elegir(r)} style={({ pressed }) => [styles.result, pressed && styles.pressed]} accessibilityRole="button">
              <Ionicons name="location" size={18} color={colors.primary} />
              <AppText variant="caption" color={colors.text} style={styles.flex} numberOfLines={3}>{r.etiqueta}</AppText>
            </Pressable>
          </View>
        ))}
      </Card>}

      <View>
        <MapView latitude={value.latitud} longitude={value.longitud} height={230} onPick={(lat, lng) => void setPoint(lat, lng)} />
        {resolviendo && <View style={styles.resolving}><ActivityIndicator size="small" color={colors.primary} /><AppText variant="caption">Leyendo la dirección…</AppText></View>}
      </View>
      <AppText variant="caption">Toca el mapa para mover el punto exacto de entrega.</AppText>

      {hasPoint && !value.confirmada && !resolviendo && (
        <InlineAlert tone="warning" title="Confirma el punto" text="Cambiaste la dirección o el mapa no la reconoció. Revisa que el punto sea correcto." />
      )}
      {hasPoint && !value.confirmada && !resolviendo && (
        <Button label="El punto es correcto" icon="checkmark-circle-outline" variant="secondary" size="md" onPress={() => setField({ confirmada: true })} />
      )}
      {hasPoint && value.confirmada && <InlineAlert tone="success" text="Punto de entrega confirmado." />}
      {!!aviso && <InlineAlert tone="warning" text={aviso} />}
      {!!err && !aviso && <InlineAlert text={err} />}

      <DistritoSheet visible={distritosOpen} value={value.distrito} onClose={() => setDistritosOpen(false)}
        onPick={(d) => { setField({ distrito: d, confirmada: false }); setDistritosOpen(false); }} />
    </View>
  );
}

export function DistritoSheet({ visible, value, onClose, onPick }: { visible: boolean; value: string; onClose: () => void; onPick: (d: string) => void }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => DISTRITOS.filter((d) => !q.trim() || normalizeText(d).includes(normalizeText(q))), [q]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Distrito" subtitle="Lima Metropolitana y Callao">
      <SearchBar value={q} onChangeText={setQ} placeholder="Buscar distrito" />
      <FlatList data={list} keyExtractor={(d) => d} style={styles.list} keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable onPress={() => onPick(item)} style={({ pressed }) => [styles.option, pressed && styles.pressed]} accessibilityRole="radio"
            accessibilityState={{ checked: item === value }}>
            <AppText variant="subheading" color={item === value ? colors.primary : colors.text} style={styles.flex}>{item}</AppText>
            {item === value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </Pressable>
        )} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: space.md },
  actions: { flexDirection: 'row', gap: space.sm },
  resultsTitle: { paddingHorizontal: space.lg, paddingTop: space.md },
  result: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
  pressed: { backgroundColor: colors.surfaceMuted },
  resolving: { position: 'absolute', left: space.sm, top: space.sm, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  list: { maxHeight: 380 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: space.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
