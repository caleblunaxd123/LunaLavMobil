import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { compartirArchivo, MIME, nombreSeguro } from './files';

/** A4 vertical en puntos (1/72 in), que es lo que pide expo-print. */
export const A4 = { width: 595, height: 842 } as const;

/** Convierte HTML en un PDF con nombre legible y abre el menú de compartir (WhatsApp, correo, Drive…). */
export async function compartirHtmlComoPdf(html: string, nombreArchivo: string, titulo: string, pagina: { width: number; height: number } = A4) {
  const { uri } = await Print.printToFileAsync({ html, width: pagina.width, height: pagina.height });
  // El archivo temporal tiene un nombre aleatorio: se copia con uno legible para quien lo recibe.
  const destino = new File(Paths.cache, nombreSeguro(nombreArchivo));
  if (destino.exists) destino.delete();
  new File(uri).copy(destino);
  await compartirArchivo(destino.uri, MIME.pdf, titulo);
}

/** Abre el diálogo de impresión de Android (impresoras Wi-Fi, USB o térmicas con su servicio de impresión). */
export function imprimirHtml(html: string, pagina?: { width: number; height: number }) {
  return Print.printAsync(pagina ? { html, width: pagina.width, height: pagina.height } : { html });
}
