import { describe, expect, it } from 'vitest';
import { fechaPeru } from './format';
import { parseFechaPeru, rangoDe } from './rangos';

const hoy = new Date(2026, 2, 15); // 15 de marzo de 2026

describe('rangos de fechas de los reportes', () => {
  it('calcula los atajos con fecha local', () => {
    expect(rangoDe('hoy', hoy)).toEqual({ desde: '2026-03-15', hasta: '2026-03-15' });
    expect(rangoDe('ayer', hoy)).toEqual({ desde: '2026-03-14', hasta: '2026-03-14' });
    expect(rangoDe('7d', hoy)).toEqual({ desde: '2026-03-09', hasta: '2026-03-15' });
    expect(rangoDe('30d', hoy)).toEqual({ desde: '2026-02-14', hasta: '2026-03-15' });
    expect(rangoDe('mes', hoy)).toEqual({ desde: '2026-03-01', hasta: '2026-03-15' });
    expect(rangoDe('anio', hoy)).toEqual({ desde: '2026-01-01', hasta: '2026-03-15' });
  });

  it('el mes pasado termina el último día aunque cambie de año', () => {
    expect(rangoDe('mesPasado', hoy)).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    expect(rangoDe('mesPasado', new Date(2026, 0, 10))).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' });
  });

  it('lee fechas peruanas y rechaza las que no existen', () => {
    expect(parseFechaPeru('25/12/2026')).toBe('2026-12-25');
    expect(parseFechaPeru('5-3-2026')).toBe('2026-03-05');
    expect(parseFechaPeru('31/02/2026')).toBeNull();
    expect(parseFechaPeru('2026-12-25')).toBeNull();
    expect(parseFechaPeru('')).toBeNull();
  });

  it('muestra fechas de la API como dd/mm/aaaa', () => {
    expect(fechaPeru('2026-12-25')).toBe('25/12/2026');
    expect(fechaPeru('2026-12-25T00:00:00')).toBe('25/12/2026');
    expect(fechaPeru(null)).toBe('');
  });
});
