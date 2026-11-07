import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '@/components/core/icons';
import type { ApiShareDisclosures } from '@/api/backend-api';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

const DISCLOSURE_OPTIONS: { key: keyof ApiShareDisclosures; label: string }[] = [
  { key: 'show_name', label: 'Property name' },
  { key: 'show_description', label: 'Property description' },
  { key: 'show_location', label: 'Approximate location' },
  { key: 'show_specifications', label: 'Property specifications' },
  { key: 'show_price', label: 'Asking price & total land extent' },
  { key: 'show_photos', label: 'Photo gallery' },
  { key: 'show_broker_contact', label: 'Broker contact details' },
  { key: 'show_exact_coordinates', label: 'Exact GPS coordinates' },
  { key: 'show_approach_roads', label: 'Approach roads' },
  { key: 'show_documents', label: 'Documents' },
  { key: 'show_reports', label: 'Property reports' },
];

export function PublicShareAccessSection({ enabled, onEnabledChange, disclosures, onDisclosureChange, shareUrl, shareLinkStatus = 'idle', shareLinkMessage, canCreateShareLink = false, onCreateShareLink, onCopyShareLink, onRetryShareLinks }: {
  enabled: boolean; onEnabledChange: (enabled: boolean) => void; disclosures: ApiShareDisclosures; onDisclosureChange: (key: keyof ApiShareDisclosures, value: boolean) => void;
  shareUrl?: string | null; shareLinkStatus?: 'idle' | 'saving' | 'error'; shareLinkMessage?: string; canCreateShareLink?: boolean; onCreateShareLink?: () => void; onCopyShareLink?: () => void;
  onRetryShareLinks?: () => void;
}) {
  const colors = useTheme();
  return <View style={styles.section} testID="review-public-share">
    <View style={styles.sectionHeading}><View style={styles.heading}><AppIcon name="share" size={20} color={colors.accent} /><Text style={[styles.headingText, { color: colors.text }]}>Public Share Access</Text></View><View style={styles.privacy}><AppIcon name="lock" size={13} color={colors.textSecondary} /><Text style={[styles.privacyText, { color: colors.textSecondary }]}>Privacy controls</Text></View></View>
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.masterRow}><View style={styles.copy}><Text style={[styles.masterTitle, { color: colors.text }]}>Enable Public Web Preview</Text><Text style={[styles.description, { color: colors.textSecondary }]}>Allow prospect buyers with a link to view selected property details.</Text></View><Switch accessibilityLabel="Enable public web preview" value={enabled} onValueChange={onEnabledChange} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={enabled ? colors.onPrimary : colors.surface} /></View>
      <View style={styles.options}><Text style={[styles.label, { color: colors.textSecondary }]}>VISIBLE TO PUBLIC LINK</Text>
        {DISCLOSURE_OPTIONS.map(({ key, label }) => <Pressable key={key} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: Boolean(disclosures[key]), disabled: !enabled }} disabled={!enabled} onPress={() => onDisclosureChange(key, !disclosures[key])} style={[styles.option, { backgroundColor: enabled ? colors.surfaceLow : colors.surfaceContainer }]}><Text style={[styles.optionLabel, { color: enabled ? colors.text : colors.textSecondary }]}>{label}</Text><AppIcon name={disclosures[key] && enabled ? 'visibility' : 'visibility_off'} size={17} color={disclosures[key] && enabled ? colors.accent : colors.iconMuted} /></Pressable>)}
        <LockedOption label="Owner contacts & signatory identity" />
        <LockedOption label="Patta copies & internal broker notes" />
      </View>
      <View style={[styles.linkPreview, { backgroundColor: colors.surfaceLow }]}>
        <View style={styles.urlRow}><AppIcon name="link" size={17} color={colors.accent} /><Text style={[styles.url, { color: colors.textSecondary }]} numberOfLines={1}>{shareUrl ?? 'A public link will be available after publishing.'}</Text></View>
        {shareUrl ? <Pressable accessibilityRole="button" accessibilityLabel="Copy public share link" onPress={onCopyShareLink} style={[styles.copyButton, { backgroundColor: colors.surface }]}><AppIcon name="content_copy" size={14} color={colors.text} /><Text style={[styles.copyText, { color: colors.text }]}>Copy</Text></Pressable> : null}
      </View>
      {canCreateShareLink ? <Pressable accessibilityRole="button" disabled={shareLinkStatus === 'saving'} onPress={onCreateShareLink} style={[styles.createButton, { backgroundColor: colors.accent }, shareLinkStatus === 'saving' && styles.disabled]}><AppIcon name={shareLinkStatus === 'saving' ? 'schedule' : 'link'} size={17} color={colors.onPrimary} /><Text style={[styles.createText, { color: colors.onPrimary }]}>{shareLinkStatus === 'saving' ? 'Saving link…' : shareUrl ? 'Update public share link' : 'Create public share link'}</Text></Pressable> : null}
      {shareLinkMessage ? <Text accessibilityRole={shareLinkStatus === 'error' ? 'alert' : 'status'} style={[styles.message, { color: shareLinkStatus === 'error' ? colors.dangerText : colors.textSecondary }]}>{shareLinkMessage}</Text> : null}
      {shareLinkStatus === 'error' && onRetryShareLinks ? <Pressable accessibilityRole="button" onPress={onRetryShareLinks} style={styles.retry}><Text style={[styles.copyText, { color: colors.accent }]}>Retry</Text></Pressable> : null}
    </View>
  </View>;
}

function LockedOption({ label }: { label: string }) {
  const colors = useTheme();
  return <View accessibilityLabel={`${label}, confidential`} style={[styles.option, { backgroundColor: colors.surfaceContainer }]}><AppIcon name="lock" size={16} color={colors.iconMuted} /><Text style={[styles.optionLabel, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.confidential, { color: colors.textSecondary }]}>CONFIDENTIAL</Text></View>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two }, sectionHeading: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, headingText: { ...Typography.title }, privacy: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half }, privacyText: { ...Typography.labelSmall }, card: { padding: Spacing.three, borderRadius: Radius.medium, gap: Spacing.three }, masterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, copy: { flex: 1, minWidth: 0, gap: Spacing.half }, masterTitle: { ...Typography.label }, description: { ...Typography.bodySmall }, options: { gap: Spacing.one }, label: { ...Typography.labelSmall, letterSpacing: 0.6, marginBottom: Spacing.half }, option: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.small }, optionLabel: { ...Typography.bodySmall, flex: 1 }, confidential: { ...Typography.labelSmall, fontSize: 9 }, linkPreview: { minHeight: 44, borderRadius: Radius.small, padding: Spacing.one, flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, urlRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, url: { flex: 1, ...Typography.labelSmall }, copyButton: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radius.small }, copyText: { ...Typography.labelSmall }, createButton: { minHeight: 44, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one }, createText: { ...Typography.label }, message: { ...Typography.bodySmall }, retry: { alignSelf: 'flex-start', paddingVertical: Spacing.one }, disabled: { opacity: 0.6 },
});
