import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '../../icons';
import { CoreButton } from '../../CoreButton';
import { CoreTextField } from '../../forms/CoreTextField';
import { PlatformBottomSheet } from '../../navigation/PlatformBottomSheet';
import { Radius, Spacing, Typography, getStatusColors } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { useToast } from '@/components/core/toast/ToastProvider';
import type { SigningAuthority, SigningAuthorityDetails } from './types';
import { useState } from 'react';

type AuthorityFieldErrors = Partial<Record<'name' | 'phone' | 'relationship', string>>;

const emptyAuthority: SigningAuthorityDetails = {
  name: '', phone: '', relationship: '', recordLabel: 'Ownership record', recordValue: '',
  verificationLabel: 'Pending', verificationState: 'pending', signatureLabel: 'Pending', signatureState: 'pending',
};

export function SigningAuthoritiesSection({ authorities, onAuthoritySave, onAuthorityRemove, managementAvailable = true, isLoading = false, authoritiesError, onRetryAuthorities }: {
  authorities: SigningAuthority[];
  onAuthoritySave: (authority: SigningAuthorityDetails, id?: string) => void | Promise<void>;
  onAuthorityRemove: (id: string) => void | Promise<void>;
  managementAvailable?: boolean;
  isLoading?: boolean;
  authoritiesError?: string;
  onRetryAuthorities?: () => void;
}) {
  const colors = useTheme();
  const { showToast } = useToast();
  const count = authorities.length;
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<SigningAuthority | null>(null);
  const [form, setForm] = useState<SigningAuthorityDetails>(emptyAuthority);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthorityFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const openNew = () => { setEditing(null); setForm({ ...emptyAuthority }); setError(''); setFieldErrors({}); setEditorVisible(true); };
  const openEdit = (authority: SigningAuthority) => { setEditing(authority); setForm({ name: authority.name, phone: authority.phone ?? '', relationship: authority.relationship, recordLabel: authority.recordLabel, recordValue: authority.recordValue, verificationLabel: authority.verificationLabel, verificationState: authority.verificationState, signatureLabel: authority.signatureLabel, signatureState: authority.signatureState, portraitUri: authority.portraitUri }); setError(''); setFieldErrors({}); setEditorVisible(true); };
  const closeEditor = () => { setEditorVisible(false); setEditing(null); setForm(emptyAuthority); setError(''); setFieldErrors({}); };
  const saveAuthority = () => {
    const phone = form.phone ?? '';
    const nextFieldErrors: AuthorityFieldErrors = {
      ...(form.name.trim().length < 2 ? { name: 'Enter the signer’s full legal name.' } : {}),
      ...(!/^\+?[0-9][0-9\s()-]{6,19}$/.test(phone.trim()) ? { phone: 'Enter a valid phone number.' } : {}),
      ...(!form.relationship.trim() ? { relationship: 'Enter the signer’s relationship to the owner.' } : {}),
    };
    setFieldErrors(nextFieldErrors);
    const firstValidationError = nextFieldErrors.name ?? nextFieldErrors.phone ?? nextFieldErrors.relationship;
    if (firstValidationError) { setError(''); showToast(firstValidationError, 'warning'); return; }
    setSaving(true);
    void Promise.resolve(onAuthoritySave({ ...form, name: form.name.trim(), phone: phone.trim(), relationship: form.relationship.trim(), recordLabel: form.recordLabel.trim() || 'Ownership record', recordValue: form.recordValue.trim() }, editing?.id))
      .then(closeEditor)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not save this signing authority. Please try again.'))
      .finally(() => setSaving(false));
  };
  const removeAuthority = (id: string) => {
    setError('');
    void Promise.resolve(onAuthorityRemove(id)).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not remove this signing authority. Please try again.'));
  };

  return <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.headingCopy}><Text style={[styles.heading, { color: colors.text }]}>Signing Authorities</Text><Text style={[styles.description, { color: colors.textSecondary }]}>Legal owners empowered for title deed execution · {count} of 6</Text></View>
    </View>

    <View style={styles.cardList}>
      {isLoading ? <View accessibilityRole="progressbar" accessibilityLabel="Loading signing authorities" testID="signing-authorities-loading" style={[styles.empty, { backgroundColor: colors.surfaceLow }]}><Text style={[styles.description, { color: colors.textSecondary }]}>Loading signing authorities…</Text></View> : null}
      {error && !editorVisible ? <Text accessibilityRole="alert" style={[styles.formError, { color: colors.danger }]}>{error}</Text> : null}
      {authoritiesError ? <View style={styles.managementActions}><Text accessibilityRole="alert" style={[styles.formError, { color: colors.danger }]}>{authoritiesError}</Text>{onRetryAuthorities ? <CoreButton label="Retry loading signing authorities" variant="secondary" onPress={onRetryAuthorities} /> : null}</View> : null}
      {authorities.map((authority, index) => <AuthorityCard key={authority.id} authority={authority} index={index} editable={managementAvailable && !isLoading && !authoritiesError} canRemove={count > 1} onEdit={() => openEdit(authority)} onRemove={() => removeAuthority(authority.id)} />)}
      {!isLoading && !authoritiesError && authorities.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surfaceLow }]}><Text style={[styles.description, { color: colors.textSecondary }]}>No signing authorities added yet.</Text></View> : null}
    </View>

    <View style={styles.managementActions}><CoreButton label="Add signing authority" leadingIcon="person_add" variant="secondary" disabled={!managementAvailable || isLoading || Boolean(authoritiesError) || saving || count >= 6} onPress={openNew} />
    <Text style={[styles.limitHint, { color: colors.textSecondary }]}>{managementAvailable ? 'Add between 1 and 6 people authorized to sign.' : 'Sign in and load this property to manage signing authorities.'}</Text></View>

    <PlatformBottomSheet visible={editorVisible && managementAvailable} onClose={closeEditor} snapPoints={['full']} testID="signing-authority-editor">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editorContent}>
        <View style={styles.editorHeader}><View style={styles.headingCopy}><Text style={[styles.heading, { color: colors.text }]}>{editing ? 'Edit signing authority' : 'Add signing authority'}</Text><Text style={[styles.description, { color: colors.textSecondary }]}>Enter the details as they appear on the ownership records.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close signing authority form" onPress={closeEditor} style={[styles.closeButton, { backgroundColor: colors.surfaceLow }]}><AppIcon name="close" size={20} color={colors.text} /></Pressable></View>
        <View style={[styles.privacyNote, { backgroundColor: colors.surfaceLow }]}><AppIcon name="lock" size={17} color={colors.accent} /><Text style={[styles.description, { color: colors.textSecondary, flex: 1 }]}>These contact and ownership details stay in the private property workspace.</Text></View>
        <CoreTextField label="Full legal name" required value={form.name} errorMessage={fieldErrors.name} onChangeText={(name) => { setForm((current) => ({ ...current, name })); setError(''); if (name.trim().length >= 2) setFieldErrors((current) => ({ ...current, name: undefined })); }} placeholder="As shown on the ownership record" maxLength={120} testID="signing-authority-name" />
        <CoreTextField label="Phone number" required value={form.phone ?? ''} errorMessage={fieldErrors.phone} onChangeText={(phone) => { setForm((current) => ({ ...current, phone })); setError(''); if (/^\+?[0-9][0-9\s()-]{6,19}$/.test(phone.trim())) setFieldErrors((current) => ({ ...current, phone: undefined })); }} placeholder="+91 98765 43210" keyboardType="phone-pad" autoComplete="tel" maxLength={24} testID="signing-authority-phone" />
        <CoreTextField label="Relationship to owner" required value={form.relationship} errorMessage={fieldErrors.relationship} onChangeText={(relationship) => { setForm((current) => ({ ...current, relationship })); setError(''); if (relationship.trim()) setFieldErrors((current) => ({ ...current, relationship: undefined })); }} placeholder="Self, co-owner, legal heir" maxLength={80} testID="signing-authority-relationship" />
        <CoreTextField label="Record type" value={form.recordLabel} onChangeText={(recordLabel) => setForm((current) => ({ ...current, recordLabel }))} placeholder="Patta, deed, heir certificate" maxLength={80} testID="signing-authority-record-type" />
        <CoreTextField label="Record reference (optional)" value={form.recordValue} onChangeText={(recordValue) => setForm((current) => ({ ...current, recordValue }))} placeholder="Enter a record number" maxLength={100} testID="signing-authority-record-reference" />
        {error ? <Text accessibilityRole="alert" style={[styles.formError, { color: colors.danger }]}>{error}</Text> : null}
        <View style={styles.editorActions}><CoreButton label="Cancel" variant="secondary" disabled={saving} onPress={closeEditor} /><CoreButton label={editing ? 'Save changes' : 'Add signer'} leadingIcon="checkmark" loading={saving} disabled={saving} onPress={saveAuthority} /></View>
      </ScrollView>
    </PlatformBottomSheet>
  </View>;
}

