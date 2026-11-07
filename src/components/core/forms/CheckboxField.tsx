import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface CheckboxFieldProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  errorMessage?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function CheckboxField({ label, value, onValueChange, errorMessage, disabled = false, style, testID }: CheckboxFieldProps) {
  const colors = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        onPress={() => onValueChange(!value)}
        style={styles.control}
        testID={testID}>
        <View
          style={[
            styles.box,
            { borderColor: errorMessage ? colors.danger : value ? colors.accent : colors.border },
            value && { backgroundColor: colors.accent },
            disabled && styles.disabled,
          ]}>
          {value && <AppIcon name="checkmark" size={14} color={colors.onPrimary} />}
        </View>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </Pressable>
      {errorMessage ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.dangerText }]}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  control: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  box: { width: 20, height: 20, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  label: { ...Typography.body, flex: 1 },
  error: { ...Typography.bodySmall },
  disabled: { opacity: 0.56 },
});
