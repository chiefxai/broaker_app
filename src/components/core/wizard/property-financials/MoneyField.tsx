import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { LocalizedTextInput as TextInput } from '@/i18n/LocalizedTextInput';

import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { formatRupees } from './measurement';

export function MoneyField({ label, value, onChangeText, testID, helperText, prominent = false, tone, required = false, errorMessage }: {
  label: string; value: string; onChangeText: (value: string) => void; testID: string; helperText?: string; prominent?: boolean; tone?: 'default' | 'danger'; required?: boolean; errorMessage?: string;
}) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const displayValue = focused || !value ? value : formatRupees(Number(value));
  const hasError = Boolean(errorMessage);
  return <View style={styles.field}>
    <Text style={[styles.label, { color: hasError ? colors.dangerText : colors.textSecondary }]}>{label}{required ? ' *' : ''}</Text>
    <View style={[styles.inputShell, { backgroundColor: hasError || tone === 'danger' ? colors.dangerContainer : focused ? colors.surfaceHigh : colors.surfaceLow, borderColor: hasError ? colors.danger : 'transparent', borderWidth: hasError ? 1 : 0 }]}>
      <Text style={[prominent ? styles.currencyLarge : styles.currency, { color: colors.textSecondary }]}>₹</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled: false }}
        keyboardType="number-pad"
        value={displayValue}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChangeText={(input) => onChangeText(input.replace(/\D/g, ''))}
        placeholder="0"
        placeholderTextColor={colors.iconMuted}
        selectionColor={colors.accent}
        style={[styles.input, prominent ? styles.inputLarge : styles.inputSmall, { color: colors.text }]}
        testID={testID}
      />
    </View>
    {errorMessage ? <Text accessibilityRole="alert" style={[styles.helper, { color: colors.dangerText }]}>{errorMessage}</Text> : null}
    {helperText ? <Text style={[styles.helper, { color: colors.textSecondary }]}>{helperText}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one }, label: { ...Typography.labelSmall, textTransform: 'uppercase', letterSpacing: 0.5 }, inputShell: { minHeight: 48, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, gap: Spacing.one }, currency: { ...Typography.label }, currencyLarge: { ...Typography.title }, input: { flex: 1, minWidth: 0, paddingVertical: Spacing.two, fontVariant: ['tabular-nums'] }, inputLarge: { ...Typography.title }, inputSmall: { ...Typography.label }, helper: { ...Typography.bodySmall },
});
