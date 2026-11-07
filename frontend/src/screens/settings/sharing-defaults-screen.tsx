import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOptionalAuth } from '@/auth/auth-provider';
import { getPreferences, savePreferences, type ApiPreferences, type ApiShareDisclosures } from '@/api/backend-api';
import { AppIcon, CoreButton } from '@/components/core';
import { LoadingSkeleton, SkeletonBlock } from '@/components/core/LoadingSkeleton';
import { isMockMode } from '@/data/app-mode';
import { recommendedShareDisclosures } from '@/data/mock/settings';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { SettingsIntro, SettingsPage, SettingsSection } from './settings-ui';
import { useToast } from '@/components/core/toast/ToastProvider';

const options: { key: keyof ApiShareDisclosures; title: string; description: string; icon: 'person' | 'document' | 'location_on' | 'view_agenda' | 'currency_rupee' | 'map' | 'photo_camera' | 'folder_managed' | 'document_scanner' | 'contact_page' | 'add_road' }[] = [
  { key: 'show_name', title: 'Property name', description: 'Include the listing name', icon: 'person' },
  { key: 'show_description', title: 'Description', description: 'Include the property description', icon: 'document' },
  { key: 'show_location', title: 'Approximate location', description: 'Show district and state', icon: 'location_on' },
  { key: 'show_specifications', title: 'Specifications', description: 'Include property features and specifications', icon: 'view_agenda' },
  { key: 'show_price', title: 'Price', description: 'Include the asking price', icon: 'currency_rupee' },
  { key: 'show_exact_coordinates', title: 'Exact location', description: 'Share precise map coordinates', icon: 'location_on' },
  { key: 'show_photos', title: 'Property photos', description: 'Include listing photos', icon: 'photo_camera' },
  { key: 'show_documents', title: 'Documents', description: 'Include documents approved for sharing', icon: 'folder_managed' },
  { key: 'show_reports', title: 'Property reports', description: 'Include attached reports', icon: 'document_scanner' },
  { key: 'show_broker_contact', title: 'Broker contact details', description: 'Include your public business contact details', icon: 'contact_page' },
  { key: 'show_approach_roads', title: 'Road access details', description: 'Share approach type and width', icon: 'add_road' },
];
const expirationOptions: { days: 1 | 7 | 30 | 90 | 365 | null; label: string }[] = [
  { days: null, label: 'No expiration' },
  { days: 1, label: '1 day' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
];

export default function SharingDefaultsScreen() {
  const colors = useTheme(); const auth = useOptionalAuth(); const queryClient = useQueryClient();
  const { showToast } = useToast();
  const query = useQuery({ queryKey: ['backend', 'preferences'], queryFn: () => auth?.accessToken ? getPreferences(auth.accessToken) : Promise.reject(new Error('Sign in to load sharing defaults.')), enabled: !isMockMode && Boolean(auth?.accessToken) });
  const [draft, setDraft] = useState(recommendedShareDisclosures); const [isDirty, setIsDirty] = useState(false); const disclosures: ApiShareDisclosures = { ...recommendedShareDisclosures, ...(isDirty || isMockMode ? draft : query.data?.default_disclosures ?? {}) }; const [draftExpirationDays, setDraftExpirationDays] = useState<ApiPreferences['default_expiration_days']>(null); const [expirationDirty, setExpirationDirty] = useState(false); const expirationDays = isMockMode || expirationDirty ? draftExpirationDays ?? null : query.data?.default_expiration_days ?? null; const [saving, setSaving] = useState(false);
  const enabledCount = Object.values(disclosures).filter(Boolean).length;
  const toggle = (key: keyof ApiShareDisclosures, value: boolean) => { setIsDirty(true); setDraft({ ...disclosures, [key]: value }); };
  const save = async () => {
    if (isMockMode) { showToast('Sharing defaults saved on this preview.', 'success'); return; }
    if (!auth?.accessToken) { showToast('Sign in to save sharing defaults.', 'warning'); return; }
    setSaving(true);
    try { await savePreferences(auth.accessToken, { default_disclosures: disclosures, default_expiration_days: expirationDays }); setExpirationDirty(false); await queryClient.invalidateQueries({ queryKey: ['backend', 'preferences'] }); showToast('Sharing defaults saved.', 'success'); }
    catch { showToast('Could not save sharing defaults. Try again.', 'error'); }
    finally { setSaving(false); }
  };
  return <SettingsPage title="Sharing Defaults">
    <SettingsIntro title="Choose what new links include" description="These are the default privacy choices for links you create. You can still customize each link before sharing." />
    <View style={[styles.summary, { backgroundColor: colors.accentContainer }]}><AppIcon name="verified_user" size={20} color={colors.accent} /><Text style={[styles.summaryText, { color: colors.onAccentContainer }]}>{enabledCount} of {options.length} sharing options enabled</Text></View>
    {!isMockMode && query.isLoading ? <LoadingSkeleton label="Loading sharing defaults" style={styles.loadingRows}>{options.map(({ key }) => <SkeletonBlock key={key} style={styles.loadingRow} />)}</LoadingSkeleton> : null}
    {!isMockMode && query.isError ? <Text accessibilityRole="alert" style={[styles.description, { color: colors.dangerText }]}>Unable to load current defaults. Recommended safe defaults are shown.</Text> : null}
    {!(!isMockMode && query.isLoading) ? <SettingsSection title="Default visibility">
      {options.map(({ key, title, description, icon }) => <View key={key} style={[styles.option, { backgroundColor: colors.surface }]}>
        <View style={[styles.icon, { backgroundColor: colors.surfaceContainer }]}><AppIcon name={icon} size={18} color={colors.accent} /></View>
        <View style={styles.copy}><Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text></View>
        <Switch accessibilityLabel={title} value={disclosures[key]} onValueChange={(value) => toggle(key, value)} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={disclosures[key] ? colors.onPrimary : colors.surface} />
      </View>)}
    </SettingsSection> : null}
    <SettingsSection title="Default link expiration">
      <Text style={[styles.description, { color: colors.textSecondary }]}>Used to prefill expiry for new links, including profile sharing from Settings. You can change or clear it before creating a link.</Text>
      <View style={styles.expirationOptions}>
        {expirationOptions.map(({ days, label }) => {
          const selected = expirationDays === days;
          return <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => { setDraftExpirationDays(days); setExpirationDirty(true); }} style={[styles.expirationOption, { backgroundColor: selected ? colors.accentContainer : colors.surface, borderColor: selected ? colors.accent : colors.border }]}>
            {selected ? <AppIcon name="checkmark" size={16} color={colors.accent} /> : null}
            <Text style={[styles.expirationOptionText, { color: selected ? colors.onAccentContainer : colors.text }]}>{label}</Text>
          </Pressable>;
        })}
      </View>
    </SettingsSection>
    <View style={[styles.preview, { backgroundColor: colors.surfaceLow }]}><Text style={[styles.optionTitle, { color: colors.text }]}>Buyer preview</Text><Text style={[styles.description, { color: colors.textSecondary }]}>New links will {disclosures.show_price ? 'show' : 'hide'} price, {disclosures.show_exact_coordinates ? 'show the exact pin' : 'use approximate location'}, {disclosures.show_photos ? 'include' : 'hide'} photos, and {disclosures.show_broker_contact ? 'show' : 'hide'} your public business contact details. Links expire {expirationDays == null ? 'without a time limit' : `after ${expirationOptions.find(({ days }) => days === expirationDays)?.label.toLowerCase()}`}.</Text></View>
    <Text style={[styles.description, { color: colors.textSecondary }]}>These defaults apply to each property in new shared links. You can adjust them for individual properties before sharing. Only public business contact details are shared.</Text>
    <View style={styles.actions}><CoreButton label={saving ? 'Saving…' : 'Save sharing defaults'} loading={saving} disabled={saving || (!isMockMode && query.isLoading)} onPress={() => void save()} /><CoreButton label="Reset to recommended" variant="ghost" disabled={saving || (!isMockMode && query.isLoading)} onPress={() => { setIsDirty(true); setDraft(recommendedShareDisclosures); showToast('Recommended privacy defaults restored. Save to apply.', 'info'); }} /></View>
  </SettingsPage>;
}

const styles = StyleSheet.create({ summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.medium }, summaryText: Typography.label, option: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.medium }, loadingRows: { gap: Spacing.two }, loadingRow: { width: '100%', height: 68, borderRadius: Radius.medium }, icon: { width: 38, height: 38, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, gap: Spacing.half }, optionTitle: Typography.label, description: Typography.bodySmall, expirationOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one }, expirationOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.pill }, expirationOptionText: { ...Typography.labelSmall }, preview: { padding: Spacing.three, gap: Spacing.one, borderRadius: Radius.large }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two } });