function AuthorityCard({ authority, index, editable, canRemove, onEdit, onRemove }: { authority: SigningAuthority; index: number; editable: boolean; canRemove: boolean; onEdit: () => void; onRemove: () => void }) {
  const colors = useTheme();
  const verification = getStatusColors(colors, authority.verificationState === 'verified' ? 'success' : 'warning');
  const signature = getStatusColors(colors, authority.signatureState === 'ready' ? 'success' : 'neutral');
  const initials = authority.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

  return <View style={[styles.authorityCard, { backgroundColor: colors.surface }]} testID={`signing-authority-${authority.id}`}>
    <View style={styles.cardHeading}>
      <View style={styles.roleLine}><Text style={[styles.indexBadge, { backgroundColor: index === 0 ? colors.accentContainer : colors.surfaceContainer, color: index === 0 ? colors.onAccentContainer : colors.text }]}>{index + 1}</Text><Text style={[styles.roleText, { color: index === 0 ? colors.accent : colors.text }]}>{index === 0 ? 'Primary Titleholder' : 'Co-Signer / Legal Heir'}</Text></View>
      <View style={styles.authorityActions}><Text style={[styles.relationshipBadge, { backgroundColor: colors.surfaceContainer, color: colors.textSecondary }]} numberOfLines={1}>{authority.relationship || 'Relationship not added'}</Text>{editable ? <><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${authority.name || `signing authority ${index + 1}`}`} onPress={onEdit} style={[styles.iconAction, { backgroundColor: colors.surfaceLow }]}><AppIcon name="edit" size={16} color={colors.accent} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${authority.name || `signing authority ${index + 1}`}`} accessibilityState={{ disabled: !canRemove }} disabled={!canRemove} onPress={onRemove} style={[styles.iconAction, { backgroundColor: colors.surfaceLow }, !canRemove && styles.disabled]}><AppIcon name="delete" size={16} color={!canRemove ? colors.iconMuted : colors.danger} /></Pressable></> : null}</View>
    </View>
    <View style={styles.personRow}>
      <View style={[styles.avatar, { backgroundColor: colors.surfaceContainer }]}>
        {authority.portraitUri ? <Image source={{ uri: authority.portraitUri }} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel={`${authority.name} profile`} /> : <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>}
      </View>
      <View style={styles.personCopy}><Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>{authority.name || 'Name not added'}</Text><View style={styles.contactLine}><AppIcon name="call" size={14} color={colors.textSecondary} /><Text style={[styles.contact, { color: colors.textSecondary }]} numberOfLines={1}>{authority.phone || 'Phone not added'}</Text></View></View>
    </View>
    <View style={styles.metadataGrid}>
      <MetadataCell label={authority.recordLabel} value={authority.recordValue} />
      {index === 0
        ? <MetadataCell label="Verification" value={authority.verificationLabel} tone={{ background: verification.background, foreground: verification.foreground }} />
        : <MetadataCell label="Signature Status" value={authority.signatureLabel} tone={{ background: signature.background, foreground: signature.foreground }} />}
    </View>
  </View>;
}

