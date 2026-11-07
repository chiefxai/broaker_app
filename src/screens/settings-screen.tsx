import { router } from 'expo-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBusinessProfile } from '@/api/backend-hooks';
import { useOptionalAuth } from '@/auth/auth-provider';
import { AppHeader } from '@/components/core/navigation/AppHeader';
import { AppIcon } from '@/components/core/icons';
import { SettingsMenuDivider, SettingsMenuGroup } from '@/components/core/settings/SettingsMenuGroup';
import { SettingsRow } from '@/components/core/settings/SettingsRow';
import { PlatformBottomSheet } from '@/components/core/navigation/PlatformBottomSheet';
import { StatusChip } from '@/components/core/StatusChip';
import { useToast } from '@/components/core/toast/ToastProvider';
import { isMockMode } from '@/data/app-mode';
import { useAppLock } from '@/providers/app-lock-provider';
import { MaxContentWidth, Radius, Spacing, Typography } from '@/theme/tokens';
import { useAppTheme, useTheme } from '@/theme/theme-provider';
import { useFooterContentPadding } from '@/theme/use-footer-inset';
import { useLanguage } from '@/i18n/language-provider';
import { getApiErrorMessage } from '@/api/errors';
import { createAndShareBusinessProfile } from '@/utils/profile-share';

