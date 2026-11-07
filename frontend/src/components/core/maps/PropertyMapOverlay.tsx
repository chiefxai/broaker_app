import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '@/components/core/icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { isValidCoordinate } from './provider';
import { PropertyMap } from './PropertyMap';

export interface PropertyMapOverlayProps {
  visible: boolean;
  latitude: number | null;
  longitude: number | null;
  address: { village: string; pincode: string; taluk: string; district: string; state: string };
  onClose: () => void;
  onCoordinateSelect: (latitude: number, longitude: number) => void;
  onInteractionChange?: (active: boolean) => void;
}

export function PropertyMapOverlay({ visible, latitude, longitude, address, onClose, onCoordinateSelect, onInteractionChange }: PropertyMapOverlayProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [showAddress, setShowAddress] = useState(false);
  const coordinatesAvailable = latitude != null && longitude != null && isValidCoordinate(latitude, longitude);
  const addressRows = [
    { label: 'Address', value: address.village },
    { label: 'Pincode', value: address.pincode },
    { label: 'Taluk', value: address.taluk },
    { label: 'District', value: address.district },
    { label: 'State', value: address.state },
  ];

  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
    <View style={[styles.screen, { backgroundColor: colors.surface }]} testID="property-map-overlay">
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Spacing.two), paddingLeft: Math.max(insets.left, Spacing.three), paddingRight: Math.max(insets.right, Spacing.three) }]}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>Choose property location</Text>
          <Text style={[styles.instruction, { color: colors.textSecondary }]}>Tap once to move the pin · swipe to explore · pinch to zoom</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={showAddress ? 'Hide location details' : 'Show location details'} accessibilityState={{ expanded: showAddress }} onPress={() => setShowAddress((shown) => !shown)} hitSlop={8} style={[styles.infoButton, { backgroundColor: colors.surfaceLow }]} testID="toggle-map-location-details">
          <AppIcon name="info" size={20} color={colors.accent} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Close expanded map" onPress={onClose} hitSlop={8} style={[styles.closeButton, { backgroundColor: colors.surfaceLow }]} testID="close-expanded-location-map">
          <AppIcon name="close" size={20} color={colors.text} />
        </Pressable>
      </View>
      <Animated.View layout={LinearTransition.duration(180)} style={styles.mapCanvas}>
        <PropertyMap latitude={coordinatesAvailable ? latitude : null} longitude={coordinatesAvailable ? longitude : null} onCoordinateSelect={onCoordinateSelect} onInteractionChange={onInteractionChange} accessibilityLabel="Expanded property location map" />
      </Animated.View>
      {showAddress ? <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(150)} style={[styles.addressFooter, { paddingLeft: Math.max(insets.left, Spacing.three), paddingRight: Math.max(insets.right, Spacing.three), paddingBottom: Math.max(insets.bottom, Spacing.two), backgroundColor: colors.surfaceLow }]} testID="map-location-details">
        <Text style={[styles.addressTitle, { color: colors.text }]}>Current address</Text>
        <View style={styles.addressGrid}>
          {addressRows.map((row) => <View key={row.label} style={[styles.addressItem, row.label === 'Address' && styles.fullAddressItem]}>
            <Text style={[styles.addressLabel, { color: colors.textSecondary }]}>{row.label}</Text>
            <Text numberOfLines={row.label === 'Address' ? 2 : 1} style={[styles.addressValue, { color: colors.text }]}>{row.value.trim() || 'Not set'}</Text>
          </View>)}
        </View>
      </Animated.View> : <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(150)} style={[styles.footer, { paddingLeft: Math.max(insets.left, Spacing.three), paddingRight: Math.max(insets.right, Spacing.three), paddingBottom: Math.max(insets.bottom, Spacing.two), backgroundColor: colors.surfaceLow }]}>
        <AppIcon name="location_on" size={19} color={colors.accent} />
        <Text style={[styles.coordinates, { color: colors.textSecondary }]}>{coordinatesAvailable ? `Lat ${latitude.toFixed(6)}° · Lng ${longitude.toFixed(6)}°` : 'Tap the map once to set the property pin'}</Text>
      </Animated.View>}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 68, paddingBottom: Spacing.two, paddingTop: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerCopy: { flex: 1, gap: Spacing.half },
  title: { ...Typography.title },
  instruction: { ...Typography.bodySmall },
  closeButton: { width: 42, height: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  infoButton: { width: 42, height: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  mapCanvas: { flex: 1, minHeight: 0 },
  addressFooter: { paddingTop: Spacing.two, paddingBottom: Spacing.two, gap: Spacing.one },
  addressTitle: { ...Typography.label },
  addressGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: Spacing.one },
  addressItem: { width: '47%', minWidth: 0, gap: Spacing.half },
  fullAddressItem: { width: '100%' },
  addressLabel: { ...Typography.labelSmall },
  addressValue: { ...Typography.label },
  footer: { minHeight: 52, paddingVertical: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  coordinates: { ...Typography.labelSmall, flexShrink: 1 },
});
