import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon, type AppIconName } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface PropertyFactRowProps {
  label: string;
  value: string;
  detail?: string;
  icon: AppIconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PropertyFactRow({ label, value, detail, icon, style, testID }: PropertyFactRowProps) {
  const colors = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }, style]} testID={testID}>
      <View style={[styles.iconBox, { backgroundColor: colors.surfaceContainer }]}>
        <AppIcon name={icon} size={18} color={colors.accent} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        {detail ? <Text style={[styles.detail, { color: colors.textSecondary }]}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, paddingVertical: Spacing.three, },
  iconBox: { width: 36, height: 36, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: Spacing.half },
  label: { ...Typography.bodySmall },
  value: { ...Typography.label },
  detail: { ...Typography.bodySmall },
});
