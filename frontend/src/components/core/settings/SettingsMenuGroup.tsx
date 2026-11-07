import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

export function SettingsMenuGroup({ title, children }: PropsWithChildren<{ title: string }>) {
  const colors = useTheme();
  return (
    <View style={[styles.group, { backgroundColor: colors.surface, shadowColor: colors.text }]}>
      <View style={[styles.heading, { backgroundColor: colors.surfaceLow }]}>
        <Text style={[styles.headingText, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function SettingsMenuDivider() {
  const colors = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.divider }]} />;
}

const styles = StyleSheet.create({
  group: { width: '100%', borderRadius: Radius.large, overflow: 'hidden', elevation: 1, shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  heading: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  headingText: { ...Typography.labelSmall, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three + 40 + Spacing.two },
});
