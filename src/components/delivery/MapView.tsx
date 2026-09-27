import { createElement, useEffect, useMemo, useRef, useState, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../theme';
import { buildMapHtml } from './mapHtml';
import type { MapViewProps } from './MapView.types';

/** Versión web del mapa: el mismo HTML de Leaflet dentro de un iframe. */
export function MapView({ latitude, longitude, height = 240, interactive = true, onPick, zoom }: MapViewProps) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const id = useId();
  const channel = `m${id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [initial] = useState(() => ({ lat: latitude ?? -12.0464, lng: longitude ?? -77.0428, marker: latitude != null }));
  const html = useMemo(() => buildMapHtml({
    lat: initial.lat, lng: initial.lng, zoom: zoom ?? (initial.marker ? 17 : 12), marker: initial.marker, interactive, channel,
  }), [initial, interactive, channel, zoom]);
  const pick = useRef(onPick);
  useEffect(() => { pick.current = onPick; });

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return;
      try {
        const data = JSON.parse(e.data) as { type: string; lat?: number; lng?: number; channel?: string };
        if (data.channel !== channel) return;
        if (data.type === 'ready') setReady(true);
        if (data.type === 'tap' && data.lat != null && data.lng != null) pick.current?.(data.lat, data.lng);
      } catch { /* mensaje ajeno */ }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [channel]);

  useEffect(() => {
    if (!ready) return;
    const msg = latitude != null && longitude != null ? { type: 'set', lat: latitude, lng: longitude, channel } : { type: 'clear', channel };
    frame.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
  }, [ready, latitude, longitude, channel]);

  return (
    <View style={[styles.box, { height }]}>
      {createElement('iframe', { ref: frame, srcDoc: html, title: 'Mapa', style: { border: 0, width: '100%', height: '100%' } })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#E8EEF5' },
});