export default function SettingsScreen() {
  const footerPadding = useFooterContentPadding(false, true);
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const { scheme, toggleColorScheme } = useAppTheme();
  const auth = useOptionalAuth();
  const profile = useBusinessProfile();
  const queryClient = useQueryClient();
  const appLock = useAppLock();
  const { showToast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [sharingProfile, setSharingProfile] = useState(false);
  const businessName = isMockMode ? 'My Property Workspace' : profile.data?.business_name ?? auth?.currentUser?.username ?? 'My Property Workspace';
  const email = isMockMode ? 'marcus.vance@estateflow.io' : profile.data?.public_email ?? auth?.currentUser?.username ?? (profile.isError ? 'Profile could not be loaded' : 'Profile details are not set yet');

  const signOut = async () => {
    if (isMockMode) {
      showToast('Sign out is available after connecting an account.', 'info');
      return;
    }
    try {
      await auth?.signOut();
    } catch {
      showToast('Could not sign out. Please try again.', 'error');
    }
  };

  const shareBusinessProfile = async () => {
    if (isMockMode || !auth?.accessToken) {
      showToast('Sign in to create and share your business profile link.', 'info');
      return;
    }
    setSharingProfile(true);
    try {
      const result = await createAndShareBusinessProfile(auth.accessToken, businessName);
      if (result === 'unavailable') throw new Error('Sharing is unavailable on this device.');
      await queryClient.invalidateQueries({ queryKey: ['backend', 'shared-links'] });
      showToast(result === 'copied' ? 'Profile link copied. It includes all active properties using your sharing defaults.' : 'Profile link ready to share. It includes all active properties using your sharing defaults.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Could not create the profile link. Try again.'), 'error');
    } finally {
      setSharingProfile(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Platform.OS === 'ios' ? colors.surface : colors.background }]} edges={['top']}>
      <AppHeader pageTitle="Settings" brandIcon="apartment" />
      <ScrollView style={[styles.scroll, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingBottom: footerPadding }]}>
        <View style={styles.container}>
          <View style={[styles.profileCard, width < 400 && styles.profileCardCompact, { backgroundColor: colors.surface }]}>
            <View style={[styles.avatar, width < 400 && styles.avatarCompact, { backgroundColor: colors.accent, borderColor: colors.surface }]}>
              <Text style={[styles.avatarLetter, { color: colors.onPrimary }]}>{businessName.slice(0, 1).toUpperCase()}</Text>
              <View style={[styles.presenceOuter, { backgroundColor: colors.surface }]}>
                <View style={[styles.presence, { backgroundColor: colors.success }]} />
              </View>
            </View>
            <View style={styles.profileCopy}>
              <View style={styles.welcomeRow}>
                <Text style={[styles.welcome, { color: colors.textSecondary }]}>{isMockMode ? 'Welcome' : 'Signed in'}</Text>
                <StatusChip label={isMockMode ? 'Admin' : 'Live API'} tone={isMockMode ? 'info' : 'success'} />
              </View>
              <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>{businessName}</Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]} numberOfLines={1}>{email}</Text>
            </View>
            <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Share business profile" disabled={sharingProfile} onPress={() => void shareBusinessProfile()} style={({ pressed }) => [styles.profileShareButton, { backgroundColor: colors.accentContainer }, pressed && styles.pressed]}>
              {sharingProfile ? <ActivityIndicator accessibilityLabel="Creating profile link" size="small" color={colors.accent} /> : <AppIcon name="share" size={20} color={colors.accent} />}
            </Pressable>
          </View>

          <View style={styles.metrics}>
            <MetricCard icon="apartment" label="MANAGED UNITS" value={isMockMode ? '18' : '—'} suffix="Units" />
            <MetricCard icon="share" label="ACTIVE SHARES" value={isMockMode ? '12' : '—'} suffix="Portals" />
          </View>

          <SettingsMenuGroup title="Preferences & Setup">
            <SettingsRow variant="list" title="Business profile" description="Name and contact details" icon="badge" onPress={() => router.push('/settings/business-profile')} />
            <SettingsMenuDivider />
            <SettingsRow variant="list" title="Dark Mode" description="Use the navy dark theme" icon={scheme === 'dark' ? 'moon' : 'sun'} switchValue={scheme === 'dark'} onSwitchChange={toggleColorScheme} />
            <SettingsMenuDivider />
            <SettingsRow variant="list" title="Property setup" description="5 listing categories" icon="tune" valueLabel={isMockMode ? '5 active' : 'Manage'} onPress={() => router.push('/settings/property-setup')} />
            <SettingsMenuDivider />
            <SettingsRow variant="list" title="Sharing defaults" description="Privacy choices for new links" icon="verified_user" onPress={() => router.push('/settings/sharing-defaults')} />
            <SettingsMenuDivider />
            <SettingsRow variant="list" title={t('language')} description="English • தமிழ்" icon="translate" valueLabel={language === 'en' ? t('english') : t('tamil')} onPress={() => setLanguageSheetVisible(true)} />
          </SettingsMenuGroup>

          <SettingsMenuGroup title="Support">
            <SettingsRow variant="list" title="Help & Support" description="Guides and contact options" icon="menu_book" onPress={() => router.push('/help')} />
          </SettingsMenuGroup>

          <SettingsMenuGroup title="Security & session PIN">
            <SettingsRow variant="list" title="Security & session PIN" description="App lock & PIN verification" icon="lock" valueLabel={appLock.isEnabled ? 'Enabled' : undefined} onPress={() => router.push('/settings/security')} />
          </SettingsMenuGroup>

          <View style={styles.accountFooter}>
            <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Sign out of Broaker" onPress={() => void signOut()} style={({ pressed }) => [styles.signOutButton, { backgroundColor: colors.surface, shadowColor: colors.text }, pressed && styles.pressed]}>
              <AppIcon name="logout" size={20} color={colors.danger} />
              <Text style={[styles.signOutText, { color: colors.danger }]}>Sign out of Broaker</Text>
            </Pressable>
            <View style={styles.compliance}>
              <Text style={[styles.version, { color: colors.textSecondary }]}>Broaker v1.0.0</Text>
              <Text style={[styles.build, { color: colors.textSecondary }]}>Architectural Portfolio Engine • Build 2408</Text>
              <View style={styles.legalLinks}>
                <Pressable cssInterop={false} accessibilityRole="link" onPress={() => router.push('/terms')}><Text style={[styles.legalText, { color: colors.accent }]}>Terms of Service</Text></Pressable>
                <Text style={[styles.legalSeparator, { color: colors.textSecondary }]}>•</Text>
                <Pressable cssInterop={false} accessibilityRole="link" onPress={() => router.push('/privacy')}><Text style={[styles.legalText, { color: colors.accent }]}>Privacy Policy</Text></Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      <PlatformBottomSheet visible={languageSheetVisible} onClose={() => setLanguageSheetVisible(false)} testID="language-picker-sheet">
        <View style={styles.languageSheet}>
          <Text style={[Typography.title, { color: colors.text }]}>{t('chooseLanguage')}</Text>
          {(['en', 'ta', 'te', 'ml'] as const).map((option) => {
            const selected = language === option;
            const label = option === 'en' ? t('english') : option === 'ta' ? t('tamil') : option === 'te' ? t('telugu') : t('malayalam');
            const nativeLabel = option === 'en' ? 'English' : option === 'ta' ? 'தமிழ்' : option === 'te' ? 'తెలుగు' : 'മലയാളം';
            return <Pressable key={option} accessibilityRole="button" accessibilityLabel={nativeLabel} accessibilityState={{ selected }} onPress={() => { setLanguage(option); setLanguageSheetVisible(false); }} style={[styles.languageOption, { backgroundColor: selected ? colors.accentContainer : colors.surfaceLow, borderColor: selected ? colors.accent : colors.border }]}>
              <Text style={[styles.languageOptionText, { color: selected ? colors.onAccentContainer : colors.text }]}>{label}</Text>
              {selected ? <AppIcon name="checkmark" size={18} color={colors.accent} /> : null}
            </Pressable>;
          })}
        </View>
      </PlatformBottomSheet>
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value, suffix }: { icon: 'apartment' | 'share'; label: string; value: string; suffix: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.metric, { backgroundColor: colors.surfaceLow }]}>
      <View style={[styles.metricIcon, { backgroundColor: colors.surfaceHigh }]}><AppIcon name={icon} size={20} color={colors.accent} /></View>
      <View style={styles.metricCopy}>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
        <View style={styles.metricValueRow}><Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text><Text style={[styles.metricSuffix, { color: colors.textSecondary }]}>{suffix}</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, alignItems: 'center' },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  profileCard: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.large },
  profileCardCompact: { gap: Spacing.two, padding: Spacing.two },
  avatar: { width: 56, height: 56, borderRadius: Radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center', position: 'relative', elevation: 2 },
  avatarCompact: { width: 48, height: 48 },
  avatarLetter: { ...Typography.heading, fontWeight: '700', lineHeight: 32 },
  presenceOuter: { position: 'absolute', width: 14, height: 14, borderRadius: Radius.pill, right: -1, bottom: -1, alignItems: 'center', justifyContent: 'center' },
  presence: { width: 9, height: 9, borderRadius: Radius.pill },
  profileCopy: { flex: 1, minWidth: 0, gap: Spacing.half },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  welcome: { ...Typography.labelSmall, letterSpacing: 0.8, textTransform: 'capitalize', fontWeight: '700' },
  profileName: { ...Typography.title, fontWeight: '700' },
  profileEmail: Typography.bodySmall,
  profileShareButton: { width: 44, height: 44, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  metrics: { width: '100%', flexDirection: 'row', gap: Spacing.two },
  metric: { flex: 1, minWidth: 0, minHeight: 70, padding: Spacing.two, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  languageSheet: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  languageOption: { minHeight: 52, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  languageOptionText: { ...Typography.body, fontWeight: '600' },
  metricIcon: { width: 40, height: 40, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  metricCopy: { flex: 1, minWidth: 0, gap: Spacing.half },
  metricLabel: { ...Typography.labelSmall, fontSize: 9, letterSpacing: 0.4 },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  metricValue: { ...Typography.title, fontWeight: '700' },
  metricSuffix: { ...Typography.bodySmall, fontWeight: '500' },
  accountFooter: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.one },
  signOutButton: { width: '100%', minHeight: 48, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one, elevation: 1 },
  signOutText: { ...Typography.label, fontWeight: '700' },
  compliance: { alignItems: 'center', gap: Spacing.half },
  version: { ...Typography.labelSmall, fontWeight: '700' },
  build: { ...Typography.bodySmall, opacity: 0.8, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  legalText: { ...Typography.bodySmall, textDecorationLine: 'underline' },
  legalSeparator: Typography.bodySmall,
  pressed: { opacity: 0.78 },
});
