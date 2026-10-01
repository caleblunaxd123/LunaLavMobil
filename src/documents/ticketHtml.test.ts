import { describe, expect, it } from 'vitest';
import type { Pedido } from '../api/operationsApi';
import type { ConfiguracionNegocio } from '../api/pedidoApi';
import { anchoPaginaPt, condicionesLista, construirTicketHtml, escapeHtml, fechaLarga, marcaCorta, resolverLogo } from './ticketHtml';

const negocio: ConfiguracionNegocio = {
  nombreNegocio: 'Lavandería Primavera', direccion: 'Urb. Los Jardines Mz. B Lt. 4', telefono: '999888777', ruc: '20123456789',
  costoDelivery: 0, valorPuntoCanje: 0, maxDescuentoPct: 0, solesPorPunto: 0, anchoTicketMm: 80,
  mensajePieTicket: 'Gracias por su preferencia', condicionesServicio: '1. No nos responsabilizamos por prendas olvidadas.\n2. Plazo de reclamo: 24 horas.',
  notasProduccion: 'Separar por colores',
};

const pedido: Pedido = {
  id: 7, numero: 7, clienteId: 1, clienteNombre: 'Ana <Torres>', clienteCelular: '987654321', usuarioNombre: 'Admin',
  fechaIngreso: '2026-09-30T23:03:00', fechaEntregaEst: '2026-10-01T18:30:00', modalidad: 'Tienda', clientePuntos: 120,
  subtotal: 36, descuento: 0, esUrgente: false, recargoUrgente: 0, redondeo: 0, total: 36, montoPagado: 10,
  estadoPago: 'PARCIAL', estadoProceso: 'PENDIENTE', areaActualNombre: 'Recepcion', observaciones: 'Cuello manchado', anulado: false,
  items: [{ id: 1, servicioId: 1, servicioNombre: 'Lavado en seco', cantidad: 3, precioUnit: 12, total: 36, descripcion: 'Saco gris', cantidadEntregada: 0 }],
};

describe('ticket HTML', () => {
  it('arma el ticket del cliente con datos del negocio, totales y condiciones', () => {
    const html = construirTicketHtml({ pedido, negocio, tipo: 'CLIENTE', mostrarDescripcion: false });
    expect(html).toContain('Lavandería Primavera');
    expect(html).toContain('RUC: 20123456789');
    expect(html).toContain('N° 7');
    expect(html).toContain('PAGO PENDIENTE');
    expect(html).toContain('S/ 26.00');
    expect(html).toContain('CONDICIONES DEL SERVICIO - PRIMAVERA');
    expect(html).toContain('Plazo de reclamo: 24 horas.');
    expect(html).toContain('Puntos acumulados: 120');
    expect(html).not.toContain('Saco gris'); // la descripción de prendas es opcional
  });

  it('escapa HTML del cliente para que no rompa el documento', () => {
    const html = construirTicketHtml({ pedido, negocio, tipo: 'CLIENTE', mostrarDescripcion: false });
    expect(html).toContain('Ana &lt;Torres&gt;');
    expect(html).not.toContain('Ana <Torres>');
    expect(escapeHtml(`"a" & 'b'`)).toBe('&quot;a&quot; &amp; &#39;b&#39;');
  });

  it('el ticket de producción omite el encabezado, muestra descripciones y notas de producción', () => {
    const html = construirTicketHtml({ pedido, negocio, tipo: 'PRODUCCION', mostrarDescripcion: false });
    expect(html).toContain('ORDEN DE PRODUCCIÓN');
    expect(html).toContain('Saco gris');
    expect(html).toContain('NOTAS PARA PRODUCCIÓN');
    expect(html).toContain('Separar por colores');
    expect(html).not.toContain('RUC:');
    expect(html).not.toContain('CONDICIONES DEL SERVICIO');
  });

  it('marca pago completo cuando no hay saldo y usa el ancho de 58 mm', () => {
    const html = construirTicketHtml({ pedido: { ...pedido, montoPagado: 36 }, negocio: { ...negocio, anchoTicketMm: 58 }, tipo: 'CLIENTE', mostrarDescripcion: true });
    expect(html).toContain('PAGO COMPLETO');
    expect(html).toContain('width: 58mm');
    expect(html).toContain('Saco gris');
  });

  it('incluye datos de destino y recargo para delivery urgente', () => {
    const html = construirTicketHtml({
      pedido: { ...pedido, modalidad: 'Delivery', direccionEntrega: 'Av. Lima 123', distritoEntrega: 'Miraflores', latitudEntrega: -12.1, longitudEntrega: -77.03, esUrgente: true, recargoUrgente: 5, total: 41 },
      negocio, tipo: 'CLIENTE', mostrarDescripcion: false,
    });
    expect(html).toContain('DESTINO DE ENTREGA');
    expect(html).toContain('GPS: -12.1, -77.03');
    expect(html).toContain('Entrega (delivery)');
    expect(html).toContain('PEDIDO URGENTE');
    expect(html).toContain('Recargo urgente');
  });
});

describe('utilidades del ticket', () => {
  it('formatea la fecha como el ticket de la web', () => {
    expect(fechaLarga('2026-08-24T10:11:00')).toBe('24 de agosto, 2026 / 10:11 am');
    expect(fechaLarga('2026-09-30T23:03:00')).toBe('30 de septiembre, 2026 / 11:03 pm');
    expect(fechaLarga('2026-09-30T00:05:00')).toBe('30 de septiembre, 2026 / 12:05 am');
    expect(fechaLarga(null)).toBe('');
  });

  it('calcula marca corta, condiciones y ancho de página', () => {
    expect(marcaCorta('Lavandería Primavera')).toBe('PRIMAVERA');
    expect(marcaCorta('Lavanderia Sol')).toBe('SOL');
    expect(condicionesLista('1. Uno\n\n2. Dos ')).toEqual(['Uno', 'Dos']);
    expect(anchoPaginaPt(80)).toBe(227);
    expect(anchoPaginaPt(58)).toBe(164);
  });

  it('resuelve el logo relativo contra el origen de la API', () => {
    expect(resolverLogo('/api/configuracion/logo/negocio-1-a.png', 'https://app.lunalav.pe/')).toBe('https://app.lunalav.pe/api/configuracion/logo/negocio-1-a.png');
    expect(resolverLogo('https://x.pe/l.png', 'https://app.lunalav.pe')).toBe('https://x.pe/l.png');
    expect(resolverLogo('data:image/png;base64,AAA', 'https://app.lunalav.pe')).toBe('data:image/png;base64,AAA');
    expect(resolverLogo(null, 'https://app.lunalav.pe')).toBeNull();
  });
});
