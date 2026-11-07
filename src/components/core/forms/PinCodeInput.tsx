import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type TextInputInstance, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { LocalizedTextInput as TextInput } from '@/i18n/LocalizedTextInput';

import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface PinCodeInputProps {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  label?: string;
  errorMessage?: string;
  editable?: boolean;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PinCodeInput({
  value,
  onChangeText,
  length = 4,
  label = 'Security PIN',
  errorMessage,
  editable = true,
  autoFocus = false,
  style,
  testID,
}: PinCodeInputProps) {
  const colors = useTheme();
  const inputRef = useRef<TextInputInstance>(null);
  const safeLength = Math.max(1, Math.min(12, Math.floor(length)));
  const safeValue = value.replace(/\D/g, '').slice(0, safeLength);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
    else inputRef.current?.blur();
  }, [autoFocus]);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${safeValue.length} of ${safeLength} digits entered`}
        accessibilityHint="Opens the numeric keypad"
        accessibilityState={{ disabled: !editable }}
        disabled={!editable}
        onPress={() => inputRef.current?.focus()}
        style={styles.digits}>
        {Array.from({ length: safeLength }, (_, index) => (
          <View
            key={index}
            style={[
              styles.digit,
              { backgroundColor: colors.surface, borderColor: errorMessage ? colors.danger : colors.border },
              !editable && styles.disabled,
            ]}>
            <View style={[styles.dot, { backgroundColor: colors.text }, index >= safeValue.length && styles.hiddenDot]} />
          </View>
        ))}
        <TextInput
          ref={inputRef}
          accessibilityLabel={`${label} entry`}
          editable={editable}
          keyboardType="number-pad"
          maxLength={safeLength}
          onChangeText={(next) => onChangeText(next.replace(/\D/g, '').slice(0, safeLength))}
          secureTextEntry
          style={styles.hiddenInput}
          testID={testID}
          textContentType="oneTimeCode"
          value={safeValue}
        />
      </Pressable>
      {errorMessage ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.dangerText }]}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  label: { ...Typography.labelSmall },
  digits: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  digit: { flex: 1, minWidth: 26, maxWidth: 48, height: 54, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: Radius.pill },
  hiddenDot: { opacity: 0 },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0.01, color: 'transparent' },
  disabled: { opacity: 0.56 },
  error: { ...Typography.bodySmall },
});
