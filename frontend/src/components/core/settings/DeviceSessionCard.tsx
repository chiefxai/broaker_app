import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon, type AppIconName } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface DeviceSessionCardProps {
  deviceName: string;
  platformLabel: string;
  locationLabel: string;
  lastActiveLabel: string;
  icon?: AppIconName;
  isCurrent?: boolean;
  onSignOut?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function DeviceSessionCard({
  deviceName,
  platformLabel,
  locationLabel,
  lastActiveLabel,
  icon = 'smartphone',
  isCurrent = false,
  onSignOut,
  style,
  testID,
}: DeviceSessionCardProps) {
  const colors = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]} testID={testID}>
      <View style={[styles.iconBox, { backgroundColor: colors.surfaceContainer }]}>
        <AppIcon name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.details}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{deviceName}</Text>
          {isCurrent && (
            <View style={[styles.currentBadge, { backgroundColor: colors.successContainer }]}>
              <Text style={[styles.currentText, { color: colors.successText }]}>Current</Text>
            </View>
          )}
        </View>
        <Text style={[styles.detail, { color: colors.textSecondary }]}>{platformLabel} · {locationLabel}</Text>
        <Text style={[styles.detail, { color: colors.textSecondary }]}>{lastActiveLabel}</Text>
        {onSignOut && !isCurrent && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Sign out ${deviceName}`} onPress={onSignOut} hitSlop={8} style={styles.signOut}>
            <Text style={[styles.signOutText, { color: colors.dangerText }]}>Sign out</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, borderRadius: Radius.medium, padding: Spacing.three },
  iconBox: { width: 42, height: 42, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, gap: Spacing.one },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  title: { ...Typography.label },
  detail: { ...Typography.bodySmall },
  currentBadge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Radius.pill },
  currentText: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
  signOut: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  signOutText: { ...Typography.labelSmall },
});
