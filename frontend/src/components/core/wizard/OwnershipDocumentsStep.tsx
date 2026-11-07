import { StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { AppIcon } from '../icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { LegalDocumentsSection } from './ownership-documents/LegalDocumentsSection';
import { PrivateWorkspaceSection } from './ownership-documents/PrivateWorkspaceSection';
import { ReferenceLinksSection } from './ownership-documents/ReferenceLinksSection';
import { SigningAuthoritiesSection } from './ownership-documents/SigningAuthoritiesSection';
import type { OwnershipDocumentsStepProps } from './ownership-documents/types';

export type { OwnershipDocumentsStepProps } from './ownership-documents/types';
export type { AssignedFieldAssociate, LegalDocument, PropertyReferenceLink, SigningAuthority, SigningAuthorityDetails } from './ownership-documents/types';
export type { LegalDocumentCategory } from '@/api/legal-document-upload';

export function OwnershipDocumentsStep(props: OwnershipDocumentsStepProps) {
  const colors = useTheme();
  return <View style={styles.root} testID="ownership-documents-step">
    <View style={styles.progress}>
      <View style={styles.progressTop}><Text style={[styles.progressLabel, { color: colors.accent }]}>STEP 5 OF 6 · OWNERSHIP & DOCUMENTS</Text><Text style={[styles.progressLabel, { color: colors.textSecondary }]}>83% completed</Text></View>
      <View accessibilityRole="progressbar" accessibilityLabel="Property form progress, step 5 of 6" accessibilityValue={{ min: 0, max: 100, now: 83 }} testID="ownership-documents-progress" style={[styles.progressTrack, { backgroundColor: colors.surfaceContainer }]}><View style={[styles.progressFill, { backgroundColor: colors.accent, width: '83%' }]} /></View>
    </View>

    <View style={[styles.privacyBanner, { backgroundColor: colors.surfaceHigh }]}>
      <View style={[styles.privacyIcon, { backgroundColor: colors.surface }]}><AppIcon name="lock" size={19} color={colors.accent} /></View>
      <View style={styles.privacyCopy}><View style={styles.privacyTitleRow}><Text style={[styles.privacyTitle, { color: colors.text }]}>Broker Vault</Text><Text style={[styles.privacyBadge, { backgroundColor: colors.surface, color: colors.accent }]}>STRICTLY PRIVATE</Text></View><Text style={[styles.privacyDescription, { color: colors.textSecondary }]}>Owner details, contacts, title documents, and notes belong to your private workspace and are excluded from public share previews.</Text></View>
    </View>

    <SigningAuthoritiesSection authorities={props.authorities} onAuthoritySave={props.onAuthoritySave} onAuthorityRemove={props.onAuthorityRemove} managementAvailable={props.authorityManagementAvailable} isLoading={props.isLoadingAuthorities} authoritiesError={props.authoritiesError} onRetryAuthorities={props.onRetryAuthorities} />
    <PrivateWorkspaceSection fieldAssociate={props.fieldAssociate} onChooseFieldAssociate={props.onChooseFieldAssociate} privateNotes={props.privateNotes} onPrivateNotesChange={props.onPrivateNotesChange} lastEditedLabel={props.lastEditedLabel} />
    <LegalDocumentsSection documents={props.documents} onChooseDocument={props.onChooseDocument} selectedCategory={props.selectedDocumentCategory} onCategoryChange={props.onDocumentCategoryChange} isUploading={props.isUploadingDocument} onScanDocument={props.onScanDocument} onOpenDocument={props.onOpenDocument} onDocumentActions={props.onDocumentActions} isLoading={props.isLoadingDocuments} error={props.documentsError} onRetry={props.onRetryDocuments} />
    <ReferenceLinksSection links={props.referenceLinks} onAdd={props.onAddReferenceLink} onOpen={props.onOpenReferenceLink} available={props.referenceLinksAvailable} />
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: Spacing.four },
  progress: { gap: Spacing.one }, progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two }, progressLabel: { ...Typography.labelSmall }, progressTrack: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: Radius.pill },
  privacyBanner: { padding: Spacing.three, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }, privacyIcon: { width: 36, height: 36, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' }, privacyCopy: { flex: 1, minWidth: 0, gap: Spacing.half }, privacyTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.one }, privacyTitle: { ...Typography.label }, privacyBadge: { ...Typography.labelSmall, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half }, privacyDescription: { ...Typography.bodySmall },
});