function MetadataCell({ label, value, tone }: { label: string; value: string; tone?: { background: string; foreground: string } }) {
  const colors = useTheme();
  return <View style={[styles.metadataCell, { backgroundColor: colors.surfaceLow }]}><Text style={[styles.metadataLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text><Text style={[styles.metadataValue, { color: tone?.foreground ?? colors.text, backgroundColor: tone?.background ?? 'transparent' }]} numberOfLines={2}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, headingCopy: { flex: 1, minWidth: 0, gap: Spacing.half }, heading: { ...Typography.title }, description: { ...Typography.bodySmall },
  cardList: { gap: Spacing.two }, authorityCard: { padding: Spacing.three, borderRadius: Radius.medium, gap: Spacing.two }, cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, roleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1, minWidth: 0 }, indexBadge: { width: 24, height: 24, borderRadius: Radius.pill, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', ...Typography.labelSmall, paddingTop: 5 }, roleText: { ...Typography.label, flexShrink: 1 }, authorityActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, relationshipBadge: { maxWidth: 140, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, ...Typography.labelSmall }, iconAction: { width: 34, height: 34, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.one }, avatar: { width: 48, height: 48, borderRadius: Radius.pill, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, avatarText: { ...Typography.label }, personCopy: { flex: 1, minWidth: 0, gap: Spacing.half }, personName: { ...Typography.title }, contactLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, contact: { ...Typography.bodySmall },
  metadataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingTop: Spacing.one }, metadataCell: { flexBasis: '45%', flexGrow: 1, minWidth: 0, minHeight: 52, borderRadius: Radius.small, padding: Spacing.two, gap: Spacing.half }, metadataLabel: { ...Typography.labelSmall }, metadataValue: { alignSelf: 'flex-start', borderRadius: Radius.small, ...Typography.labelSmall, fontWeight: '600' },
  managementActions: { gap: Spacing.two }, limitHint: { ...Typography.labelSmall, textAlign: 'center' }, disabled: { opacity: 0.55 }, empty: { minHeight: 68, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', padding: Spacing.two }, editorContent: { gap: Spacing.three, padding: Spacing.four, paddingBottom: Spacing.six }, editorHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, closeButton: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, borderRadius: Radius.medium, padding: Spacing.three }, formError: { ...Typography.bodySmall }, editorActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, flexWrap: 'wrap' },
});
