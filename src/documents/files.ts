import { isAxiosError } from 'axios';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiErrorMessage } from '../api/errors';
import { api } from '../api/http';

export const MIME = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xml: 'application/xml',
  zip: 'application/zip',
} as const;

const UTI: Record<string, string> = {
  [MIME.pdf]: 'com.adobe.pdf',
  [MIME.xlsx]: 'org.openxmlformats.spreadsheetml.sheet',
  [MIME.xml]: 'public.xml',
  [MIME.zip]: 'public.zip-archive',
};

/** Nombre de archivo apto para el almacenamiento del teléfono: sin tildes, espacios ni símbolos raros. */
export function nombreSeguro(nombre: string) {
  const limpio = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return limpio || 'archivo';
}

/** Nombre sugerido por el servidor (Content-Disposition), si lo manda. */
export function nombreDeCabecera(cabecera?: string | null) {
  if (!cabecera) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cabecera);
  if (utf8) { try { return decodeURIComponent(utf8[1]); } catch { /* usa el nombre simple */ } }
  const simple = /filename="?([^";]+)"?/i.exec(cabecera);
  return simple ? simple[1].trim() : null;
}

/** Guarda bytes en la caché de la app (se borra sola si falta espacio) y devuelve su URI. */
export function guardarEnCache(nombre: string, bytes: Uint8Array) {
  const file = new File(Paths.cache, nombreSeguro(nombre));
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return file.uri;
}

/**
 * Descarga un archivo (Excel, PDF, XML…) del servidor con la sesión actual. Usa el mismo cliente
 * HTTP que el resto de la app, así renueva el token y reintenta igual que cualquier petición.
 */
export async function descargarArchivo(path: string, nombreRespaldo: string, params?: object) {
  try {
    const res = await api.get<ArrayBuffer>(path, { params, responseType: 'arraybuffer', timeout: 90_000 });
    const nombre = nombreDeCabecera(res.headers['content-disposition'] as string | undefined) ?? nombreRespaldo;
    return { uri: guardarEnCache(nombre, new Uint8Array(res.data)), nombre: nombreSeguro(nombre) };
  } catch (error) {
    throw new Error(mensajeDeDescarga(error));
  }
}

/** Con responseType 'arraybuffer' el cuerpo del error llega como bytes: se lee el {"mensaje": "..."} del servidor. */
export function mensajeDeDescarga(error: unknown) {
  if (isAxiosError(error) && error.response) {
    const data: unknown = error.response.data;
    if (data instanceof ArrayBuffer && data.byteLength > 0 && data.byteLength < 8192) {
      try {
        const bytes = new Uint8Array(data);
        let texto = '';
        for (const b of bytes) texto += String.fromCharCode(b);
        const json = JSON.parse(decodeURIComponent(escape(texto))) as { mensaje?: string };
        if (json.mensaje) return json.mensaje;
      } catch { /* cae al mensaje genérico */ }
    }
    if (error.response.status === 404) return 'El archivo todavía no está disponible.';
    if (error.response.status === 403) return 'No tienes permiso para descargar este archivo.';
  }
  return apiErrorMessage(error);
}

/** Abre el menú de compartir de Android (WhatsApp, correo, Drive, abrir con…). */
export async function compartirArchivo(uri: string, mimeType: string, titulo: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir archivos.');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: titulo, UTI: UTI[mimeType] });
}
