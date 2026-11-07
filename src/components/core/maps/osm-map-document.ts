export function createOsmMapDocument(latitude: number, longitude: number, showMarker = true, enablePointSelection = false): string {
  const lat = Math.min(85.0511, Math.max(-85.0511, latitude));
  const lon = Math.min(180, Math.max(-180, longitude));

  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box}html,body,#map{width:100%;height:100%;margin:0;overflow:hidden;font-family:system-ui,-apple-system,sans-serif}
#map{position:relative;background:#e9eee8;touch-action:none;overscroll-behavior:contain}#tiles{position:absolute;inset:0;overflow:hidden}
.tile{position:absolute;width:256px;height:256px;user-select:none;-webkit-user-drag:none}.tile.failed{background:#e5e7eb}
.marker{position:absolute;z-index:2;width:18px;height:18px;border:3px solid white;border-radius:50% 50% 50% 0;background:#25834f;box-shadow:0 1px 5px #0008;transform:translate(-50%,-100%) rotate(-45deg);pointer-events:none}
.controls{position:absolute;z-index:3;left:10px;top:10px;display:flex;flex-direction:column;gap:5px}.controls button{min-width:36px;height:36px;border:0;border-radius:6px;background:#fff;color:#172a20;font-size:22px;box-shadow:0 1px 5px #0004}
.attribution{position:absolute;right:0;bottom:0;z-index:3;padding:3px 6px;background:#ffffffdf;color:#26352a;font:11px/1.3 system-ui,sans-serif}.attribution a{color:#1769aa;text-decoration:none}
.hint{position:absolute;left:8px;bottom:8px;z-index:2;padding:4px 6px;border-radius:4px;background:#ffffffdf;color:#344238;font:11px/1.3 system-ui,sans-serif}
</style></head><body>
<main id="map" aria-label="OpenStreetMap property location"><div id="tiles"></div>
<div class="marker" aria-label="Property pin" style="${showMarker ? '' : 'display:none'}"></div>
<div class="controls"><button type="button" id="zoom-in" aria-label="Zoom in">+</button><button type="button" id="zoom-out" aria-label="Zoom out">−</button></div>
<div class="hint" id="map-hint">${enablePointSelection ? 'Tap once to place or move the pin · swipe to explore · pinch to zoom' : 'Swipe to explore · pinch, scroll, or use +/− to zoom'}</div>
<div class="attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a></div></main>
<script>
(function(){
  const map=document.getElementById('map'),layer=document.getElementById('tiles'),marker=document.querySelector('.marker');
  let lat=${lat},lon=${lon},centerLat=${lat},centerLon=${lon},zoom=15,drag=null,dragged=false,pinch=null,multiTouchActive=false;
  const activePointers=new Map();
  function sendInteraction(active){const message=JSON.stringify({type:'broaker-map-interaction',active});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*')}
  function project(a,o,z){const n=Math.pow(2,z),r=a*Math.PI/180;return{x:(o+180)/360*n*256,y:(1-Math.asinh(Math.tan(r))/Math.PI)/2*n*256}}
  function unproject(x,y,z){const n=Math.pow(2,z),o=x/(256*n)*360-180,r=Math.atan(Math.sinh(Math.PI*(1-2*y/(256*n))));return{lat:r*180/Math.PI,lon:o}}
  function render(){
    const w=map.clientWidth,h=map.clientHeight,p=project(centerLat,centerLon,zoom),point=project(lat,lon,zoom),left=w/2-p.x,top=h/2-p.y;
    const minX=Math.floor(-left/256),maxX=Math.floor((w-left)/256),minY=Math.floor(-top/256),maxY=Math.floor((h-top)/256),n=Math.pow(2,zoom);
    layer.replaceChildren();
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      if(y<0||y>=n)continue;
      const wrapped=(x%n+n)%n,img=document.createElement('img');
      img.className='tile';img.alt='';img.draggable=false;img.loading='lazy';
      img.src='https://tile.openstreetmap.org/'+zoom+'/'+wrapped+'/'+y+'.png';
      img.style.left=(left+x*256)+'px';img.style.top=(top+y*256)+'px';
      img.onerror=function(){img.classList.add('failed')};layer.appendChild(img);
    }
    if(marker){marker.style.left=(w/2+point.x-p.x)+'px';marker.style.top=(h/2+point.y-p.y)+'px'}
  }
  map.addEventListener('pointerdown',e=>{
    if(e.target.closest('button'))return;
    sendInteraction(true);
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});map.setPointerCapture(e.pointerId);
    if(activePointers.size>=2){
      const points=[...activePointers.values()],dx=points[1].x-points[0].x,dy=points[1].y-points[0].y;
      pinch={distance:Math.max(1,Math.hypot(dx,dy)),zoom};drag=null;multiTouchActive=true;dragged=true;layer.style.transform='';render();return;
    }
    drag={x:e.clientX,y:e.clientY,dx:0,dy:0,p:project(centerLat,centerLon,zoom),markerX:marker?parseFloat(marker.style.left):0,markerY:marker?parseFloat(marker.style.top):0};dragged=false;
  });
  map.addEventListener('pointermove',e=>{
    if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(activePointers.size>=2&&pinch){
      const points=[...activePointers.values()],dx=points[1].x-points[0].x,dy=points[1].y-points[0].y;
      const distance=Math.max(1,Math.hypot(dx,dy)),nextZoom=Math.max(3,Math.min(19,Math.round(pinch.zoom+Math.log2(distance/pinch.distance))));
      if(nextZoom!==zoom){zoom=nextZoom;render()}
      return;
    }
    if(!drag)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    drag.dx=dx;drag.dy=dy;
    if(Math.abs(dx)>8||Math.abs(dy)>8)dragged=true;
    layer.style.transform='translate('+dx+'px,'+dy+'px)';
    if(marker){marker.style.left=(drag.markerX+dx)+'px';marker.style.top=(drag.markerY+dy)+'px'}
  });
  function finishDrag(){
    if(!drag)return;
    const dx=drag.dx,dy=drag.dy;
    const center=unproject(drag.p.x-dx,drag.p.y-dy,zoom);centerLat=Math.max(-85.0511,Math.min(85.0511,center.lat));centerLon=((center.lon+180)%360+360)%360-180;
    drag=null;layer.style.transform='';render();
  }
  const hint=document.getElementById('map-hint');
  function selectPointAt(clientX,clientY){
      const rect=map.getBoundingClientRect(),center=project(centerLat,centerLon,zoom);
      const selected=unproject(center.x+clientX-rect.left-rect.width/2,center.y+clientY-rect.top-rect.height/2,zoom);
      lat=Math.max(-85.0511,Math.min(85.0511,selected.lat));lon=((selected.lon+180)%360+360)%360-180;
      if(marker)marker.style.display='block';if(hint)hint.textContent='Pin saved';render();
      const message=JSON.stringify({type:'broaker-map-point',latitude:Number(lat.toFixed(6)),longitude:Number(lon.toFixed(6))});
      if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*');
  }
  map.addEventListener('pointerup',e=>{
    activePointers.delete(e.pointerId);
    if(multiTouchActive){
      drag=null;pinch=null;layer.style.transform='';render();dragged=true;
      if(activePointers.size===0){multiTouchActive=false;sendInteraction(false);dragged=false}
      return;
    }
    const wasDragged=dragged;finishDrag();
    if(e.target.closest('button'))return;
    sendInteraction(false);
    if(${enablePointSelection}&&!wasDragged)selectPointAt(e.clientX,e.clientY);
    dragged=false;
  });
  map.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);finishDrag();pinch=null;dragged=false;if(activePointers.size===0){multiTouchActive=false;if(!e.target.closest('button'))sendInteraction(false)}});
  function changeZoom(delta){zoom=Math.max(3,Math.min(19,zoom+delta));render()}
  document.getElementById('zoom-in').onclick=()=>changeZoom(1);document.getElementById('zoom-out').onclick=()=>changeZoom(-1);
  map.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY<0?1:-1)},{passive:false});
  window.addEventListener('resize',render);render();
})();
</script></body></html>`;
}
