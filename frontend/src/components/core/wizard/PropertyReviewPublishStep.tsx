import { StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import { FieldMediaSection } from './property-review/FieldMediaSection';
import { ListingReviewSection } from './property-review/ListingReviewSection';
import { PublicShareAccessSection } from './property-review/PublicShareAccessSection';
import { PropertyMapPreview } from '../maps/registry';
import type { PropertyReviewPublishStepProps } from './property-review/types';

export type { PropertyLocationPreview, PropertyReviewPublishStepProps, ReviewItem, ReviewPhoto, ReviewVoiceMemo } from './property-review/types';

export function PropertyReviewPublishStep(props: PropertyReviewPublishStepProps) {
  const colors = useTheme();
  return <View style={styles.root} testID="property-review-publish-step">
    <View style={[styles.progress, { backgroundColor: colors.surfaceLow }]}>
      <View style={styles.progressHeader}><View style={styles.progressLabel}><View style={[styles.stepBadge, { backgroundColor: colors.primary }]}><Text style={[styles.stepNumber, { color: colors.onPrimary }]}>6</Text></View><Text style={[styles.progressText, { color: colors.text }]}>Step 6 of 6 · Photos, Review & Save</Text></View><Text style={[styles.percent, { color: colors.accent }]}>Review</Text></View>
      <View accessibilityRole="progressbar" accessibilityLabel="Property form progress, step 6 of 6" accessibilityValue={{ min: 0, max: 100, now: 100 }} testID="property-review-progress" style={[styles.track, { backgroundColor: colors.surfaceContainer }]}><View style={[styles.fill, { backgroundColor: colors.accent }]} /></View>
    </View>
    <FieldMediaSection photos={props.photos} photoLimit={props.photoLimit ?? 5} photosLoading={props.photosLoading} photosBusy={props.photosBusy} photosError={props.photosError} onRetryPhotos={props.onRetryPhotos} onChoosePhoto={props.onChoosePhoto} onCapturePhoto={props.onCapturePhoto} onRemovePhoto={props.onRemovePhoto} voiceMemos={props.voiceMemos} voiceMemoRecording={props.voiceMemoRecording} voiceMemoUploading={props.voiceMemoUploading} voiceMemoElapsedSeconds={props.voiceMemoElapsedSeconds} voiceMemoError={props.voiceMemoError} onRecordVoiceMemo={props.onRecordVoiceMemo} onStopVoiceMemo={props.onStopVoiceMemo} onPlayPauseVoiceMemo={props.onPlayPauseVoiceMemo} onDeleteVoiceMemo={props.onDeleteVoiceMemo} />
    <ListingReviewSection items={props.reviewItems} onEditStep={props.onEditStep} />
    {props.locationPreview ? <PropertyMapPreview {...props.locationPreview} /> : null}
    <PublicShareAccessSection enabled={props.publicPreviewEnabled} onEnabledChange={props.onPublicPreviewChange} disclosures={props.disclosures} onDisclosureChange={props.onDisclosureChange} shareUrl={props.shareUrl} shareLinkStatus={props.shareLinkStatus} shareLinkMessage={props.shareLinkMessage} canCreateShareLink={props.canCreateShareLink} onCreateShareLink={props.onCreateShareLink} onCopyShareLink={props.onCopyShareLink} onRetryShareLinks={props.onRetryShareLinks} />
  </View>;
}

const styles = StyleSheet.create({ root: { gap: Spacing.four }, progress: { padding: Spacing.three, borderRadius: Radius.medium, gap: Spacing.two }, progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, progressLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, stepBadge: { width: 26, height: 26, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, stepNumber: { ...Typography.labelSmall }, progressText: { ...Typography.label, flexShrink: 1 }, percent: { ...Typography.labelSmall }, track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' }, fill: { width: '100%', height: '100%' } });
