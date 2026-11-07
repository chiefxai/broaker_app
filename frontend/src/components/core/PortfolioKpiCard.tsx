import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon, type AppIconName } from './icons';
import { LoadingSkeleton, SkeletonBlock } from './LoadingSkeleton';
import { CoreButton } from './CoreButton';
import { StatusChip, type StatusChipProps } from './StatusChip';
import { Radius, Spacing, Typography, getStatusColors, type StatusTone } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export type KpiCardState = 'ready' | 'loading' | 'error';

export interface PortfolioKpiCardProps {
  label: string;
  value?: string | number | null;
  description?: string;
  icon: AppIconName;
  tone?: StatusTone;
  badge?: Pick<StatusChipProps, 'label' | 'tone'>;
  state?: KpiCardState;
  errorMessage?: string;
  onRetry?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
  testID?: string;
}

export function PortfolioKpiCard({
  label,
  value,
  description,
  icon,
  tone = 'neutral',
  badge,
  state = 'ready',
  errorMessage = 'Could not load this metric.',
  onRetry,
  accessibilityLabel,
  style,
  bordered = false,
  testID,
}: PortfolioKpiCardProps) {
  const colors = useTheme();
  const statusColors = getStatusColors(colors, tone);

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? `${label}, ${state === 'ready' ? value ?? 'not available' : state}`}
      accessibilityRole="summary"
      style={[styles.card, { backgroundColor: colors.surface }, bordered && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, style]}
      testID={testID}>
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: statusColors.background }]}>
          <AppIcon name={icon} size={18} color={statusColors.icon} />
        </View>
        {badge && <StatusChip label={badge.label} tone={badge.tone} />}
      </View>

      <View style={styles.valueBlock}>
        {state === 'loading' ? <LoadingSkeleton label={`Loading ${label}`} style={styles.loadingValue}>
          <SkeletonBlock style={styles.valueSkeleton} testID="portfolio-kpi-value-skeleton" />
          <SkeletonBlock style={styles.labelSkeleton} />
          <SkeletonBlock style={styles.descriptionSkeleton} />
        </LoadingSkeleton> : <>
          <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{state === 'ready' ? (value ?? '—') : '—'}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={2}>{label}</Text>
        </>}
        {state === 'error' && (
          <View style={styles.errorBlock}>
            <Text style={[styles.stateText, { color: colors.dangerText }]}>{errorMessage}</Text>
            {onRetry && (
              <CoreButton label="Retry" variant="ghost" size="small" onPress={onRetry} />
            )}
          </View>
        )}
        {state === 'ready' && description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 132,
    flex: 1,
    minHeight: 144,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 0,
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBlock: { gap: Spacing.half },
  value: { ...Typography.value },
  label: { ...Typography.labelSmall },
  description: { ...Typography.bodySmall },
  loadingValue: { gap: Spacing.two },
  valueSkeleton: { width: 66, height: 28 },
  labelSkeleton: { width: '80%', height: 12 },
  descriptionSkeleton: { width: '58%', height: 10 },
  stateText: { ...Typography.bodySmall },
  errorBlock: { gap: Spacing.one, alignItems: 'flex-start' },
});
