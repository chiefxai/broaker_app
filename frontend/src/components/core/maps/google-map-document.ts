export function createGoogleMapDocument(latitude: number, longitude: number, apiKey: string, showMarker = true, enablePointSelection = false): string {
  const lat = Math.min(85.0511, Math.max(-85.0511, latitude));
  const lon = Math.min(180, Math.max(-180, longitude));
  const key = encodeURIComponent(apiKey.trim());
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{box-sizing:border-box}html,body,#map{width:100%;height:100%;margin:0}#map{background:#eef2ed;touch-action:none;overscroll-behavior:contain}.hint{position:absolute;z-index:2;left:10px;bottom:10px;padding:5px 8px;border-radius:4px;background:#ffffffed;color:#344238;font:12px system-ui,sans-serif}</style></head><body>
<div id="map" aria-label="Google Maps property location"></div>
${enablePointSelection ? '<div id="map-hint" class="hint">Tap once to place or move the pin · drag to explore</div>' : ''}
<script>
function sendMapMessage(message){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*')}
function sendMapInteraction(active){sendMapMessage(JSON.stringify({type:'broaker-map-interaction',active}))}
let map,marker;
window.initGoogleMap=function(){
  map=new google.maps.Map(document.getElementById('map'),{center:{lat:${lat},lng:${lon}},zoom:15,mapTypeControl:false,streetViewControl:false,fullscreenControl:true,clickableIcons:false,disableDoubleClickZoom:true});
  ${showMarker || enablePointSelection ? `marker=new google.maps.Marker({position:{lat:${lat},lng:${lon}},map:${showMarker ? 'map' : 'null'},title:'Property location',draggable:false});` : ''}
  ${enablePointSelection ? `const hint=document.getElementById('map-hint');map.addListener('click',function(event){if(!event.latLng)return;const point={latitude:Number(event.latLng.lat().toFixed(6)),longitude:Number(event.latLng.lng().toFixed(6))};marker.setPosition(event.latLng);marker.setMap(map);hint.textContent='Pin saved';sendMapMessage(JSON.stringify({type:'broaker-map-point',...point}))});` : ''}
  const mapElement=document.getElementById('map');mapElement.addEventListener('pointerdown',function(event){if(!event.target.closest('button'))sendMapInteraction(true)});window.addEventListener('pointerup',function(){sendMapInteraction(false)});window.addEventListener('pointercancel',function(){sendMapInteraction(false)});
};
window.setTimeout(function(){if(!window.google)document.getElementById('map').textContent='Google Maps could not load. Check the browser API key and network connection.'},8000);
</script><script async src="https://maps.googleapis.com/maps/api/js?key=${key}&callback=initGoogleMap&loading=async"></script>
</body></html>`;
}
