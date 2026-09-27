import { describe, expect, it } from 'vitest';
import { buildMapHtml } from './mapHtml';

const html = buildMapHtml({ lat: -12.1105, lng: -76.9913, zoom: 17, marker: true, interactive: true, channel: 'm1' });

describe('buildMapHtml', () => {
  it('embebe Leaflet sin depender de un CDN', () => {
    expect(html).not.toMatch(/unpkg\.com|cdn\.jsdelivr/);
    expect(html).toContain('L.map(');
    expect(html).toContain('.leaflet-container');
  });

  it('no deja etiquetas de cierre que corten el HTML', () => {
    const scripts = html.match(/<script>/g)?.length ?? 0;
    expect(html.match(/<\/script>/g)?.length).toBe(scripts);
  });

  it('usa el canal y el punto indicados', () => {
    expect(html).toContain('"m1"');
    expect(html).toContain('-12.1105,-76.9913');
  });
});
