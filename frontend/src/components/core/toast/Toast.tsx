import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '@/components/core/icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
  testID?: string;
}

const PRESENTATION = {
  success: { icon: 'verified', background: 'successContainer', foreground: 'successText' },
  error: { icon: 'close', background: 'dangerContainer', foreground: 'dangerText' },
  warning: { icon: 'pending_actions', background: 'warningContainer', foreground: 'warningText' },
  info: { icon: 'cloud_sync', background: 'infoContainer', foreground: 'infoText' },
} as const;

export function Toast({ message, variant = 'info', onDismiss, testID }: ToastProps) {
  const colors = useTheme();
  const presentation = PRESENTATION[variant];
  return <View style={[styles.container, { backgroundColor: colors[presentation.background], shadowColor: colors.text }]} testID={testID ?? 'toast'}>
    <AppIcon name={presentation.icon} size={20} color={colors[presentation.foreground]} />
    <Text accessibilityRole={variant === 'error' ? 'alert' : 'status'} accessibilityLiveRegion="polite" style={[styles.message, { color: colors[presentation.foreground] }]}>{message}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={onDismiss} hitSlop={8} style={styles.dismiss} testID="toast-dismiss">
      <AppIcon name="close" size={17} color={colors[presentation.foreground]} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  container: { minHeight: 56, width: '100%', maxWidth: 620, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.large, elevation: 8, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 8 },
  message: { ...Typography.body, flex: 1, fontWeight: '500' },
  dismiss: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
});
