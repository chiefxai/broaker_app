import { describe, expect, it } from '@jest/globals';

import { DEFAULT_MAP_CENTER, DEFAULT_MAP_PROVIDER, isValidCoordinate, MAP_PROVIDERS, parseMapInteractionMessage, parseMapPointMessage } from '@/components/core/maps/provider';
import { createOsmMapDocument } from '@/components/core/maps/osm-map-document';
import { createGoogleMapDocument } from '@/components/core/maps/google-map-document';
import { propertyMapFixture } from '../fixtures/property-map';

describe('map provider configuration', () => {
  it('defaults shared map components to Google Maps and retains OSM attribution metadata', () => {
    expect(DEFAULT_MAP_PROVIDER).toBe('google');
    expect(MAP_PROVIDERS.openstreetmap.attributionUrl).toBe('https://www.openstreetmap.org/copyright');
  });

  it('renders a default OSM viewport without showing a false property pin', () => {
    const document = createOsmMapDocument(DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude, false);
    expect(document).toContain('https://tile.openstreetmap.org/');
    expect(document).toContain('<div class="marker" aria-label="Property pin" style="display:none"></div>');
    expect(document).not.toContain('id="set-point"');
  });

  it('renders an in-app tile map with visible attribution instead of framing the OSM website', () => {
    const document = createOsmMapDocument(propertyMapFixture.latitude, propertyMapFixture.longitude);
    expect(document).toContain('https://tile.openstreetmap.org/');
    expect(document).toContain('© <a href="https://www.openstreetmap.org/copyright"');
    expect(document).not.toContain('export/embed.html');
    expect(document).toContain('aria-label="Property pin"');
  });

  it('builds an interactive Google map document with restricted-key injection and point capture', () => {
    const document = createGoogleMapDocument(propertyMapFixture.latitude, propertyMapFixture.longitude, 'browser-test-key', false, true);
    expect(document).toContain('https://maps.googleapis.com/maps/api/js?key=browser-test-key');
    expect(document).toContain('new google.maps.Map');
    expect(document).toContain('event.latLng.lat()');
    expect(document).toContain('window.parent.postMessage(message');
    expect(document).toContain('draggable:false');
    expect(document).not.toContain("marker.addListener('dragend'");
    expect(document).toContain('Tap once to place or move the pin');
    expect(document).toContain('disableDoubleClickZoom:true');
    expect(document).toContain("map.addListener('click'");
    expect(document).not.toContain('Place pin');
    expect(document).toContain('broaker-map-interaction');
    expect(document).not.toContain('tile.openstreetmap.org');
  });

  it('supports one-tap pin placement and posts map gestures and selected coordinates to the app', () => {
    const document = createOsmMapDocument(propertyMapFixture.latitude, propertyMapFixture.longitude, false, true);
    expect(document).not.toContain('id="set-point"');
    expect(document).toContain('Tap once to place or move the pin');
    expect(document).toContain('map.addEventListener(\'pointerup\'');
    expect(document).toContain('if(true&&!wasDragged)selectPointAt(e.clientX,e.clientY)');
    expect(document).toContain(`centerLat=${propertyMapFixture.latitude},centerLon=${propertyMapFixture.longitude}`);
    expect(document).toContain('centerLat=Math.max(-85.0511,Math.min(85.0511,center.lat))');
    expect(document).toContain('if(Math.abs(dx)>8||Math.abs(dy)>8)dragged=true');
    expect(document).toContain('const activePointers=new Map()');
    expect(document).toContain('Math.log2(distance/pinch.distance)');
    expect(document).toContain('nextZoom!==zoom');
    expect(document).toContain('broaker-map-point');
    expect(document).toContain('touch-action:none');
    expect(document).toContain('broaker-map-interaction');
    expect(document).toContain("window.parent.postMessage(message,'*')");
    expect(document).toContain('window.ReactNativeWebView.postMessage(message)');
  });

  it('parses only explicit map gesture start and end messages', () => {
    expect(parseMapInteractionMessage('{"type":"broaker-map-interaction","active":true}')).toBe(true);
    expect(parseMapInteractionMessage('{"type":"broaker-map-interaction","active":false}')).toBe(false);
    expect(parseMapInteractionMessage('{"type":"broaker-map-interaction","active":"true"}')).toBeNull();
    expect(parseMapInteractionMessage('{"type":"other","active":true}')).toBeNull();
  });

  it('parses only valid point selections from the map bridge', () => {
    expect(parseMapPointMessage('{"type":"broaker-map-point","latitude":13.08,"longitude":80.27}')).toEqual({ latitude: 13.08, longitude: 80.27 });
    expect(parseMapPointMessage('{"type":"other","latitude":13.08,"longitude":80.27}')).toBeNull();
    expect(parseMapPointMessage('{"type":"broaker-map-point","latitude":91,"longitude":80.27}')).toBeNull();
  });

  it('accepts geographic boundaries and rejects invalid coordinates', () => {
    expect(isValidCoordinate(-90, 180)).toBe(true);
    expect(isValidCoordinate(90.01, 0)).toBe(false);
    expect(isValidCoordinate(Number.NaN, 0)).toBe(false);
  });
});
