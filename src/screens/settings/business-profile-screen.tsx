import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOptionalAuth } from '@/auth/auth-provider';
import { getBrokerProfile, getBusinessProfile, patchBrokerProfile, saveBusinessProfile, type ApiBrokerProfile, type ApiBusinessProfile } from '@/api/backend-api';
import { CoreButton, CoreTextField } from '@/components/core';
import { BusinessProfileCard } from '@/components/core/profile';
import { isMockMode } from '@/data/app-mode';
import { mockBrokerProfile, mockBusinessProfile } from '@/data/mock/settings';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { SettingsIntro, SettingsPage, SettingsSection } from './settings-ui';
import { useToast } from '@/components/core/toast/ToastProvider';
import { getApiErrorMessage } from '@/api/errors';

export default function BusinessProfileScreen() {
  const colors = useTheme();
  const auth = useOptionalAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const profileQuery = useQuery({ queryKey: ['backend', 'business-profile'], queryFn: () => auth?.accessToken ? getBusinessProfile(auth.accessToken) : Promise.reject(new Error('Sign in to edit the business profile.')), enabled: !isMockMode && Boolean(auth?.accessToken) });
  const brokerQuery = useQuery({ queryKey: ['backend', 'broker-profile'], queryFn: () => auth?.accessToken ? getBrokerProfile(auth.accessToken) : Promise.reject(new Error('Sign in to edit the broker profile.')), enabled: !isMockMode && Boolean(auth?.accessToken) });
  type BusinessProfileForm = ApiBusinessProfile & Pick<ApiBrokerProfile, 'legal_name'>;
  const [draft, setDraft] = useState<BusinessProfileForm>({ ...mockBusinessProfile, legal_name: mockBrokerProfile.legal_name });
  const [isDirty, setIsDirty] = useState(false);
  const form: BusinessProfileForm = isDirty || isMockMode ? draft : { ...profileQuery.data, legal_name: brokerQuery.data?.legal_name ?? '' };
  const [saving, setSaving] = useState(false);
  const update = (key: keyof BusinessProfileForm, value: string) => { setDraft((current) => ({ ...(isDirty ? current : form), [key]: value })); setIsDirty(true); };
  const save = async () => {
    if (!form.business_name?.trim()) { showToast('Enter a business name before saving.', 'error'); return; }
    if (!form.legal_name.trim()) { showToast('Enter your full name before saving.', 'error'); return; }
    if (form.public_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.public_email)) { showToast('Enter a valid public email address.', 'error'); return; }
    if (isMockMode) { setDraft(form); setIsDirty(false); showToast('Business profile saved on this preview.', 'success'); return; }
    if (!auth?.accessToken) { showToast('Sign in to save your business profile.', 'warning'); return; }
    setSaving(true);
    try {
      const businessProfile: ApiBusinessProfile = { business_name: form.business_name, public_phone: form.public_phone, public_email: form.public_email, city: form.city, district: form.district, state: form.state };
      await Promise.all([patchBrokerProfile(auth.accessToken, { legal_name: form.legal_name.trim() }), saveBusinessProfile(auth.accessToken, businessProfile)]);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['backend', 'business-profile'] }), queryClient.invalidateQueries({ queryKey: ['backend', 'broker-profile'] })]);
      setDraft(form); setIsDirty(false); showToast('Business profile saved.', 'success');
    }
    catch (error) { showToast(getApiErrorMessage(error, 'Could not save the profile. Check your connection and try again.'), 'error'); }
    finally { setSaving(false); }
  };
  const cancel = () => { setIsDirty(false); setDraft({ ...mockBusinessProfile, legal_name: mockBrokerProfile.legal_name }); showToast('Changes discarded.', 'info'); };
  return <SettingsPage title="Business Profile">
    <SettingsIntro title="Your business profile" description="Control the business and contact details shown on shared property links." />
    <View style={[styles.preview, { backgroundColor: colors.surfaceLow, borderColor: colors.border }]}>
      <View style={styles.previewHeading}>
        <View style={styles.previewHeadingCopy}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>LISTING PREVIEW</Text>
          <Text style={[styles.copy, { color: colors.textSecondary }]}>Updates as you edit</Text>
        </View>
        <Text style={[styles.publicBadge, { color: colors.accent, backgroundColor: colors.accentContainer }]}>Public</Text>
      </View>
      <BusinessProfileCard
        businessName={form.business_name || 'Your business name'}
        representativeName={form.legal_name || 'Your full name'}
        location={[form.city, form.district, form.state].filter(Boolean).join(', ') || 'Your operating area'}
        phone={form.public_phone || 'Phone not added'}
        email={form.public_email || 'Email not added'}
        style={styles.previewCard}
      />
    </View>
    {!isMockMode && profileQuery.isLoading ? <ActivityIndicator accessibilityLabel="Loading business profile" color={colors.accent} /> : null}
    {!isMockMode && profileQuery.isError ? <Text accessibilityRole="alert" style={[styles.copy, { color: colors.dangerText }]}>Could not load your profile. You can still enter details and retry saving.</Text> : null}
    <SettingsSection title="Business identity">
      <CoreTextField label="Business name" value={form.business_name ?? ''} onChangeText={(v) => update('business_name', v)} placeholder="e.g. Vance Real Estate" maxLength={200} />
      <CoreTextField label="Your full name" value={form.legal_name ?? ''} onChangeText={(v) => update('legal_name', v)} placeholder="Full legal name" maxLength={200} />
    </SettingsSection>
    <SettingsSection title="Public contact">
      <CoreTextField label="Phone / WhatsApp" value={form.public_phone ?? ''} onChangeText={(v) => update('public_phone', v)} placeholder="+91 98765 43210" keyboardType="phone-pad" maxLength={40} />
      <CoreTextField label="Public email" value={form.public_email ?? ''} onChangeText={(v) => update('public_email', v)} placeholder="hello@example.com" keyboardType="email-address" autoCapitalize="none" maxLength={254} />
    </SettingsSection>
    <SettingsSection title="Operating territory">
      <CoreTextField label="City" value={form.city ?? ''} onChangeText={(v) => update('city', v)} placeholder="City" maxLength={100} />
      <CoreTextField label="District" value={form.district ?? ''} onChangeText={(v) => update('district', v)} placeholder="District" maxLength={100} />
      <CoreTextField label="State" value={form.state ?? ''} onChangeText={(v) => update('state', v)} placeholder="State" maxLength={100} />
    </SettingsSection>
    <View style={styles.actions}><CoreButton label="Save profile" loading={saving} disabled={saving} onPress={() => void save()} />{isDirty ? <CoreButton label="Discard changes" variant="ghost" disabled={saving} onPress={cancel} /> : null}</View>
  </SettingsPage>;
}

const styles = StyleSheet.create({
  preview: { padding: Spacing.three, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.large, gap: Spacing.two },
  previewHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  previewHeadingCopy: { flex: 1, minWidth: 0, gap: Spacing.half },
  previewCard: { borderWidth: StyleSheet.hairlineWidth },
  eyebrow: { ...Typography.labelSmall, letterSpacing: 0.8 },
  copy: Typography.bodySmall,
  publicBadge: { ...Typography.labelSmall, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Radius.pill, overflow: 'hidden' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
