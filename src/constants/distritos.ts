/** Distritos de Lima Metropolitana y el Callao (los mismos que usa LunaLav web para el delivery). */
export const DISTRITOS = [
  'Ancón', 'Ate', 'Barranco', 'Bellavista', 'Breña', 'Callao', 'Carabayllo', 'Carmen de la Legua-Reynoso',
  'Chaclacayo', 'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino', 'Independencia', 'Jesús María', 'La Molina',
  'La Perla', 'La Punta', 'La Victoria', 'Lima', 'Lince', 'Los Olivos', 'Lurigancho-Chosica', 'Lurín',
  'Magdalena del Mar', 'Mi Perú', 'Miraflores', 'Pachacámac', 'Pucusana', 'Pueblo Libre', 'Puente Piedra',
  'Punta Hermosa', 'Punta Negra', 'Rímac', 'San Bartolo', 'San Borja', 'San Isidro', 'San Juan de Lurigancho',
  'San Juan de Miraflores', 'San Luis', 'San Martín de Porres', 'San Miguel', 'Santa Anita', 'Santa María del Mar',
  'Santa Rosa', 'Santiago de Surco', 'Surquillo', 'Ventanilla', 'Villa El Salvador', 'Villa María del Triunfo',
] as const;

export const normalizeText = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** Ajusta el distrito que devuelve el mapa ("Surco", "santiago de surco") al nombre oficial de la lista. */
export function matchDistrito(value?: string | null): string | null {
  if (!value) return null;
  const v = normalizeText(value);
  const exact = DISTRITOS.find((d) => normalizeText(d) === v);
  if (exact) return exact;
  if (v === 'surco') return 'Santiago de Surco';
  if (v === 'magdalena') return 'Magdalena del Mar';
  return DISTRITOS.find((d) => normalizeText(d).includes(v) || v.includes(normalizeText(d))) ?? value;
}

/** Centro de Lima: punto de partida del mapa cuando aún no hay ubicación. */
export const LIMA_CENTER = { latitud: -12.0464, longitud: -77.0428 };
