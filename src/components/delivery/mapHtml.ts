/**
 * Página del mapa (Leaflet + OpenStreetMap, igual que LunaLav web). Se carga en un WebView
 * (Android/iOS) o en un iframe (web) y se comunica por mensajes:
 *  - entrada: { type: 'set', lat, lng, zoom?, center? } | { type: 'clear' }
 *  - salida:  { type: 'ready' } | { type: 'tap', lat, lng }
 */
export function buildMapHtml(opts: { lat: number; lng: number; zoom: number; marker: boolean; interactive: boolean; channel: string }) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{margin:0;height:100%;width:100%;background:#e8eef5}
.leaflet-control-attribution{font-size:9px}
.pin{width:22px;height:22px;border-radius:50%;background:#00245E;border:4px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)}
.pulse{position:absolute;left:-9px;top:-9px;width:40px;height:40px;border-radius:50%;background:rgba(0,154,254,.25)}
.off{display:flex;height:100%;align-items:center;justify-content:center;text-align:center;padding:16px;box-sizing:border-box;font:13px/1.4 sans-serif;color:#475569}</style>
</head><body><div id="m"></div><script>
(function(){
  var CH=${JSON.stringify(opts.channel)};
  function send(msg){msg.channel=CH;var s=JSON.stringify(msg);
    if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s)}else if(window.parent){window.parent.postMessage(s,'*')}}
  // Sin conexión el mapa no carga: se avisa en vez de dejar un recuadro vacío.
  if(!window.L){document.getElementById('m').innerHTML='<div class="off">No se pudo cargar el mapa. Revisa tu conexión a internet.${opts.marker ? '<br>Punto: ' + opts.lat.toFixed(5) + ', ' + opts.lng.toFixed(5) : ''}</div>';send({type:'ready'});return;}
  var map=L.map('m',{zoomControl:${opts.interactive},attributionControl:true,dragging:${opts.interactive},scrollWheelZoom:${opts.interactive},
    doubleClickZoom:${opts.interactive},touchZoom:${opts.interactive},tap:${opts.interactive}}).setView([${opts.lat},${opts.lng}],${opts.zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
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
