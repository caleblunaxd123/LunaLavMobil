import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { getPedido } from '../api/operationsApi';
import { AppText, BottomBar, Button, Choice, ErrorState, ListSkeleton, Screen, SegmentedControl, StackHeader, toast } from '../components/ui';
import { compartirHtmlComoPdf, imprimirHtml } from '../documents/pdf';
import {
  anchoPaginaPt, anchoPaginaPx, anchoTicketMm, construirTicketHtml, resolverLogo, type TipoTicket,
} from '../documents/ticketHtml';
import { useConfiguracion } from '../hooks/useConfiguracion';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, radius, space } from '../theme';

/** Ticket del pedido: vista previa idéntica a la impresión, imprimir y compartir como PDF (WhatsApp, correo…). */
export function TicketScreen({ navigation, route }: AppScreenProps<'Ticket'>) {
  const { id } = route.params;
  const origin = useAuthStore((s) => s.session?.apiOrigin ?? '');
  const pedido = useQuery({ queryKey: ['pedido', id], queryFn: () => getPedido(id) });
  const config = useConfiguracion();
  const [tipo, setTipo] = useState<TipoTicket>('CLIENTE');
  const [descripcion, setDescripcion] = useState(false);
  const [busy, setBusy] = useState<'imprimir' | 'pdf' | null>(null);
  // Alto real del contenido (px CSS), medido en la vista previa: el PDF de una ticketera es una tira continua.
  const [altoPx, setAltoPx] = useState(0);

  const p = pedido.data;
  const negocio = config.data;
  const mm = anchoTicketMm(negocio);
  const html = useMemo(
    () => (p && negocio ? construirTicketHtml({ pedido: p, negocio, tipo, mostrarDescripcion: descripcion, logoUrl: resolverLogo(negocio.logoUrl, origin) }) : ''),
    [p, negocio, tipo, descripcion, origin],
  );

  const pagina = () => ({
    width: anchoPaginaPt(mm),
    // 1 px CSS = 0.75 pt. El margen evita que la última línea caiga en una página nueva.
    height: Math.max(240, Math.round((altoPx || 1400) * 0.75) + 14),
  });

  const imprimir = async () => {
    setBusy('imprimir');
    try { await imprimirHtml(html, pagina()); }
    catch { toast('No se pudo abrir la impresión.', 'error'); }
    finally { setBusy(null); }
  };

  const compartirPdf = async () => {
    if (!p) return;
    setBusy('pdf');
    try {
      await compartirHtmlComoPdf(html, `ticket-${p.numero}${tipo === 'PRODUCCION' ? '-produccion' : ''}.pdf`, `Ticket #${p.numero}`, pagina());
    } catch (error) {
      toast(error instanceof Error && error.message ? error.message : 'No se pudo generar el PDF.', 'error');
    } finally { setBusy(null); }
  };

  const onMessage = (e: WebViewMessageEvent) => {
    const alto = Number(e.nativeEvent.data);
    if (Number.isFinite(alto) && alto > 0) setAltoPx(alto);
  };

  return (
    <Screen edges={['top']}>
      <StackHeader title={p ? `Ticket #${p.numero}` : 'Ticket'} subtitle={p?.clienteNombre} onBack={navigation.goBack} />
      {pedido.isLoading || config.isLoading ? <View style={styles.pad}><ListSkeleton rows={5} /></View>
        : !p || !negocio ? <ErrorState onRetry={() => { void pedido.refetch(); void config.refetch(); }} />
          : <>
            <View style={styles.options}>
              <SegmentedControl<TipoTicket> value={tipo} onChange={setTipo}
                segments={[{ value: 'CLIENTE', label: 'Ticket del cliente' }, { value: 'PRODUCCION', label: 'Producción' }]} />
              {tipo === 'CLIENTE' && <View style={styles.choices}>
                <Choice label="Mostrar descripción de prendas" selected={descripcion} onPress={() => setDescripcion((v) => !v)} icon="reader-outline" />
              </View>}
              <AppText variant="caption">Ancho de ticketera configurado: {mm} mm. Para impresoras térmicas Bluetooth, elígela en el diálogo de impresión.</AppText>
            </View>
            <View style={styles.preview}>
              <WebView key={`${tipo}-${descripcion}-${mm}`} originWhitelist={['*']} source={{ html }} style={[styles.web, { width: anchoPaginaPx(mm) + 8 }]}
                scalesPageToFit={false} javaScriptEnabled onMessage={onMessage}
                injectedJavaScript="window.ReactNativeWebView.postMessage(String(document.documentElement.scrollHeight)); true;" />
            </View>
            <BottomBar style={styles.bar}>
              <Button label="Compartir PDF" icon="share-social-outline" variant="secondary" size="md" style={styles.flex}
                busy={busy === 'pdf'} disabled={busy !== null} onPress={() => void compartirPdf()} />
              <Button label="Imprimir" icon="print-outline" size="md" style={styles.flex}
                busy={busy === 'imprimir'} disabled={busy !== null} onPress={() => void imprimir()} />
            </BottomBar>
          </>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: space.lg },
  options: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm },
  choices: { flexDirection: 'row' },
  preview: { flex: 1, margin: space.lg, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  // El ticket se muestra a su tamaño real (80 o 58 mm) y centrado, como saldrá impreso.
  web: { flex: 1, alignSelf: 'center', backgroundColor: '#FFFFFF' },
  bar: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
