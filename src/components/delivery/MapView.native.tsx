import { useEffect, useMemo, useRef, useState, useId } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors, radius } from '../../theme';
import { buildMapHtml } from './mapHtml';
import type { MapViewProps } from './MapView.types';

/** Mapa de OpenStreetMap dentro de un WebView (no requiere clave de Google Maps). */
export function MapView({ latitude, longitude, height = 240, interactive = true, onPick, zoom }: MapViewProps) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const id = useId();
  const channel = `m${id.replace(/[^a-zA-Z0-9]/g, '')}`;
  // El HTML se arma una sola vez; los cambios de punto se envían por mensaje para no recargar el mapa.
  const [initial] = useState(() => ({ lat: latitude ?? -12.0464, lng: longitude ?? -77.0428, marker: latitude != null }));
  const html = useMemo(() => buildMapHtml({
    lat: initial.lat, lng: initial.lng, zoom: zoom ?? (initial.marker ? 17 : 12), marker: initial.marker, interactive, channel,
  }), [initial, interactive, channel, zoom]);

  useEffect(() => {
    if (!ready) return;
    const msg = latitude != null && longitude != null
      ? { type: 'set', lat: latitude, lng: longitude, channel } : { type: 'clear', channel };
    ref.current?.injectJavaScript(`window.__lunalav && window.__lunalav(${JSON.stringify(JSON.stringify(msg))}); true;`);
  }, [ready, latitude, longitude, channel]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data) as { type: string; lat?: number; lng?: number; channel?: string };
      if (data.channel !== channel) return;
      if (data.type === 'ready') setReady(true);
      if (data.type === 'tap' && data.lat != null && data.lng != null) onPick?.(data.lat, data.lng);
    } catch { /* mensaje ajeno */ }
  };

  return (
    <View style={[styles.box, { height }]}>
      <WebView ref={ref} originWhitelist={['*']} source={{ html, baseUrl: 'https://app.lunalav.pe' }} onMessage={onMessage}
        javaScriptEnabled domStorageEnabled scrollEnabled={false} nestedScrollEnabled setSupportMultipleWindows={false}
        style={styles.web} />
      {!ready && <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#E8EEF5' },
  web: { flex: 1, backgroundColor: 'transparent' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
