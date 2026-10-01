import type { ConfiguracionNegocio } from '../api/pedidoApi';
import type { Pedido } from '../api/operationsApi';
import { parseDate } from '../utils/format';

export type TipoTicket = 'CLIENTE' | 'PRODUCCION';
export type AnchoTicketMm = 58 | 80;

export interface OpcionesTicket {
  pedido: Pedido;
  negocio: ConfiguracionNegocio;
  tipo: TipoTicket;
  mostrarDescripcion: boolean;
  /** URL absoluta del logo (o data:) ya resuelta; null si el negocio no tiene. */
  logoUrl?: string | null;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const LINEA = '- - - - - - - - - - - - - - - - - - -';

export const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const n2 = (value: number | null | undefined) => (value ?? 0).toFixed(2);
const cantidad = (value: number) => String(Number((value ?? 0).toFixed(2)));

/** "24 de agosto, 2026 / 10:11 am", igual que el ticket de la web. */
export function fechaLarga(value?: string | null) {
  if (!value) return '';
  const d = parseDate(value);
  if (!Number.isFinite(d.getTime())) return '';
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = h < 12 ? 'am' : 'pm';
  h = h % 12 || 12;
  return `${d.getDate()} de ${MESES[d.getMonth()]}, ${d.getFullYear()} / ${h}:${min} ${ampm}`;
}

/** Une las abreviaturas de dirección (Urb., Mz., Av.…) con la palabra siguiente para que no queden colgadas. */
export function direccionTicket(direccion?: string | null) {
  return (direccion ?? '').replace(/\b(Urb|Mz|Lt|Cond|Res|A\.H|P\.J|Av|Jr|Ca|Cal|Psje|Pje)\.\s+/gi, (m) => `${m.trimEnd()} `);
}

export const marcaCorta = (nombre?: string | null) => (nombre || 'Lavandería').replace(/^lavander[ií]a\s+/i, '').trim().toUpperCase();

export function condicionesLista(texto?: string | null) {
  return (texto ?? '').split('\n').map((l) => l.trim().replace(/^\d+\.\s*/, '')).filter(Boolean);
}

export const anchoTicketMm = (negocio?: Pick<ConfiguracionNegocio, 'anchoTicketMm'> | null): AnchoTicketMm => (negocio?.anchoTicketMm === 58 ? 58 : 80);

/** Ancho de página en puntos (1 pt = 1/72 in), que es lo que pide expo-print. */
export const anchoPaginaPt = (mm: AnchoTicketMm) => Math.round((mm * 72) / 25.4);
/** Ancho en píxeles CSS (96 dpi), para el viewport de la vista previa. */
export const anchoPaginaPx = (mm: AnchoTicketMm) => Math.round((mm * 96) / 25.4);

const css = (mm: AnchoTicketMm) => `
  @page { margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { width: ${mm}mm; margin: 0 auto; padding: 3mm 3.5mm 6mm; font-family: Arial, Helvetica, sans-serif; color: #000; font-size: ${mm === 58 ? 11 : 12}px; line-height: 1.32; }
  .c { text-align: center; } .r { text-align: right; }
  .hdr { text-align: center; }
  .hdr img { max-width: 70%; max-height: 18mm; margin: 0 auto 2mm; display: block; }
  .hdr h1 { font-size: ${mm === 58 ? 14 : 16}px; margin: 0 0 1mm; text-transform: uppercase; }
  .hdr p { margin: 0; }
  .div { text-align: center; margin: 2mm 0; letter-spacing: 0; overflow: hidden; white-space: nowrap; color: #333; }
  .numero { text-align: center; }
  .numero .l { display: block; font-weight: bold; letter-spacing: .5px; }
  .numero .v { display: block; font-size: ${mm === 58 ? 22 : 26}px; font-weight: 800; margin-top: 1mm; }
  .fecha { margin: .6mm 0; }
  .cli { text-align: center; }
  .cli .l { font-weight: bold; letter-spacing: .5px; }
  .cli .n { font-size: ${mm === 58 ? 13 : 15}px; font-weight: 800; margin: 1mm 0; text-transform: uppercase; }
  .cli .d { margin: .5mm 0; }
  .dest { border: 1px solid #000; padding: 1.5mm; margin-top: 2mm; }
  .dest p { margin: .4mm 0; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: ${mm === 58 ? 10 : 11}px; border-bottom: 1px solid #000; padding-bottom: 1mm; }
  td { padding: 1mm 0; vertical-align: top; }
  .it { font-weight: bold; display: block; } .desc { display: block; font-size: ${mm === 58 ? 10 : 11}px; color: #333; }
  .tot { display: flex; justify-content: space-between; margin: .6mm 0; }
  .tot.f { font-size: ${mm === 58 ? 14 : 16}px; font-weight: 800; }
  .pago { display: flex; justify-content: space-between; border: 1.5px solid #000; padding: 1.5mm 2mm; font-weight: 800; }
  .pago.ok { background: #000; color: #fff; }
  .est { text-align: center; }
  .obs p, .pie, .aviso, .recojo, .notas p { margin: 1mm 0; }
  .obs strong, .notas strong { display: block; }
  .pie { text-align: center; font-weight: bold; } .aviso { text-align: center; font-weight: bold; }
  .recojo { text-align: center; font-size: ${mm === 58 ? 9.5 : 10.5}px; }
  .cond { font-size: ${mm === 58 ? 9 : 10}px; text-align: justify; }
  .cond strong { display: block; text-align: center; margin-bottom: 1mm; }
  .cond ol { margin: 1mm 0; padding-left: 4mm; } .cond li { margin: .6mm 0; }
  .cond .intro, .cond .cierre { margin: 1mm 0; }
`;

/** Ticket de un pedido en HTML (cliente o producción), listo para vista previa, impresión o PDF. */
export function construirTicketHtml({ pedido: p, negocio, tipo, mostrarDescripcion, logoUrl }: OpcionesTicket) {
  const mm = anchoTicketMm(negocio);
  const saldo = Math.max(0, p.total - p.montoPagado);
  const esCliente = tipo === 'CLIENTE';
  const conDescripcion = mostrarDescripcion || !esCliente;
  const div = `<div class="div">${LINEA}</div>`;
  const out: string[] = [];

  if (esCliente) {
    out.push(`<div class="hdr">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="">` : ''}
      <h1>${escapeHtml(negocio.nombreNegocio)}</h1>
      ${negocio.direccion ? `<p>${escapeHtml(direccionTicket(negocio.direccion))}</p>` : ''}
      ${negocio.telefono ? `<p>Tel: ${escapeHtml(negocio.telefono)}</p>` : ''}
      ${negocio.ruc ? `<p>RUC: ${escapeHtml(negocio.ruc)}</p>` : ''}
      ${negocio.horarioAtencion ? `<p>${escapeHtml(negocio.horarioAtencion)}</p>` : ''}
    </div>${div}`);
  }

  out.push(`<div class="numero"><span class="l">${esCliente ? 'ORDEN DE SERVICIO' : 'ORDEN DE PRODUCCIÓN'}</span><span class="v">N° ${escapeHtml(p.numero)}</span></div>`);
  out.push(`<div class="div"></div>`);
  out.push(`<div>
    <div class="fecha"><strong>Ingreso :</strong> ${escapeHtml(fechaLarga(p.fechaIngreso))}</div>
    ${p.fechaEntregaEst ? `<div class="fecha"><strong>${p.modalidad === 'Delivery' ? 'Entrega (delivery) :' : 'Entrega :'}</strong> ${escapeHtml(fechaLarga(p.fechaEntregaEst))}</div>` : ''}
    <div class="fecha"><strong>Modalidad :</strong> ${escapeHtml(p.modalidad)}</div>
    ${p.esUrgente ? '<div class="fecha"><strong>PEDIDO URGENTE</strong></div>' : ''}
  </div>${div}`);

  out.push(`<div class="cli">
    <div class="l">NOMBRES DEL CLIENTE</div>
    <div class="n">${escapeHtml(p.clienteNombre)}</div>
    ${p.clienteCelular ? `<div class="d"><strong>Teléfono :</strong> ${escapeHtml(p.clienteCelular)}</div>` : ''}
    ${p.usuarioNombre ? `<div class="d"><strong>Atendido por :</strong> ${escapeHtml(p.usuarioNombre)}</div>` : ''}
    ${esCliente && p.clientePuntos != null ? `<div class="d">Puntos acumulados: ${escapeHtml(p.clientePuntos)}</div>` : ''}
  </div>`);

  if (p.modalidad === 'Delivery' && p.direccionEntrega) {
    out.push(`<div class="dest"><strong>DESTINO DE ENTREGA</strong>
      <p>${escapeHtml(p.direccionEntrega)}</p>
      ${p.distritoEntrega ? `<p>${escapeHtml(p.distritoEntrega)}</p>` : ''}
      ${p.referenciaEntrega ? `<p>Ref.: ${escapeHtml(p.referenciaEntrega)}</p>` : ''}
      ${p.latitudEntrega != null && p.longitudEntrega != null ? `<p>GPS: ${escapeHtml(p.latitudEntrega)}, ${escapeHtml(p.longitudEntrega)}</p>` : ''}
    </div>`);
  }

  out.push(div);
  out.push(`<table><thead><tr><th>ITEM</th><th class="c">CANT.</th><th class="r">TOTAL</th></tr></thead><tbody>
    ${p.items.map((it) => `<tr>
      <td><span class="it">${escapeHtml(it.servicioNombre)}</span>${it.descripcion && conDescripcion ? `<span class="desc">${escapeHtml(it.descripcion)}</span>` : ''}</td>
      <td class="c">${escapeHtml(cantidad(it.cantidad))}</td><td class="r">${n2(it.total)}</td></tr>`).join('')}
  </tbody></table>${div}`);

  out.push(`<div>
    <div class="tot"><span>Subtotal :</span><span>${n2(p.subtotal)}</span></div>
    ${p.descuento > 0 ? `<div class="tot"><span>Descuento :</span><span>- ${n2(p.descuento)}</span></div>` : ''}
    ${p.recargoUrgente > 0 ? `<div class="tot"><span>Recargo urgente :</span><span>${n2(p.recargoUrgente)}</span></div>` : ''}
    <div class="tot"><span>Redondeo :</span><span>${n2(p.redondeo)}</span></div>
    <div class="tot f"><span>Total a pagar :</span><span>${n2(p.total)}</span></div>
    <div class="tot"><span>A cuenta :</span><span>${n2(p.montoPagado)}</span></div>
  </div>${div}`);

  const pendiente = saldo > 0.01;
  out.push(`<div class="pago ${pendiente ? '' : 'ok'}"><span>${pendiente ? 'PAGO PENDIENTE' : 'PAGO COMPLETO'}</span><span>S/ ${n2(pendiente ? saldo : 0)}</span></div>${div}`);

  const estado = p.estadoProceso === 'PENDIENTE' ? 'INGRESADO' : p.estadoProceso.replace(/_/g, ' ');
  out.push(`<div class="est"><strong>Estado:</strong> ${escapeHtml(estado)}${p.areaActualNombre ? `<br><small>Área actual: ${escapeHtml(p.areaActualNombre)}</small>` : ''}</div>`);

  if (esCliente) {
    out.push(div);
    if (p.observaciones) out.push(`<div class="obs"><strong>OBSERVACIONES</strong><p>${escapeHtml(p.observaciones)}</p></div>${div}`);
    if (negocio.mensajePieTicket) out.push(`<p class="pie">${escapeHtml(negocio.mensajePieTicket)}</p>`);
    out.push('<p class="aviso">Presente este ticket al recoger su pedido.</p>');
    out.push('<p class="recojo">Este ticket físico autoriza el recojo. Puede recogerlo cualquier persona que lo presente.</p>');
    const condiciones = condicionesLista(negocio.condicionesServicio);
    if (condiciones.length > 0) {
      const marca = marcaCorta(negocio.nombreNegocio);
      out.push(`${div}<div class="cond"><strong>CONDICIONES DEL SERVICIO - ${escapeHtml(marca)}</strong>
        <p class="intro">Su confianza es nuestro compromiso. Le invitamos a conocer las siguientes condiciones que garantizan un servicio seguro y transparente para usted.</p>
        <ol>${condiciones.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ol>
        <p class="cierre">Al recibir este comprobante, usted declara conocer y aceptar íntegramente las presentes condiciones de servicio. Gracias por confiar en ${escapeHtml(marca)}.</p></div>`);
    }
  } else if (p.observaciones || negocio.notasProduccion) {
    out.push(`${div}<div class="notas"><strong>NOTAS PARA PRODUCCIÓN</strong>
      ${p.observaciones ? `<p><em>Observaciones de este pedido:</em> ${escapeHtml(p.observaciones)}</p>` : ''}
      ${negocio.notasProduccion ? `<p>${escapeHtml(negocio.notasProduccion)}</p>` : ''}</div>`);
  }

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=${anchoPaginaPx(mm)}, initial-scale=1">
<style>${css(mm)}</style></head><body>${out.join('\n')}</body></html>`;
}

/** El logo puede venir como ruta relativa de la API ("/api/configuracion/logo/…"), URL completa o data:. */
export function resolverLogo(logo: string | null | undefined, origin: string) {
  if (!logo) return null;
  if (/^(https?:|data:)/i.test(logo)) return logo;
  return `${origin.replace(/\/$/, '')}${logo.startsWith('/') ? '' : '/'}${logo}`;
}
