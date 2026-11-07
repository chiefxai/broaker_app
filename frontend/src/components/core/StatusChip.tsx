import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon, type AppIconName } from './icons';
import { getStatusColors, Radius, Spacing, type StatusTone } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useLanguage } from '@/i18n/language-provider';

export interface StatusChipProps {
  label: string;
  tone?: StatusTone;
  icon?: AppIconName;
  loading?: boolean;
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function StatusChip({
  label,
  tone = 'neutral',
  icon,
  loading = false,
  size = 'small',
  style,
  accessibilityLabel,
}: StatusChipProps) {
  const colors = getStatusColors(useTheme(), tone);
  const { translate } = useLanguage();
  const localizedLabel = translate(label);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={translate(accessibilityLabel ?? (loading ? `${label}, updating` : label))}
      style={[
        styles.container,
        size === 'medium' && styles.medium,
        { backgroundColor: colors.background },
        style,
      ]}>
      {loading ? <ActivityIndicator accessibilityLabel="Updating property status" size="small" color={colors.icon} /> : icon ? <AppIcon name={icon} size={14} color={colors.icon} /> : null}
      <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
        {localizedLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    minHeight: 24,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  medium: {
    minHeight: 30,
    paddingHorizontal: Spacing.three,
  },
  label: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
});
