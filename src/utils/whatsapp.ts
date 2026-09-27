import { Linking } from 'react-native';
import type { ConfiguracionNegocio, PlantillaWhatsapp } from '../api/pedidoApi';
import type { Pedido } from '../api/operationsApi';
import { parseDate, whatsappUrl } from './format';

/*
 * Mensajes de WhatsApp al cliente: mismos textos y plantillas que LunaLav web
 * (Ajustes → Plantillas de WhatsApp, evento INGRESO), para que el cliente reciba lo mismo desde ambos lados.
 */

const cantidadTexto = (v: number) => (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

function unidadTexto(unidad?: string | null) {
  const v = (unidad || 'u').trim().toLowerCase();
  if (['unidad', 'unidades', 'und', 'prenda', 'pieza'].includes(v)) return 'u';
  if (['kilogramo', 'kilogramos'].includes(v)) return 'kg';
  return v;
}

function fechaEntregaTexto(fecha: string) {
  const d = parseDate(fecha);
  const dia = d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dia} - ${hora}`;
}

function horarioTexto(horario?: string | null) {
  return (horario?.trim() || 'Lun a Sáb: 8:30 am - 7:30 pm\nDom: 8:30 am - 3:00 pm')
    .split('\n').map((l) => l.trim()).filter(Boolean).map((l) => `*• ${l.replace(/^[•*-]\s*/, '')}*`).join('\n');
}

const CONDICIONES = [
  '1. Entrega solo con boleta. No se entregan prendas sin ella.',
  '2. Después de 45 días se cobra 20% por almacenamiento.',
  '3. Prendas no retiradas en 90 días serán donadas o rematadas.',
  '4. No nos responsabilizamos por daños en prendas frágiles, muy usadas o de mala confección.',
  '5. No aceptamos ropa interior; no nos responsabilizamos si es enviada.',
  '6. Mascarillas serán desechadas sin derecho a reclamo.',
  '7. No garantizamos la eliminación total de manchas difíciles.',
  '8. En casos fortuitos comprobados, no hay responsabilidad por prendas fuera de plazo.',
].join('\n');

/** Mensaje de ingreso del pedido (detalle de prendas, total, saldo, entrega y enlace de seguimiento). */
export function mensajeIngreso(p: Pedido, negocio?: ConfiguracionNegocio | null, plantillas: PlantillaWhatsapp[] = [], seguimientoUrl?: string) {
  const cliente = (p.clienteNombre || 'CLIENTE').trim().toUpperCase();
  const marca = (negocio?.nombreNegocio || 'LUNALAV').replace(/^lavander[ií]a\s+/i, '').trim().toUpperCase();
  const items = p.items.map((it) => {
    const desc = it.descripcion?.trim() || 'Sin descripción';
    return `*• ${cantidadTexto(it.cantidad)} ${unidadTexto(it.servicioUnidad)} de "${it.servicioNombre || 'Servicio'}" - S/${it.total.toFixed(2)}*\n${desc}`;
  }).join('\n\n');
  const saldo = Math.max(0, p.total - p.montoPagado).toFixed(2);
  const entrega = p.fechaEntregaEst ? fechaEntregaTexto(p.fechaEntregaEst) : 'Por confirmar';
  const destino = p.modalidad === 'Delivery' && p.direccionEntrega
    ? `*Destino de entrega:* ${p.direccionEntrega}${p.distritoEntrega ? `, ${p.distritoEntrega}` : ''}${p.referenciaEntrega ? `\n*Referencia:* ${p.referenciaEntrega}` : ''}`
    : '';
  const seguimiento = seguimientoUrl ? `Sigue el estado de tu pedido aquí:\n${seguimientoUrl}` : '';
  const vars: Record<string, string> = {
    cliente, negocio: marca, numero: String(p.numero), items, total: p.total.toFixed(2), saldo, entrega, destino,
    horario: horarioTexto(negocio?.horarioAtencion), condiciones: CONDICIONES, seguimiento,
  };
  const plantilla = plantillas.find((t) => t.evento === 'INGRESO')?.mensaje;
  let texto = plantilla?.includes('{items}')
    ? Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), plantilla)
    : `¡Hola *${cliente}*!\nLe saluda la lavandería *${marca}*. Su orden es la *${p.numero}* con los siguientes ítems:\n\n${items}\n\n`
      + `Monto total a pagar *S/${p.total.toFixed(2)}*, del cual falta pagar *S/${saldo}*.\nFecha de entrega: *${entrega}*.\n\n`
      + `${destino ? `${destino}\n\n` : ''}Nuestro horario de atención es:\n${vars.horario}\n\n${seguimiento ? `${seguimiento}\n\n` : ''}`
      + `*CONDICIONES DEL SERVICIO - ${marca}*\n${CONDICIONES}`;
  if (seguimientoUrl && !texto.includes(seguimientoUrl)) texto += `\n\n${seguimiento}`;
  if (destino && p.direccionEntrega && !texto.includes(p.direccionEntrega)) texto += `\n\n${destino}`;
  return texto;
}

/** "Tu pedido va en camino": enlace de seguimiento en vivo, saldo y datos de Yape/Plin. */
export function mensajeEnCamino(p: Pedido, negocio?: ConfiguracionNegocio | null, seguimientoUrl?: string) {
  const cliente = (p.clienteNombre || 'Cliente').trim();
  const marca = (negocio?.nombreNegocio || 'tu lavandería').trim();
  const saldo = Math.max(0, p.total - p.montoPagado);
  const yape = (negocio?.yapeNumero || negocio?.telefono || '').trim();
  let texto = `¡Hola ${cliente}! Tu pedido #${p.numero} de ${marca} ya va en camino a tu dirección.`;
  if (seguimientoUrl) texto += ` Sigue al repartidor en tiempo real aquí:\n${seguimientoUrl}`;
  if (saldo > 0.009) texto += `\n\nRecuerda que tienes un monto pendiente: S/ ${saldo.toFixed(2)}.`;
  if (yape) texto += `\n\nSi vas a pagar por Yape/Plin a este número: ${yape}${negocio?.yapeTitular ? ` - ${negocio.yapeTitular}` : ''}`;
  return texto;
}

export function mensajeListo(p: Pedido) {
  const nombre = p.clienteNombre?.split(' ')[0] ?? '';
  const saldo = p.total - p.montoPagado;
  return `Hola ${nombre}, tu pedido #${p.numero} ya está listo para recoger.${saldo > 0.009 ? ` Saldo pendiente: S/ ${saldo.toFixed(2)}.` : ''} ¡Te esperamos!`;
}

export function mensajeCambioFecha(p: Pedido, nuevaFecha: string) {
  const nombre = p.clienteNombre?.split(' ')[0] ?? '';
  return `Hola ${nombre}, te avisamos que la fecha de entrega de tu pedido #${p.numero} cambió a: ${fechaEntregaTexto(nuevaFecha)}. Gracias por tu comprensión.`;
}

export function abrirWhatsapp(celular: string, mensaje: string) {
  return Linking.openURL(`${whatsappUrl(celular)}?text=${encodeURIComponent(mensaje)}`);
}
