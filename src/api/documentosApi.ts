import { compartirArchivo, descargarArchivo, MIME, nombreSeguro } from '../documents/files';

export type FormatoComprobante = 'pdf' | 'xml' | 'cdr';

export const FORMATOS_COMPROBANTE: Record<FormatoComprobante, { extension: string; mime: string; etiqueta: string }> = {
  pdf: { extension: 'pdf', mime: MIME.pdf, etiqueta: 'PDF' },
  xml: { extension: 'xml', mime: MIME.xml, etiqueta: 'XML firmado' },
  cdr: { extension: 'zip', mime: MIME.zip, etiqueta: 'CDR de SUNAT' },
};

/** Descarga el PDF, el XML firmado o el CDR de un comprobante y abre el menú de compartir. */
export async function compartirComprobante(id: number, numeroCompleto: string, formato: FormatoComprobante) {
  const f = FORMATOS_COMPROBANTE[formato];
  const { uri } = await descargarArchivo(`/api/facturacion/comprobantes/${id}/${formato}`, `${nombreSeguro(numeroCompleto)}.${f.extension}`);
  await compartirArchivo(uri, f.mime, `${f.etiqueta} ${numeroCompleto}`);
}
