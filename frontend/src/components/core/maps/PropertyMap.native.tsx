import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { WebView } from 'react-native-webview';

import { Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { createOsmMapDocument } from './osm-map-document';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_PROVIDER, isValidCoordinate, MAP_PROVIDERS, parseMapInteractionMessage, parseMapPointMessage, type MapProviderId } from './provider';

export interface PropertyMapProps {
  latitude: number | null;
  longitude: number | null;
  provider?: MapProviderId;
  accessibilityLabel?: string;
  onCoordinateSelect?: (latitude: number, longitude: number) => void;
  onInteractionChange?: (active: boolean) => void;
}

export function PropertyMap({ latitude, longitude, provider = DEFAULT_MAP_PROVIDER, accessibilityLabel = 'Property location map', onCoordinateSelect, onInteractionChange }: PropertyMapProps) {
  const colors = useTheme();
  const [mapKey, setMapKey] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const valid = latitude != null && longitude != null && isValidCoordinate(latitude, longitude);
  const googleMapsKey = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS
    : process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID;
  const googleAvailable = provider === 'google' && Boolean(googleMapsKey);
  const mapLatitude = valid ? latitude! : DEFAULT_MAP_CENTER.latitude;
  const mapLongitude = valid ? longitude! : DEFAULT_MAP_CENTER.longitude;
  const region = useMemo(() => ({
    latitude: mapLatitude, longitude: mapLongitude, latitudeDelta: 0.012, longitudeDelta: 0.012,
  }), [mapLatitude, mapLongitude]);

  if (googleAvailable) {
    return <View style={styles.mapContainer} testID="property-map-interaction-shell" onTouchStart={() => onInteractionChange?.(true)} onTouchEnd={() => onInteractionChange?.(false)} onTouchCancel={() => onInteractionChange?.(false)}>
      <MapView accessibilityLabel={accessibilityLabel} style={styles.map} region={region} provider={PROVIDER_GOOGLE} mapType="standard" zoomEnabled onTouchStart={() => onInteractionChange?.(true)} onTouchEnd={() => onInteractionChange?.(false)} onTouchCancel={() => onInteractionChange?.(false)} onPress={(event) => {
        if (!onCoordinateSelect) return;
        onCoordinateSelect(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude);
      }}>
        {valid ? <Marker coordinate={{ latitude: latitude!, longitude: longitude! }} title="Property location" /> : null}
      </MapView>
    </View>;
  }

  return <View style={styles.mapContainer} testID="property-map-interaction-shell" onTouchStart={() => onInteractionChange?.(true)} onTouchEnd={() => onInteractionChange?.(false)} onTouchCancel={() => onInteractionChange?.(false)}>
    {loadFailed ? <View style={[styles.failed, { backgroundColor: colors.surfaceLow }]}>
      <Text accessibilityRole="alert" style={[styles.emptyText, { color: colors.textSecondary }]}>Map could not be loaded.</Text>
      <Pressable accessibilityRole="button" onPress={() => { setLoadFailed(false); setMapKey((key) => key + 1); }}><Text style={[styles.retryText, { color: colors.accent }]}>Retry map</Text></Pressable>
    </View> : <>
      <WebView key={mapKey} testID="property-location-map" accessibilityLabel={accessibilityLabel} style={styles.map} source={{ html: createOsmMapDocument(mapLatitude, mapLongitude, valid, Boolean(onCoordinateSelect)) }} originWhitelist={['*']} userAgent={MAP_PROVIDERS.openstreetmap.userAgent} javaScriptEnabled domStorageEnabled cacheEnabled scrollEnabled={false} nestedScrollEnabled={false} onMessage={(event) => {
        const interaction = parseMapInteractionMessage(event.nativeEvent.data);
        if (interaction !== null) { onInteractionChange?.(interaction); return; }
        const point = parseMapPointMessage(event.nativeEvent.data);
        if (point) onCoordinateSelect?.(point.latitude, point.longitude);
      }} onError={() => setLoadFailed(true)} />
      {provider === 'google' ? <View pointerEvents="none" accessibilityLabel="Google Maps key missing; showing OpenStreetMap preview" style={[styles.fallbackBadge, { backgroundColor: colors.surface }]}><Text style={[styles.pointToolText, { color: colors.textSecondary }]}>OpenStreetMap preview · Google key missing</Text></View> : null}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  mapContainer: { height: '100%', width: '100%' },
  map: { flex: 1 },
  empty: { height: '100%', minHeight: 176, width: '100%', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.three },
  emptyText: { ...Typography.bodySmall, textAlign: 'center' },
  failed: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.three },
  retryText: { ...Typography.label },
  pointToolText: { ...Typography.labelSmall },
  fallbackBadge: { position: 'absolute', left: Spacing.two, bottom: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: 5 },
});
