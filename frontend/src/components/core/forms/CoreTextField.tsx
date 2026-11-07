import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { LocalizedTextInput as TextInput } from '@/i18n/LocalizedTextInput';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon, type AppIconName } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export interface CoreTextFieldProps {
  label?: string;
  accessibilityLabel?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  leadingIcon?: AppIconName;
  secureTextEntry?: boolean;
  clearable?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  required?: boolean;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  returnKeyType?: TextInputProps['returnKeyType'];
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function CoreTextField({
  label,
  accessibilityLabel,
  value,
  onChangeText,
  placeholder,
  helperText,
  errorMessage,
  leadingIcon,
  secureTextEntry = false,
  clearable = false,
  keyboardType,
  autoComplete,
  textContentType,
  autoCapitalize,
  autoCorrect,
  required = false,
  editable = true,
  multiline = false,
  numberOfLines,
  maxLength,
  onSubmitEditing,
  returnKeyType,
  testID,
  style,
}: CoreTextFieldProps) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const hasError = Boolean(errorMessage);

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>
          {label}{required ? ' *' : ''}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputShell,
          multiline && styles.multilineShell,
          {
            backgroundColor: hasError ? colors.dangerContainer : focused ? colors.surfaceHigh : colors.surfaceLow,
            borderColor: hasError ? colors.danger : focused ? colors.accent : 'transparent',
          },
          !editable && styles.disabled,
        ]}>
        {leadingIcon ? (
          <AppIcon name={leadingIcon} size={18} color={hasError ? colors.danger : colors.iconMuted} />
        ) : null}
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled: !editable }}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          editable={editable}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.iconMuted}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry && !passwordVisible}
          selectionColor={colors.accent}
          style={[styles.input, { color: colors.text }, multiline && styles.multilineInput]}
          testID={testID}
          textContentType={textContentType}
          keyboardType={keyboardType}
          value={value}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            onPress={() => setPasswordVisible((visible) => !visible)}
            hitSlop={8}
            style={styles.trailingAction}>
            <AppIcon name={passwordVisible ? 'visibility_off' : 'visibility'} size={18} color={colors.iconMuted} />
          </Pressable>
        ) : null}
        {clearable && value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => onChangeText('')}
            hitSlop={8}
            style={styles.trailingAction}>
            <AppIcon name="close" size={17} color={colors.iconMuted} />
          </Pressable>
        ) : null}
      </View>
      {errorMessage || helperText ? (
        <Text
          accessibilityRole={hasError ? 'alert' : undefined}
          style={[styles.hint, { color: hasError ? colors.dangerText : colors.textSecondary }]}>
          {errorMessage ?? helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  label: { ...Typography.labelSmall },
  inputShell: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  multilineShell: { minHeight: 96, alignItems: 'flex-start', paddingVertical: Spacing.two },
  input: { flex: 1, minWidth: 0, minHeight: 46, paddingVertical: Spacing.two, ...Typography.body },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  trailingAction: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  hint: { ...Typography.bodySmall },
  disabled: { opacity: 0.56 },
});
