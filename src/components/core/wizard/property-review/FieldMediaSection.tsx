import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/i18n/LocalizedText';

import { VoiceMemoCard } from '@/components/core/media/VoiceMemoCard';
import { AppIcon } from '@/components/core/icons';
import { Radius, Spacing, Typography } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';
import type { ReviewPhoto, ReviewVoiceMemo } from './types';

export function FieldMediaSection({ photos, photoLimit, photosLoading = false, photosBusy = false, photosError, onRetryPhotos, onChoosePhoto, onCapturePhoto, onRemovePhoto, voiceMemos, voiceMemoRecording = false, voiceMemoUploading = false, voiceMemoElapsedSeconds = 0, voiceMemoError, onRecordVoiceMemo, onStopVoiceMemo, onPlayPauseVoiceMemo, onDeleteVoiceMemo }: {
  photos: ReviewPhoto[]; photoLimit: number; photosLoading?: boolean; photosBusy?: boolean; photosError?: string; onRetryPhotos?: () => void; onChoosePhoto: () => void; onCapturePhoto: () => void; onRemovePhoto: (photo: ReviewPhoto) => void;
  voiceMemos: ReviewVoiceMemo[]; voiceMemoRecording?: boolean; voiceMemoUploading?: boolean; voiceMemoElapsedSeconds?: number; voiceMemoError?: string; onRecordVoiceMemo?: () => void; onStopVoiceMemo?: () => void; onPlayPauseVoiceMemo?: (id: string) => void; onDeleteVoiceMemo?: (id: string) => void;
}) {
  const colors = useTheme();
  const canAddPhoto = photos.length < photoLimit && !photosLoading && !photosError && !photosBusy;
  return <View style={styles.section} testID="review-field-media">
    <View style={styles.sectionHeader}><View style={styles.heading}><AppIcon name="photo_camera" size={20} color={colors.accent} /><Text style={[styles.title, { color: colors.text }]}>Field Media & Audio Notes</Text></View><Text style={[styles.counter, { color: colors.textSecondary, backgroundColor: colors.surfaceContainer }]}>{photos.length} / {photoLimit} Photos</Text></View>
    {!photos.length && photosLoading ? <View style={[styles.emptyGallery, { backgroundColor: colors.surfaceLow }]}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading property photos…</Text></View> : null}
    {!photos.length && photosError ? <View style={[styles.emptyGallery, { backgroundColor: colors.warningContainer }]}><Text accessibilityRole="alert" style={[styles.emptyText, { color: colors.warningText, flex: 1 }]}>{photosError}</Text>{onRetryPhotos ? <Pressable accessibilityRole="button" onPress={onRetryPhotos}><Text style={[styles.actionText, { color: colors.accent }]}>Retry</Text></Pressable> : null}</View> : null}
    {photos.length ? <View style={styles.gallery}>{photos.map((photo) => <View key={photo.id} style={[styles.photo, { backgroundColor: colors.surfaceLow }]} testID={`review-photo-${photo.id}`}>
      <ReviewPhotoPreview photo={photo} />
      {photo.isCover ? <View style={[styles.cover, { backgroundColor: colors.imageScrim }]}><Text style={[styles.coverText, { color: colors.onScrim }]}>Cover</Text></View> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${photo.label ?? photo.id}`} accessibilityState={{ disabled: photosBusy }} disabled={photosBusy} onPress={() => onRemovePhoto(photo)} style={[styles.remove, { backgroundColor: colors.surface }, photosBusy && styles.disabled]}><AppIcon name="close" size={13} color={colors.text} /></Pressable>
    </View>)}</View> : null}
    {!photos.length && !photosLoading && !photosError ? <View style={[styles.emptyGallery, { backgroundColor: colors.surfaceLow }]}><AppIcon name="photo_camera" size={22} color={colors.iconMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No property photos added yet.</Text></View> : null}
    {photos.length > 0 && photosError ? <View style={[styles.emptyGallery, { minHeight: 48, justifyContent: 'space-between', backgroundColor: colors.warningContainer }]}><Text accessibilityRole="alert" style={[styles.emptyText, { color: colors.warningText, flex: 1 }]}>{photosError}</Text>{onRetryPhotos ? <Pressable accessibilityRole="button" onPress={onRetryPhotos}><Text style={[styles.actionText, { color: colors.accent }]}>Retry</Text></Pressable> : null}</View> : null}
    <View style={styles.actions}>
      <MediaButton title="Choose photos" icon="add" onPress={onChoosePhoto} disabled={!canAddPhoto} />
      <MediaButton title="Camera capture" icon="photo_camera" onPress={onCapturePhoto} disabled={!canAddPhoto} />
    </View>
    <View style={[styles.voicePanel, { backgroundColor: colors.surface }]}>
      <View style={styles.voiceHeading}><View style={[styles.voiceIcon, { backgroundColor: colors.accentContainer }]}><AppIcon name="mic" size={16} color={colors.accent} /></View><Text style={[styles.voiceTitle, { color: colors.text }]}>Field Voice Logs</Text><Text style={[styles.counter, { color: colors.textSecondary }]}>{Math.min(voiceMemos.length + Number(voiceMemoUploading), 5)} / 5 clips</Text></View>
      {voiceMemos.map((memo) => <VoiceMemoCard key={memo.id} state={memo.state} title={memo.title ?? 'Field voice log'} durationSeconds={memo.durationSeconds} onPlayPause={() => onPlayPauseVoiceMemo?.(memo.id)} onDelete={() => onDeleteVoiceMemo?.(memo.id)} />)}
      {voiceMemoRecording ? <VoiceMemoCard state="recording" title="Recording field voice log" elapsedSeconds={voiceMemoElapsedSeconds} onStop={onStopVoiceMemo} /> : null}
      {voiceMemoUploading ? <VoiceMemoCard state="uploading" title="Saving field voice log" /> : null}
      {!voiceMemos.length && !voiceMemoRecording && !voiceMemoUploading ? <VoiceMemoCard state="idle" title="Record a field voice log" onRecord={onRecordVoiceMemo} /> : null}
      {voiceMemos.length > 0 && voiceMemos.length < 5 && !voiceMemoRecording && !voiceMemoUploading ? <Pressable accessibilityRole="button" accessibilityLabel="Record a field voice log" onPress={onRecordVoiceMemo} style={[styles.recordButton, { backgroundColor: colors.surfaceContainer }]}><AppIcon name="mic" size={16} color={colors.text} /><Text style={[styles.actionText, { color: colors.text }]}>Record another log</Text></Pressable> : null}
      {voiceMemoError ? <Text accessibilityRole="alert" style={[styles.emptyText, { color: colors.dangerText }]}>{voiceMemoError}</Text> : null}
    </View>
  </View>;
}

function ReviewPhotoPreview({ photo }: { photo: ReviewPhoto }) {
  const colors = useTheme();
  const [failed, setFailed] = useState(false);

  if (!photo.uri || failed) {
    return <View accessibilityRole="image" accessibilityLabel={failed ? 'Property photo preview unavailable' : photo.label ?? 'Property photo'} style={styles.photoPlaceholder}>
      <AppIcon name="photo_camera" size={22} color={colors.iconMuted} />
      <Text style={[styles.photoLabel, { color: colors.textSecondary }]} numberOfLines={2}>{failed ? 'Preview unavailable' : photo.label ?? 'Property photo'}</Text>
    </View>;
  }

  return <Image
    accessibilityRole="image"
    accessibilityLabel={photo.label ?? 'Property photo'}
    onError={() => setFailed(true)}
    resizeMode="cover"
    source={{ uri: photo.uri }}
    style={styles.previewImage}
  />;
}

function MediaButton({ title, icon, onPress, disabled }: { title: string; icon: 'add' | 'photo_camera'; onPress: () => void; disabled: boolean }) {
  const colors = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.actionButton, { backgroundColor: colors.surface }, disabled && styles.disabled]}><AppIcon name={icon} size={18} color={colors.accent} /><Text style={[styles.actionText, { color: colors.text }]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two }, sectionHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }, heading: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, title: { ...Typography.title, flexShrink: 1 }, counter: { ...Typography.labelSmall, borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, photo: { flexBasis: '30%', flexGrow: 1, minWidth: 82, aspectRatio: 1, borderRadius: Radius.medium, overflow: 'hidden', position: 'relative' }, previewImage: { width: '100%', height: '100%' }, photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.one, padding: Spacing.two }, photoLabel: { ...Typography.labelSmall, textAlign: 'center' }, cover: { position: 'absolute', left: Spacing.one, bottom: Spacing.one, borderRadius: Radius.small, paddingHorizontal: Spacing.one, paddingVertical: Spacing.half }, coverText: { ...Typography.labelSmall }, remove: { position: 'absolute', top: Spacing.one, right: Spacing.one, width: 26, height: 26, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, emptyGallery: { minHeight: 94, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.three }, emptyText: { ...Typography.bodySmall }, actions: { flexDirection: 'row', gap: Spacing.two }, actionButton: { flex: 1, minWidth: 0, minHeight: 44, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one, paddingHorizontal: Spacing.one }, actionText: { ...Typography.labelSmall }, disabled: { opacity: 0.5 }, voicePanel: { padding: Spacing.three, borderRadius: Radius.medium, gap: Spacing.two }, voiceHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one }, voiceIcon: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, voiceTitle: { flex: 1, ...Typography.label }, recordButton: { minHeight: 40, borderRadius: Radius.small, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
});
