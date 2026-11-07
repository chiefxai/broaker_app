import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon, type AppIconName } from './icons';
import { LoadingSkeleton, SkeletonBlock } from './LoadingSkeleton';
import { CoreButton } from './CoreButton';
import { GlassBackground } from './GlassBackground';
import { OverflowMenu, type OverflowMenuItem } from './navigation/OverflowMenu';
import { StatusChip } from './StatusChip';
import { formatArea, formatInr, type AreaValue } from '@/utils/formatters';
import { Radius, Spacing, Typography, type StatusTone } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface PropertyCardItem {
  id: string;
  title: string;
  categoryLabel: string;
  status: { label: string; tone: StatusTone };
  area?: AreaValue | null;
  location?: string | null;
  priceInr?: number | null;
  referenceCode?: string;
  photoCount?: number;
  image?: { uri: string; accessibilityLabel: string } | null;
  footerLabel?: string;
  footerIcon?: AppIconName;
}

export type PropertyCardProps =
  | {
      state: 'loading';
      accessibilityLabel?: string;
      style?: StyleProp<ViewStyle>;
      testID?: string;
    }
  | {
      state: 'error';
      errorMessage?: string;
      onRetry?: () => void;
      accessibilityLabel?: string;
      style?: StyleProp<ViewStyle>;
      testID?: string;
    }
  | {
      state?: 'ready';
      property: PropertyCardItem;
      compact?: boolean;
      onOpenProperty?: () => void;
      onShare?: () => void;
      menuItems?: OverflowMenuItem[];
      accessibilityLabel?: string;
      style?: StyleProp<ViewStyle>;
      testID?: string;
    };

export function PropertyCard(props: PropertyCardProps) {
  const colors = useTheme();

  if (props.state === 'loading') {
    return (
      <LoadingSkeleton
        label={props.accessibilityLabel ?? 'Loading property'}
        style={[styles.card, styles.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }, props.style]}
        testID={props.testID}>
        <SkeletonBlock style={styles.photo} testID="property-card-skeleton-image" />
        <View style={styles.loadingBody}>
          <View style={styles.loadingTitleRow}><SkeletonBlock style={styles.loadingTitle} /><SkeletonBlock style={styles.loadingBadge} /></View>
          <SkeletonBlock style={styles.loadingLine} />
          <View style={styles.loadingMetrics}><SkeletonBlock style={styles.loadingMetric} /><SkeletonBlock style={styles.loadingMetric} /></View>
        </View>
      </LoadingSkeleton>
    );
  }

  if (props.state === 'error') {
    return (
      <View
        accessibilityRole="summary"
        accessibilityLabel={props.accessibilityLabel ?? 'Property unavailable'}
        style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }, props.style]}
        testID={props.testID}>
        <AppIcon name="domain" size={24} color={colors.danger} />
        <Text style={[styles.errorMessage, { color: colors.text }]}>{props.errorMessage ?? 'Could not load this property.'}</Text>
        {props.onRetry && <CoreButton label="Retry" variant="secondary" size="small" onPress={props.onRetry} />}
      </View>
    );
  }

  return <ReadyPropertyCard {...props} />;
}

