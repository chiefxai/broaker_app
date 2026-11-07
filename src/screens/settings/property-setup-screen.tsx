import { useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOptionalAuth } from '@/auth/auth-provider';
import { getPropertyCategories, savePropertyCategories, type PropertyCategory } from '@/api/backend-api';
import { AppIcon, CoreButton } from '@/components/core';
import { LoadingSkeleton, SkeletonBlock } from '@/components/core/LoadingSkeleton';
import { isMockMode } from '@/data/app-mode';
import { mockPropertyCategories } from '@/data/mock/settings';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { SettingsIntro, SettingsPage, SettingsSection } from './settings-ui';
import { useToast } from '@/components/core/toast/ToastProvider';

export default function PropertySetupScreen() {
  const colors = useTheme(); const auth = useOptionalAuth(); const queryClient = useQueryClient();
  const { showToast } = useToast();
  const query = useQuery({ queryKey: ['backend', 'property-categories'], queryFn: () => auth?.accessToken ? getPropertyCategories(auth.accessToken) : Promise.reject(new Error('Sign in to load categories.')), enabled: !isMockMode && Boolean(auth?.accessToken) });
  const [draft, setDraft] = useState(mockPropertyCategories); const [isDirty, setIsDirty] = useState(false); const categories = isDirty || isMockMode ? draft : query.data ?? draft; const [saved, setSaved] = useState(false); const [saving, setSaving] = useState(false);
  const enabledCount = useMemo(() => categories.filter((item) => item.enabled).length, [categories]);
  const toggle = (code: PropertyCategory, enabled: boolean) => { setIsDirty(true); setSaved(false); setDraft((items) => items.map((item) => item.code === code ? { ...item, enabled } : item)); };
  const save = async () => {
    if (!enabledCount) { showToast('Keep at least one property category enabled.', 'error'); return; }
    if (isMockMode) { setSaved(true); showToast('Property settings saved on this preview.', 'success'); return; }
    if (!auth?.accessToken) { showToast('Sign in to save property settings.', 'warning'); return; }
    setSaving(true);
    try { await savePropertyCategories(auth.accessToken, { items: categories.map(({ code, enabled, sort_order }) => ({ code, enabled, sort_order })) }); await queryClient.invalidateQueries({ queryKey: ['backend', 'property-categories'] }); setSaved(true); showToast('Property settings saved.', 'success'); }
    catch { showToast('Could not save these settings. Try again.', 'error'); }
    finally { setSaving(false); }
  };
  const discard = () => { setIsDirty(false); setDraft(isMockMode ? mockPropertyCategories : query.data ?? mockPropertyCategories); setSaved(false); showToast('Changes discarded.', 'info'); };
  return <SettingsPage title="Property Setup">
    <SettingsIntro title="Choose your listing categories" description="Turn on the property types you work with. Your listing form adjusts to the enabled categories." />
    <View style={[styles.summary, { backgroundColor: colors.accentContainer }]}><AppIcon name="domain" size={20} color={colors.accent} /><Text style={[styles.summaryText, { color: colors.onAccentContainer }]}>{enabledCount} of {categories.length} categories enabled</Text></View>
    {!isMockMode && query.isLoading ? <LoadingSkeleton label="Loading property categories" style={styles.loadingRows}>{[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} style={styles.loadingRow} />)}</LoadingSkeleton> : null}
    {!isMockMode && query.isError ? <Text accessibilityRole="alert" style={[styles.helper, { color: colors.dangerText }]}>Unable to load categories. Default categories are shown; retry by reopening this page.</Text> : null}
    {!(!isMockMode && query.isLoading) ? <SettingsSection title="Available categories">{categories.map((item) => <View key={item.code} style={[styles.row, { backgroundColor: colors.surface }]}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceContainer }]}><AppIcon name={item.code === 'agriculture' ? 'eco' : item.code === 'apartment' ? 'apartment' : 'real_estate_agent'} size={18} color={colors.accent} /></View>
      <View style={styles.copy}><Text style={[styles.name, { color: colors.text }]}>{item.label}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{item.enabled ? 'Included in new listing forms' : 'Hidden from new listing forms'}</Text></View>
      <Switch accessibilityLabel={item.label} value={item.enabled} onValueChange={(value) => toggle(item.code, value)} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={item.enabled ? colors.onPrimary : colors.surface} />
    </View>)}</SettingsSection> : null}
    <View style={[styles.preview, { backgroundColor: colors.surfaceLow }]}><Text style={[styles.previewTitle, { color: colors.text }]}>Listing form preview</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{enabledCount ? categories.filter((item) => item.enabled).map((item) => item.label).join(' · ') : 'Enable a category to preview its listing form.'}</Text></View>
    <View style={styles.actions}><CoreButton label={saving ? 'Saving…' : saved ? 'Saved' : 'Save property settings'} loading={saving} disabled={saving} onPress={() => void save()} /><CoreButton label="Discard changes" variant="ghost" disabled={saving} onPress={discard} /></View>
  </SettingsPage>;
}

const styles = StyleSheet.create({ summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.medium }, summaryText: Typography.label, row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.medium, minHeight: 68 }, loadingRows: { gap: Spacing.two }, loadingRow: { width: '100%', height: 68, borderRadius: Radius.medium }, icon: { width: 38, height: 38, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, gap: Spacing.half }, name: Typography.label, helper: Typography.bodySmall, preview: { padding: Spacing.three, borderRadius: Radius.large, gap: Spacing.one }, previewTitle: Typography.label, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two } });
