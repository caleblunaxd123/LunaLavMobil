import { describe, expect, it } from 'vitest';
import type { CuadreCaja } from '../api/gestionApi';
import type { ConfiguracionNegocio } from '../api/pedidoApi';
import { construirCuadreHtml, estadoCuadre } from './cuadreHtml';

const negocio = { nombreNegocio: 'Lavandería Sol', ruc: '20123456789', costoDelivery: 0, valorPuntoCanje: 0, maxDescuentoPct: 0, solesPorPunto: 0 } as ConfiguracionNegocio;
const cuadre: CuadreCaja = {
  id: 12, fecha: '2026-09-30', usuarioId: 1, usuarioNombre: 'Caleb <Admin>', cajaInicial: 50, pedidosPagadosEfect: 120, gastos: 20,
  totalContado: 150, diferencia: 0, cajaFinal: 100, corte: 50, ingresosDigital: 36, ingresosTarjeta: 0, nota: 'Todo ok', fechaCreacion: '2026-09-30T22:10:00',
};

describe('cuadre de caja imprimible', () => {
  it('clasifica el resultado con tolerancia de centavos', () => {
    expect(estadoCuadre(0)).toBe('CUADRA');
    expect(estadoCuadre(0.004)).toBe('CUADRA');
    expect(estadoCuadre(5)).toBe('SOBRA');
    expect(estadoCuadre(-5)).toBe('FALTA');
  });

  it('arma el documento con movimientos, cierre, digitales, nota y firmas', () => {
    const html = construirCuadreHtml({ cuadre, negocio });
    expect(html).toContain('CUADRE DE CAJA');
    expect(html).toContain('miércoles 30 de septiembre de 2026');
    expect(html).toContain('= En caja debería haber</td><td class="r">S/ 150.00');
    expect(html).toContain('Cuadre exacto');
    expect(html).toContain('Ingresos digitales');
    expect(html).toContain('Todo ok');
    expect(html).toContain('Responsable de caja');
    expect(html).toContain('Caleb &lt;Admin&gt;');
  });

  it('muestra faltante y oculta digitales cuando no hay', () => {
    const html = construirCuadreHtml({ cuadre: { ...cuadre, diferencia: -12.5, ingresosDigital: 0, nota: undefined }, negocio });
    expect(html).toContain('Falta S/ 12.50');
    expect(html).toContain('estado FALTA');
    expect(html).not.toContain('Ingresos digitales');
    expect(html).not.toContain('<h3>Nota</h3>');
  });
});
