import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { DocumentFileRow, type DocumentVerificationState } from '../../media/DocumentFileRow';
import { AppIcon } from '../../icons';
import { Radius, Spacing, Typography, type StatusTone } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import type { LegalDocument } from './types';
import type { LegalDocumentCategory } from '@/api/legal-document-upload';

const DOCUMENT_CATEGORIES: readonly { value: LegalDocumentCategory; label: string }[] = [
  { value: 'title_deed', label: 'Title deed' },
  { value: 'survey', label: 'Survey record' },
  { value: 'soil_report', label: 'Soil report' },
  { value: 'other', label: 'Other' },
];

export function LegalDocumentsSection({ documents, onChooseDocument, onScanDocument, onOpenDocument, onDocumentActions, isLoading = false, isUploading = false, selectedCategory = 'title_deed', onCategoryChange, error, onRetry }: {
  documents: LegalDocument[];
  onChooseDocument: (category: LegalDocumentCategory) => void;
  selectedCategory?: LegalDocumentCategory;
  onCategoryChange?: (category: LegalDocumentCategory) => void;
  onScanDocument: () => void;
  onOpenDocument?: (document: LegalDocument) => void;
  onDocumentActions?: (document: LegalDocument) => void;
  isLoading?: boolean;
  isUploading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const colors = useTheme();
  return <View style={styles.section}>
    <View style={styles.sectionHeading}><View style={styles.headingCopy}><Text style={[styles.heading, { color: colors.text }]}>Legal documents</Text><Text style={[styles.description, { color: colors.textSecondary }]}>Upload title records and supporting documents</Text></View><Text style={[styles.fileCount, { backgroundColor: colors.surfaceContainer, color: colors.text }]}>{documents.length} {documents.length === 1 ? 'file' : 'files'}</Text></View>
    <Text style={[styles.supported, { color: colors.textSecondary }]}>Choose a document category</Text>
    <View style={styles.categoryWrap} accessibilityLabel="Legal document category">
      {DOCUMENT_CATEGORIES.map((category) => {
        const selected = category.value === selectedCategory;
        return <Pressable key={category.value} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${category.label} document category`} onPress={() => onCategoryChange?.(category.value)} style={[styles.categoryChip, { backgroundColor: selected ? colors.accentContainer : colors.surfaceLow }]} testID={`legal-document-category-${category.value}`}>
          <Text style={[styles.categoryText, { color: selected ? colors.onAccentContainer : colors.textSecondary }]}>{category.label}</Text>
        </Pressable>;
      })}
    </View>
    <View style={styles.actions}>
      <ActionButton label={isUploading ? 'Uploading and checking…' : 'Choose file'} icon="upload_file" onPress={() => onChooseDocument(selectedCategory)} disabled={isUploading || isLoading} />
      <ActionButton label="Scan document" icon="document_scanner" onPress={onScanDocument} disabled={isUploading || isLoading} />
    </View>
    <Text style={[styles.supported, { color: colors.textSecondary }]}>PDF, JPG, PNG, or WebP · up to 25 MB</Text>
    <Text style={[styles.supported, { color: colors.textSecondary }]}>Upload checks confirm the file is stored and matches its type. Legal ownership and validity still need review.</Text>
    {error ? <View style={[styles.empty, { backgroundColor: colors.warningContainer }]}><Text accessibilityRole="alert" style={[styles.description, { color: colors.warningText, flex: 1 }]}>{error}</Text>{onRetry ? <Pressable accessibilityRole="button" onPress={onRetry}><Text style={[styles.description, { color: colors.accent }]}>Retry</Text></Pressable> : null}</View> : isLoading ? <View style={[styles.empty, { backgroundColor: colors.surfaceLow }]}><Text style={[styles.description, { color: colors.textSecondary }]}>Loading documents…</Text></View> : documents.length ? <View style={styles.documents}>{documents.map((document) => {
      const isClear = document.state === 'clear';
      const state = isClear ? 'verified' : document.state;
      const statusTone: StatusTone = isClear ? 'success' : document.state === 'verified' ? 'success' : document.state === 'error' ? 'warning' : document.state === 'verifying' ? 'info' : 'neutral';
      const statusLabel = isClear ? 'Clear' : document.state === 'error' ? 'Needs review' : document.state === 'verifying' ? 'Checking upload' : document.state === 'pending' ? 'Review pending' : 'Upload checked';
      return <DocumentFileRow key={document.id} id={document.id} name={document.name} sizeLabel={document.sizeLabel} detail={document.detail} state={state as DocumentVerificationState} statusLabel={statusLabel} statusTone={statusTone} onPress={onOpenDocument ? () => onOpenDocument(document) : undefined} onMoreActions={onDocumentActions ? () => onDocumentActions(document) : undefined} testID={`legal-document-${document.id}`} />;
    })}</View> : <View style={[styles.empty, { backgroundColor: colors.surfaceLow }]}><AppIcon name="lock" size={19} color={colors.iconMuted} /><Text style={[styles.description, { color: colors.textSecondary }]}>No legal documents added yet. These files stay private to your workspace.</Text></View>}
  </View>;
}

function ActionButton({ label, icon, onPress, disabled = false }: { label: string; icon: 'upload_file' | 'document_scanner'; onPress: () => void; disabled?: boolean }) {
  const colors = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.actionButton, { backgroundColor: colors.surface }, disabled && styles.disabled]}><View style={[styles.actionIcon, { backgroundColor: colors.surfaceContainer }]}><AppIcon name={icon} size={17} color={colors.accent} /></View><Text style={[styles.actionText, { color: colors.text }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, headingCopy: { flex: 1, minWidth: 0, gap: Spacing.half }, heading: { ...Typography.title }, description: { ...Typography.bodySmall }, fileCount: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, ...Typography.labelSmall },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one }, categoryChip: { minHeight: 34, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, justifyContent: 'center' }, categoryText: { ...Typography.labelSmall }, actions: { flexDirection: 'row', gap: Spacing.two }, actionButton: { flex: 1, minHeight: 48, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one, paddingHorizontal: Spacing.one }, disabled: { opacity: 0.55 }, actionIcon: { width: 26, height: 26, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' }, actionText: { ...Typography.labelSmall, flexShrink: 1 }, supported: { ...Typography.labelSmall, textAlign: 'center' }, documents: { gap: Spacing.two }, empty: { minHeight: 80, borderRadius: Radius.medium, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
