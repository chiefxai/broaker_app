import { useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface PropertyPhoto {
  uri: string;
  accessibilityLabel: string;
}

export interface PropertyPhotoGalleryProps {
  photos: PropertyPhoto[];
  currentIndex: number;
  onIndexChange?: (index: number) => void;
  onPressPhoto?: (photo: PropertyPhoto, index: number) => void;
  emptyLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  aspectRatio?: number;
  topOverlay?: ReactNode;
  bottomOverlay?: ReactNode;
}

export function PropertyPhotoGallery({
  photos,
  currentIndex,
  onIndexChange,
  onPressPhoto,
  emptyLabel = 'No property photos available',
  style,
  testID,
  aspectRatio = 16 / 10,
  topOverlay,
  bottomOverlay,
}: PropertyPhotoGalleryProps) {
  const colors = useTheme();
  const [failedUris, setFailedUris] = useState<string[]>([]);
  const safeIndex = photos.length ? Math.min(Math.max(0, currentIndex), photos.length - 1) : 0;
  const photo = photos[safeIndex];
  const previous = () => onIndexChange?.(Math.max(0, safeIndex - 1));
  const next = () => onIndexChange?.(Math.min(photos.length - 1, safeIndex + 1));

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={[styles.frame, { backgroundColor: colors.surfaceContainer, aspectRatio }]}>
        {photo && !failedUris.includes(photo.uri) ? (
          onPressPhoto ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={photo.accessibilityLabel}
              onPress={() => onPressPhoto(photo, safeIndex)}
              style={styles.imagePressable}>
              <Image
                accessibilityRole="image"
                accessibilityLabel={photo.accessibilityLabel}
                onError={() => setFailedUris((items) => [...items, photo.uri])}
                resizeMode="cover"
                source={{ uri: photo.uri }}
                style={styles.image}
              />
            </Pressable>
          ) : (
            <Image
              accessibilityRole="image"
              accessibilityLabel={photo.accessibilityLabel}
              onError={() => setFailedUris((items) => [...items, photo.uri])}
              resizeMode="cover"
              source={{ uri: photo.uri }}
              style={styles.image}
            />
          )
        ) : (
          <View accessibilityRole="image" accessibilityLabel={photo ? 'Property photo unavailable' : emptyLabel} style={styles.empty}>
            <AppIcon name="apartment" size={36} color={colors.iconMuted} />
            <Text style={[styles.emptyLabel, { color: colors.textSecondary }]}>{photo ? 'Photo unavailable' : emptyLabel}</Text>
          </View>
        )}
        {photos.length > 1 && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous photo"
              accessibilityState={{ disabled: safeIndex === 0 }}
              disabled={safeIndex === 0}
              onPress={previous}
              style={[styles.arrow, styles.previous, { backgroundColor: colors.surface }]}
              hitSlop={6}>
              <AppIcon name="chevron_left" color={colors.text} size={20} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next photo"
              accessibilityState={{ disabled: safeIndex === photos.length - 1 }}
              disabled={safeIndex === photos.length - 1}
              onPress={next}
              style={[styles.arrow, styles.next, { backgroundColor: colors.surface }]}
              hitSlop={6}>
              <AppIcon name="chevron_right" color={colors.text} size={20} />
            </Pressable>
          </>
        )}
        {topOverlay ? <View pointerEvents="box-none" style={styles.topOverlay}>{topOverlay}</View> : null}
        {bottomOverlay ? <View pointerEvents="box-none" style={styles.bottomOverlay}>{bottomOverlay}</View> : null}
        {photos.length > 0 && (
          <View accessibilityLiveRegion="polite" style={[styles.counter, { backgroundColor: colors.imageScrim }]}>
            <Text style={[styles.counterText, { color: colors.onScrim }]}>{safeIndex + 1} / {photos.length}</Text>
          </View>
        )}
      </View>
      {photos.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>
          {photos.map((item, index) => (
            <Pressable
              key={`${item.uri}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Show photo ${index + 1}`}
              accessibilityState={{ selected: index === safeIndex }}
              onPress={() => onIndexChange?.(index)}
              style={[styles.thumbnail, { borderColor: index === safeIndex ? colors.accent : colors.border }]}>
              <Image accessibilityLabel={item.accessibilityLabel} source={{ uri: item.uri }} style={styles.thumbnailImage} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  frame: { width: '100%', maxHeight: 440, borderRadius: Radius.large, overflow: 'hidden' },
  imagePressable: { flex: 1 },
  image: { width: '100%', height: '100%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  emptyLabel: { ...Typography.bodySmall },
  arrow: { position: 'absolute', top: '45%', width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', opacity: 0.94 },
  previous: { left: Spacing.two },
  next: { right: Spacing.two },
  counter: { position: 'absolute', right: Spacing.three, bottom: Spacing.three, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.pill },
  counterText: { ...Typography.labelSmall },
  topOverlay: { position: 'absolute', top: Spacing.three, left: Spacing.three, right: Spacing.three, alignItems: 'flex-start' },
  bottomOverlay: { position: 'absolute', bottom: Spacing.three, left: Spacing.three },
  thumbnails: { gap: Spacing.two, paddingVertical: Spacing.one },
  thumbnail: { width: 62, height: 48, overflow: 'hidden', borderRadius: Radius.small },
  thumbnailImage: { width: '100%', height: '100%' },
});
