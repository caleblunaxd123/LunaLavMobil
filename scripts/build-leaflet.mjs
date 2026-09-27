// Genera src/components/delivery/leafletAssets.ts con Leaflet embebido (JS + CSS) para que el mapa
// no dependa de un CDN externo. Ejecutar tras actualizar el paquete `leaflet`: npm run build:leaflet
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dist = (f) => require.resolve(`leaflet/dist/${f}`);
const { version } = JSON.parse(readFileSync(require.resolve('leaflet/package.json'), 'utf8'));
const js = readFileSync(dist('leaflet.js'), 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '');
// Las imágenes de controles (capas, marcador por defecto) no se usan: el marcador es un divIcon.
const css = readFileSync(dist('leaflet.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
// Evita que el HTML final se corte si el código contiene la etiqueta de cierre de script.
const safe = (s) => s.replace(/<\/(script|style)/gi, '<\\/$1');

writeFileSync(new URL('../src/components/delivery/leafletAssets.ts', import.meta.url),
  `// Generado por scripts/build-leaflet.mjs a partir de leaflet@${version}. No editar a mano.\n` +
  `export const LEAFLET_VERSION = ${JSON.stringify(version)};\n` +
  `export const LEAFLET_CSS = ${JSON.stringify(safe(css))};\n` +
  `export const LEAFLET_JS = ${JSON.stringify(safe(js))};\n`);
console.log(`leafletAssets.ts generado (leaflet ${version}, ${Math.round((js.length + css.length) / 1024)} KB)`);
