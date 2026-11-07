import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from './icons';
import { Radius, Spacing, Typography, getStatusColors, type StatusTone } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncStatusCardProps {
  title: string;
  detail: string;
  state: SyncState;
  stateLabel?: string;
  style?: StyleProp<ViewStyle>;
  bordered?: boolean;
  testID?: string;
}

const stateTone: Record<SyncState, StatusTone> = {
  synced: 'success',
  syncing: 'info',
  offline: 'warning',
  error: 'danger',
};

const defaultStateLabel: Record<SyncState, string> = {
  synced: 'Synced',
  syncing: 'Syncing',
  offline: 'Offline',
  error: 'Sync failed',
};

export function SyncStatusCard({
  title,
  detail,
  state,
  stateLabel = defaultStateLabel[state],
  style,
  bordered = false,
  testID,
}: SyncStatusCardProps) {
  const colors = useTheme();
  const statusColors = getStatusColors(colors, stateTone[state]);

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${detail}. ${stateLabel}.`}
      style={[styles.card, { backgroundColor: colors.surfaceContainer }, bordered && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, style]}
      testID={testID}>
      <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
        <AppIcon name="cloud_sync" size={20} color={statusColors.icon} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={2}>{detail}</Text>
      </View>
      {state === 'syncing' ? (
        <ActivityIndicator accessibilityLabel={stateLabel} size="small" color={statusColors.icon} />
      ) : (
        <View
          accessibilityLabel={stateLabel}
          style={[styles.statusDot, { backgroundColor: statusColors.icon }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    padding: Spacing.three,
    borderRadius: Radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconBox: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: Spacing.half },
  title: { ...Typography.label },
  detail: { ...Typography.bodySmall },
  statusDot: { width: 10, height: 10, borderRadius: Radius.pill },
});
