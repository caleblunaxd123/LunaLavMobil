import { describe, expect, it } from 'vitest';
import { isoDate, isPastDay, longDate, parseDate, relativeDay, roundMoney, shortDate, shortDateWithYear, trialEndsOnUtc } from './format';

const shift = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
};

describe('fechas de calendario local', () => {
  it('interpreta la fecha de hoy como hoy sin desplazarla por zona horaria', () => {
    expect(relativeDay(shift(0))).toBe('Hoy');
  });

  it('distingue ayer y mañana por día local', () => {
    expect(relativeDay(shift(-1))).toBe('Ayer');
    expect(relativeDay(shift(1))).toBe('Mañana');
  });

  it('marca como atrasado solo un día calendario anterior', () => {
    expect(isPastDay(shift(-1))).toBe(true);
    expect(isPastDay(shift(0))).toBe(false);
    expect(isPastDay(shift(1))).toBe(false);
  });

  it('formatea una fecha ISO de solo día en la misma fecha local', () => {
    const value = '2026-09-25';
    const expected = new Date(2026, 8, 25).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    expect(shortDate(value)).toBe(expected);
  });

  it('lee la fecha con hora sin zona de la API como hora local (no UTC)', () => {
    const d = parseDate('2026-09-27T18:00:00');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 8, 27, 18, 0]);
    const conFraccion = parseDate('2026-09-25T20:40:53.46');
    expect([conFraccion.getHours(), conFraccion.getMinutes(), conFraccion.getSeconds(), conFraccion.getMilliseconds()]).toEqual([20, 40, 53, 460]);
    // Con zona explícita se respeta la zona.
    expect(parseDate('2026-09-27T18:00:00Z').getTime()).toBe(Date.UTC(2026, 8, 27, 18));
  });

  it('un pedido de esta noche sigue siendo de hoy, no de mañana ni de ayer', () => {
    const noche = `${shift(0)}T23:30:00`;
    expect(relativeDay(noche)).toBe('Hoy');
    expect(isPastDay(noche)).toBe(false);
  });

  it('maneja valores ausentes o inválidos sin mostrar Invalid Date', () => {
    expect(relativeDay(null)).toBe('—');
    expect(relativeDay('no-es-fecha')).toBe('—');
    expect(shortDate('no-es-fecha')).toBe('—');
  });
});

describe('montos', () => {
  it('aplica el redondeo comercial del API a diez céntimos', () => {
    expect(roundMoney(6.55 + 1.31)).toBe(7.9);
    expect(roundMoney(12.345)).toBe(12.3);
    expect(roundMoney(12.35)).toBe(12.4);
    expect(roundMoney(12)).toBe(12);
  });
});

describe('fecha del primer pago', () => {
  it('coincide con la fecha UTC + 14 días que guarda el alta de la API', () => {
    expect(trialEndsOnUtc(new Date('2026-09-25T23:30:00-05:00'))).toBe('2026-10-10');
    expect(longDate('2026-10-10')).toBe('10 de octubre de 2026');
    expect(shortDateWithYear('2026-10-10')).toBe('10 oct. 2026');
  });
});
