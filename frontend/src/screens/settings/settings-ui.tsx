import type { PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppHeader } from '@/components/core';
import { MaxContentWidth, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useFooterContentPadding } from '@/theme/use-footer-inset';

export function SettingsPage({ title, children }: PropsWithChildren<{ title: string }>) {
  const footerPadding = useFooterContentPadding();
  const colors = useTheme();
  return <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: Platform.OS === 'ios' ? colors.surface : colors.background }]}>
    <AppHeader pageTitle={title} onBack={() => router.canGoBack() ? router.back() : router.replace('/settings')} />
    <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingBottom: footerPadding }]} keyboardShouldPersistTaps="handled">
      <View style={styles.body}>{children}</View>
    </ScrollView>
  </SafeAreaView>;
}

export function SettingsIntro({ title, description }: { title: string; description: string }) {
  const colors = useTheme();
  return <View style={styles.intro}><Text style={[styles.title, { color: colors.text }]}>{title}</Text><Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text></View>;
}

export function SettingsSection({ title, children }: PropsWithChildren<{ title: string }>) {
  const colors = useTheme();
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, scroll: { flex: 1 }, content: { alignItems: 'center', paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.six },
  body: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three }, intro: { gap: Spacing.one }, title: Typography.heading, description: Typography.body,
  section: { gap: Spacing.two }, sectionTitle: { ...Typography.labelSmall, textTransform: 'uppercase', letterSpacing: 0.8 },
});
