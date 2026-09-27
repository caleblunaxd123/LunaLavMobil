import { LEAFLET_CSS, LEAFLET_JS } from './leafletAssets';
import { MAP_ATTRIBUTION, MAP_TILE_URL } from './mapConfig';

/**
 * Página del mapa (Leaflet embebido, igual que LunaLav web; proveedor en mapConfig.ts). Se carga en un WebView
 * (Android/iOS) o en un iframe (web) y se comunica por mensajes:
 *  - entrada: { type: 'set', lat, lng, zoom?, center? } | { type: 'clear' }
 *  - salida:  { type: 'ready' } | { type: 'tap', lat, lng }
 */
export function buildMapHtml(opts: { lat: number; lng: number; zoom: number; marker: boolean; interactive: boolean; channel: string }) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>${LEAFLET_CSS}</style>
<script>${LEAFLET_JS}</script>
<style>html,body,#m{margin:0;height:100%;width:100%;background:#e8eef5}
.leaflet-control-attribution{font-size:9px}
.pin{width:22px;height:22px;border-radius:50%;background:#00245E;border:4px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)}
.pulse{position:absolute;left:-9px;top:-9px;width:40px;height:40px;border-radius:50%;background:rgba(0,154,254,.25)}
.warn{position:absolute;left:8px;right:8px;bottom:8px;z-index:1000;background:rgba(255,255,255,.95);border-radius:8px;padding:6px 8px;font:12px/1.3 sans-serif;color:#475569;text-align:center}
.off{display:flex;height:100%;align-items:center;justify-content:center;text-align:center;padding:16px;box-sizing:border-box;font:13px/1.4 sans-serif;color:#475569}</style>
</head><body><div id="m"></div><script>
(function(){
  var CH=${JSON.stringify(opts.channel)};
  function send(msg){msg.channel=CH;var s=JSON.stringify(msg);
    if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s)}else if(window.parent){window.parent.postMessage(s,'*')}}
  // Sin conexión el mapa no carga: se avisa en vez de dejar un recuadro vacío.
  if(!window.L){document.getElementById('m').innerHTML='<div class="off">No se pudo mostrar el mapa en este equipo.${opts.marker ? '<br>Punto: ' + opts.lat.toFixed(5) + ', ' + opts.lng.toFixed(5) : ''}</div>';send({type:'ready'});return;}
  var map=L.map('m',{zoomControl:${opts.interactive},attributionControl:true,dragging:${opts.interactive},scrollWheelZoom:${opts.interactive},
    doubleClickZoom:${opts.interactive},touchZoom:${opts.interactive},tap:${opts.interactive}}).setView([${opts.lat},${opts.lng}],${opts.zoom});
  var tiles=L.tileLayer(${JSON.stringify(MAP_TILE_URL)},{maxZoom:19,attribution:${JSON.stringify(MAP_ATTRIBUTION)}}).addTo(map);
  // Leaflet está embebido; lo que puede faltar sin internet son las imágenes del mapa.
  var failed=0;tiles.on('tileerror',function(){if(++failed===4){var b=document.createElement('div');b.className='warn';b.textContent='Sin conexión: el mapa no se ve completo, pero el punto queda guardado.';document.body.appendChild(b)}});
  var icon=L.divIcon({className:'',html:'<div class="pulse"></div><div class="pin"></div>',iconSize:[22,22],iconAnchor:[11,11]});
  var marker=${opts.marker}?L.marker([${opts.lat},${opts.lng}],{icon:icon}).addTo(map):null;
  function set(lat,lng,zoom,center){
    if(!marker){marker=L.marker([lat,lng],{icon:icon}).addTo(map)}else{marker.setLatLng([lat,lng])}
    if(center!==false)map.setView([lat,lng],zoom||Math.max(map.getZoom(),17));
  }
  function handle(raw){try{var d=typeof raw==='string'?JSON.parse(raw):raw;if(!d||d.channel!==CH)return;
    if(d.type==='set')set(d.lat,d.lng,d.zoom,d.center);
    if(d.type==='clear'&&marker){map.removeLayer(marker);marker=null}}catch(e){}}
  window.__lunalav=handle;
  window.addEventListener('message',function(e){handle(e.data)});
  document.addEventListener('message',function(e){handle(e.data)});
  ${opts.interactive ? "map.on('click',function(e){set(e.latlng.lat,e.latlng.lng,null,false);send({type:'tap',lat:e.latlng.lat,lng:e.latlng.lng})});" : ''}
  setTimeout(function(){map.invalidateSize()},150);
  send({type:'ready'});
})();
</script></body></html>`;
}
