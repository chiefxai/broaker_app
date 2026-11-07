import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export type PasswordStrength = 'weak' | 'good' | 'strong';

export function measurePasswordStrength(password: string): PasswordStrength {
  const characterGroups = [/[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[^a-zA-Z0-9]/.test(password)]
    .filter(Boolean).length;

  if (password.length >= 12 && characterGroups >= 3) return 'strong';
  if (password.length >= 8 && characterGroups >= 2) return 'good';
  return 'weak';
}

export interface PasswordStrengthMeterProps {
  password: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PasswordStrengthMeter({ password, label = 'Password strength', style, testID }: PasswordStrengthMeterProps) {
  const colors = useTheme();
  const strength = measurePasswordStrength(password);
  const segments = strength === 'weak' ? 1 : strength === 'good' ? 2 : 3;
  const tint = strength === 'weak' ? colors.danger : strength === 'good' ? colors.warning : colors.success;

  return (
    <View accessibilityLabel={`${label}: ${strength}`} style={[styles.container, style]} testID={testID}>
      <View style={styles.track}>
        {[0, 1, 2].map((segment) => (
          <View
            key={segment}
            style={[styles.segment, { backgroundColor: segment < segments ? tint : colors.surfaceContainer }]}
          />
        ))}
      </View>
      <View style={styles.caption}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.strength, { color: tint }]}>{strength[0].toUpperCase() + strength.slice(1)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  track: { flexDirection: 'row', gap: Spacing.one },
  segment: { height: 5, flex: 1, borderRadius: 4 },
  caption: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  label: { ...Typography.bodySmall },
  strength: { ...Typography.bodySmall, fontWeight: '600' },
});