function ReadyPropertyCard({
  property,
  compact = false,
  onOpenProperty,
  onShare,
  menuItems,
  accessibilityLabel,
  style,
  testID,
}: Extract<PropertyCardProps, { state?: 'ready' }>) {
  const colors = useTheme();
  const [failedImageUri, setFailedImageUri] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const areaLabel = formatArea(property.area);
  const imageUri = property.image?.uri;
  const showImage = Boolean(imageUri && failedImageUri !== imageUri);
  const hasValidPrice = Number.isSafeInteger(property.priceInr) && (property.priceInr ?? -1) >= 0;
  const openProperty = () => onOpenProperty?.();
  const showActions = () => {
    setMenuVisible(true);
  };

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? `${property.title}, ${property.status.label}`}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
      testID={testID}>
      <View testID="property-card-photo" style={[styles.photo, compact && styles.photoCompact, { backgroundColor: colors.surfaceContainer }]}>
        <Pressable accessibilityRole={onOpenProperty ? 'button' : undefined} accessibilityLabel={onOpenProperty ? `Open ${property.title}` : undefined} accessibilityHint={menuItems?.length ? 'Long press for property actions' : undefined} disabled={!onOpenProperty} onPress={openProperty} onLongPress={menuItems?.length ? showActions : undefined} delayLongPress={450} style={styles.photoAction}>
          {showImage ? (
            <>
              <Image
                accessibilityRole="image"
                accessibilityLabel={property.image?.accessibilityLabel}
                source={{ uri: imageUri ?? '' }}
                resizeMode="cover"
                onError={() => imageUri && setFailedImageUri(imageUri)}
                style={styles.photoImage}
              />
              <View pointerEvents="none" style={[styles.photoShade, { backgroundColor: colors.imageScrim }]} />
            </>
          ) : (
            <View
              accessibilityRole="image"
              accessibilityLabel="Property image unavailable"
              style={styles.imageFallback}>
              <AppIcon name="apartment" size={34} color={colors.iconMuted} />
            </View>
          )}
          <View pointerEvents="none" style={styles.badges}>
            <StatusChip label={property.status.label} tone={property.status.tone} />
            <StatusChip label={property.categoryLabel} tone="neutral" />
          </View>
          <View pointerEvents="none" style={[styles.photoCount, { backgroundColor: colors.imageScrim }]}>
            <AppIcon name="photo_camera" size={13} color={colors.onScrim} />
            <Text style={[styles.photoCountText, { color: colors.onScrim }]}>{property.photoCount ?? 0} photos</Text>
          </View>
        </Pressable>
        {onShare ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Share ${property.title}`} onPress={onShare} style={[styles.imageMenu, compact && styles.imageMenuCompact, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.text }]}> 
            <GlassBackground radius={Radius.pill} />
            <AppIcon name="share" size={18} color={colors.accent} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.body, compact && styles.bodyCompact]}>
        <View style={styles.headingRow}>
          <View style={styles.titleBlock}>
            <Pressable testID="property-card-title-action" accessibilityRole={onOpenProperty ? 'button' : undefined} accessibilityLabel={onOpenProperty ? `Open ${property.title}` : undefined} accessibilityHint={menuItems?.length ? 'Long press for property actions' : undefined} disabled={!onOpenProperty} onPress={openProperty} onLongPress={menuItems?.length ? showActions : undefined} delayLongPress={450}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">{property.title}</Text>
            </Pressable>
            <View style={styles.locationRow}>
              <AppIcon
                name={property.location ? 'location_on' : 'location_off'}
                size={16}
                color={property.location ? colors.accent : colors.iconMuted}
              />
              <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                {property.location || 'Location not added'}
              </Text>
            </View>
          </View>
          {menuItems?.length ? <OverflowMenu items={menuItems} visible={menuVisible} onVisibleChange={setMenuVisible} accessibilityLabel={`Actions for ${property.title}`} /> : null}
        </View>

        <View style={[styles.metrics, compact && styles.metricsCompact]}>
          <View style={[styles.metric, compact && styles.metricCompact, { backgroundColor: colors.surfaceLow }]}>
            <View style={[styles.metricHeading, compact && styles.metricHeadingCompact]}><AppIcon name="currency_rupee" size={16} color={colors.accent} />
            <Text style={[styles.priceCaption, { color: colors.textSecondary }]}>Asking price</Text>
            </View>
            <Text style={[styles.price, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{hasValidPrice ? formatInr(property.priceInr!) : 'Price not added'}</Text>
          </View>
          <View style={[styles.metric, compact && styles.metricCompact, { backgroundColor: colors.surfaceLow }]}>
            <View style={[styles.metricHeading, compact && styles.metricHeadingCompact]}><AppIcon name="straighten" size={16} color={colors.accent} />
            <Text style={[styles.priceCaption, { color: colors.textSecondary }]}>Parcel size</Text>
            </View>
            <Text style={[styles.price, { color: colors.accent }]} numberOfLines={1} ellipsizeMode="tail">{areaLabel ?? '—'}</Text>
          </View>
        </View>

        {property.footerLabel && (
          <View style={[styles.footer, { borderTopColor: colors.divider }]}>
            <View style={styles.footerMeta}>
              <AppIcon
                name={property.footerIcon ?? 'visibility'}
                size={16}
                color={colors.accent}
              />
              <Text style={[styles.footerLabel, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                {property.footerLabel}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 260,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  photoCompact: { aspectRatio: 2.15, maxHeight: 168 },
  photoAction: { ...StyleSheet.absoluteFill, justifyContent: 'center' },
  photoImage: { ...StyleSheet.absoluteFill },
  photoShade: { ...StyleSheet.absoluteFill },
  imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badges: { position: 'absolute', left: Spacing.two, top: Spacing.two, maxWidth: '78%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: Spacing.one },
  imageMenu: { position: 'absolute', right: Spacing.two, top: Spacing.two, zIndex: 2, width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 3 },
  imageMenuCompact: { width: 36, height: 36 },
  body: { padding: Spacing.two, gap: Spacing.two },
  bodyCompact: { padding: Spacing.two, gap: Spacing.one },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  titleBlock: { flex: 1, minWidth: 0, gap: Spacing.one },
  title: { ...Typography.title },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one },
  location: { ...Typography.bodySmall, flex: 1 },
  metricHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  metricHeadingCompact: { gap: Spacing.half },
  priceCaption: { ...Typography.labelSmall, flexShrink: 1 },
  price: { ...Typography.label, flexShrink: 1, minWidth: 0 },
  metrics: { flexDirection: 'row', gap: Spacing.two },
  metricsCompact: { gap: Spacing.one },
  metric: { flex: 1, minWidth: 0, borderRadius: Radius.medium, padding: Spacing.two, gap: Spacing.one },
  metricCompact: { padding: Spacing.one, gap: Spacing.half },
  photoCount: { position: 'absolute', right: Spacing.three, bottom: Spacing.three, borderRadius: Radius.small, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  photoCountText: { ...Typography.bodySmall },
  footer: {
    paddingTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  footerMeta: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  footerLabel: { ...Typography.bodySmall, flexShrink: 1 },
  loadingCard: { minHeight: 260 },
  loadingBody: { minHeight: 100, padding: Spacing.three, gap: Spacing.two },
  loadingTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  loadingTitle: { width: '55%', height: 18 },
  loadingBadge: { width: 62, height: 18, borderRadius: Radius.pill },
  loadingLine: { width: '72%', height: 12 },
  loadingMetrics: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  loadingMetric: { flex: 1, height: 48, borderRadius: Radius.medium },
  errorCard: {
    minHeight: 160,
    padding: Spacing.four,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  errorMessage: { ...Typography.body, textAlign: 'center' },
});
