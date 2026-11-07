import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon, type AppIconName } from './icons';
import { GlassBackground, supportsGlassSurface } from './GlassBackground';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useLanguage } from '@/i18n/language-provider';

export type CoreButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost';
export type CoreButtonSize = 'small' | 'medium' | 'large';

export interface CoreButtonProps {
  label: string;
  onPress?: PressableProps['onPress'];
  variant?: CoreButtonVariant;
  size?: CoreButtonSize;
  leadingIcon?: AppIconName;
  trailingIcon?: AppIconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  bordered?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function CoreButton({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  leadingIcon,
  trailingIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  bordered = false,
  accessibilityLabel,
  style,
  testID,
}: CoreButtonProps) {
  const colors = useTheme();
  const { translate } = useLanguage();
  const isDisabled = disabled || loading;
  const glass = supportsGlassSurface() && (variant === 'secondary' || variant === 'tertiary');
  const foreground = variant === 'primary' ? colors.onPrimary : colors.accent;

  const variantStyle = {
    primary: { backgroundColor: colors.primary, borderColor: colors.primary },
    secondary: { backgroundColor: colors.surface, borderColor: colors.border },
    tertiary: { backgroundColor: colors.surfaceLow, borderColor: colors.surfaceLow },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  }[variant];

  const sizeStyle = {
    small: { minHeight: 36, paddingHorizontal: Spacing.three },
    medium: { minHeight: 44, paddingHorizontal: Spacing.four },
    large: { minHeight: 48, paddingHorizontal: Spacing.four },
  }[size];

  return (
    <Pressable cssInterop={false}
      accessibilityRole="button"
      accessibilityLabel={translate(accessibilityLabel ?? label)}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        variantStyle,
        glass && { backgroundColor: 'transparent' },
        bordered && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      testID={testID}>
      {glass ? <GlassBackground radius={Radius.medium} /> : null}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={foreground} />
        ) : (
          leadingIcon && <AppIcon name={leadingIcon} size={18} color={foreground} />
        )}
        <Text style={[styles.label, { color: foreground }]} numberOfLines={1}>
          {label}
        </Text>
        {!loading && trailingIcon && <AppIcon name={trailingIcon} size={18} color={foreground} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
  },
  label: { ...Typography.label, flexShrink: 1, minWidth: 0, textAlign: 'center' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
});
