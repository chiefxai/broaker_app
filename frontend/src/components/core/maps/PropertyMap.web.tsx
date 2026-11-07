import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { createOsmMapDocument } from './osm-map-document';
import { createGoogleMapDocument } from './google-map-document';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_PROVIDER, isValidCoordinate, parseMapInteractionMessage, parseMapPointMessage, type MapProviderId } from './provider';

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
  const frame = useRef<HTMLIFrameElement>(null);
  const valid = latitude != null && longitude != null && isValidCoordinate(latitude, longitude);
  const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB ?? '';
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || typeof event.data !== 'string') return;
      const interaction = parseMapInteractionMessage(event.data);
      if (interaction !== null) { onInteractionChange?.(interaction); return; }
      const point = parseMapPointMessage(event.data);
      if (point) onCoordinateSelect(point.latitude, point.longitude);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCoordinateSelect, onInteractionChange]);
  const center = valid ? { latitude: latitude!, longitude: longitude! } : DEFAULT_MAP_CENTER;
  if (provider === 'google' && googleMapsKey) {
    return React.createElement('iframe', {
      title: accessibilityLabel,
      ref: frame,
      srcDoc: createGoogleMapDocument(center.latitude, center.longitude, googleMapsKey, valid, Boolean(onCoordinateSelect)),
      style: { border: 0, display: 'block', width: '100%', height: '100%', touchAction: 'none' },
      loading: 'lazy',
      allow: 'fullscreen',
    });
  }

  return <View testID="property-map-interaction-shell" style={styles.mapShell} onTouchStart={() => onInteractionChange?.(true)} onTouchEnd={() => onInteractionChange?.(false)} onTouchCancel={() => onInteractionChange?.(false)}>
    {React.createElement('iframe', {
      title: accessibilityLabel,
      ref: frame,
      srcDoc: createOsmMapDocument(center.latitude, center.longitude, valid, Boolean(onCoordinateSelect)),
      style: { border: 0, display: 'block', width: '100%', height: '100%', touchAction: 'none' },
      loading: 'lazy',
      allow: 'fullscreen',
    })}
    {provider === 'google' ? <View pointerEvents="none" accessibilityLabel="Google Maps key missing; showing OpenStreetMap preview" style={[styles.fallbackBadge, { backgroundColor: colors.surface }]}><Text style={[styles.fallbackText, { color: colors.textSecondary }]}>OpenStreetMap preview · Google key missing</Text></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  empty: { height: '100%', minHeight: 176, width: '100%', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.three },
  emptyText: { ...Typography.bodySmall, textAlign: 'center' },
  mapShell: { height: '100%', width: '100%', position: 'relative' },
  fallbackBadge: { position: 'absolute', left: Spacing.two, bottom: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: 5 },
  fallbackText: { ...Typography.labelSmall },
});
