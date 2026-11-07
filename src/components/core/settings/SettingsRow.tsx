import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon, type AppIconName } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useLanguage } from '@/i18n/language-provider';

export interface SettingsRowProps {
  title: string;
  description?: string;
  icon: AppIconName;
  valueLabel?: string;
  variant?: 'card' | 'list';
  trailingActionLabel?: string;
  onTrailingAction?: () => void;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SettingsRow({
  title,
  description,
  icon,
  valueLabel,
  variant = 'card',
  trailingActionLabel,
  onTrailingAction,
  onPress,
  switchValue,
  onSwitchChange,
  disabled = false,
  style,
  testID,
}: SettingsRowProps) {
  const colors = useTheme();
  const { translate } = useLanguage();
  const isSwitch = typeof switchValue === 'boolean' && Boolean(onSwitchChange);
  const content = (
    <>
      <View style={[styles.iconBox, variant === 'list' && styles.listIconBox, { backgroundColor: variant === 'list' ? colors.surfaceContainer : colors.surfaceContainer }]}>
        <AppIcon name={icon} size={variant === 'list' ? 22 : 18} color={colors.accent} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {description ? <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>{description}</Text> : null}
      </View>
      {isSwitch ? (
        <Switch
          accessibilityLabel={title}
          disabled={disabled}
          onValueChange={onSwitchChange}
          thumbColor={switchValue ? colors.onPrimary : colors.surface}
          trackColor={{ false: colors.toggleTrack, true: colors.accent }}
          value={switchValue}
        />
      ) : onTrailingAction && trailingActionLabel ? (
        <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={trailingActionLabel} onPress={onTrailingAction} style={[styles.trailingAction, { backgroundColor: colors.surfaceContainer, borderRadius: Radius.small }]}>
          <Text style={[styles.trailingActionText, { color: colors.accent }]}>{trailingActionLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.trailing}>
          {valueLabel ? <Text style={[styles.value, { color: colors.textSecondary }]} numberOfLines={1}>{valueLabel}</Text> : null}
          {onPress && <AppIcon name="chevron_right" size={18} color={colors.iconMuted} />}
        </View>
      )}
    </>
  );

  const containerStyle = [styles.row, variant === 'list' && styles.listRow, { backgroundColor: colors.surface, borderColor: colors.border }, disabled && styles.disabled, style];
  if (onPress && !isSwitch) {
    return (
      <Pressable cssInterop={false}
        accessibilityRole="button"
        accessibilityLabel={translate(title)}
        accessibilityHint={description ? translate(description) : undefined}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
        testID={testID}>
        {content}
      </Pressable>
    );
  }

  return <View style={containerStyle} testID={testID}>{content}</View>;
}

const styles = StyleSheet.create({
  row: { minHeight: 68, padding: Spacing.two, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  listRow: { minHeight: 68, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 0, borderWidth: 0 },
  iconBox: { width: 38, height: 38, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  listIconBox: { width: 40, height: 40 },
  copy: { flex: 1, gap: Spacing.half },
  title: { ...Typography.label },
  description: { ...Typography.bodySmall },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, maxWidth: '42%' },
  value: { ...Typography.bodySmall, textAlign: 'right' },
  trailingAction: { minHeight: 32, paddingHorizontal: Spacing.two, justifyContent: 'center' },
  trailingActionText: { ...Typography.labelSmall, fontWeight: '600' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
});
