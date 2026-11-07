import { StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '@/components/core/icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

import { PropertyMap } from './PropertyMap';
import { isValidCoordinate } from './provider';

export interface PropertyMapPreviewProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  title?: string;
  accessibilityLabel?: string;
  mapHeight?: number;
}

/** Read-only, reusable map summary for review and detail surfaces. */
export function PropertyMapPreview({
  latitude,
  longitude,
  address,
  title = 'Property Location Preview',
  accessibilityLabel = 'Property location preview map',
  mapHeight = 190,
}: PropertyMapPreviewProps) {
  const colors = useTheme();
  const coordinatesAvailable = latitude != null && longitude != null && isValidCoordinate(latitude, longitude);

  return <View style={styles.section} testID="property-review-location-preview">
    <View style={styles.heading}>
      <AppIcon name="map" size={20} color={colors.accent} />
      <Text style={[styles.headingText, { color: colors.text }]}>{title}</Text>
    </View>
    <View style={[styles.map, { height: mapHeight, backgroundColor: colors.surfaceLow }]}>
      <PropertyMap
        latitude={coordinatesAvailable ? latitude : null}
        longitude={coordinatesAvailable ? longitude : null}
        accessibilityLabel={accessibilityLabel}
      />
      <View style={[styles.status, { backgroundColor: colors.surface }]}>
        <AppIcon name={coordinatesAvailable ? 'location_on' : 'location_off'} size={17} color={coordinatesAvailable ? colors.accent : colors.iconMuted} />
        <Text style={[styles.statusText, { color: colors.text }]}>{coordinatesAvailable ? 'Pin selected' : 'Pin not set'}</Text>
      </View>
    </View>
    <Text style={[styles.address, { color: colors.textSecondary }]}>{address || 'Address details not set'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  heading: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  headingText: { ...Typography.title },
  map: { borderRadius: Radius.medium, overflow: 'hidden', position: 'relative' },
  status: { position: 'absolute', left: Spacing.two, bottom: Spacing.two, minHeight: 34, paddingHorizontal: Spacing.two, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  statusText: { ...Typography.labelSmall },
  address: { ...Typography.bodySmall },
});
