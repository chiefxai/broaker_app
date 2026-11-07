import type { AppIconName } from '@/components/core/icons';
import type { ApiShareDisclosures } from '@/api/backend-api';
import type { VoiceMemoState } from '@/components/core/media/VoiceMemoCard';
import type { PropertyMapPreviewProps } from '../../maps/PropertyMapPreview';

export interface ReviewPhoto {
  id: string;
  uri?: string;
  label?: string;
  isCover?: boolean;
}

export interface ReviewItem {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tags?: string[];
  icon: AppIconName;
  editStep: number;
}

export interface ReviewVoiceMemo {
  id: string;
  state: VoiceMemoState;
  title?: string;
  durationSeconds?: number;
}

export type PropertyLocationPreview = Pick<PropertyMapPreviewProps, 'latitude' | 'longitude' | 'address'>;

export interface PropertyReviewPublishStepProps {
  locationPreview?: PropertyLocationPreview;
  photos: ReviewPhoto[];
  photoLimit?: number;
  photosLoading?: boolean;
  photosBusy?: boolean;
  photosError?: string;
  onRetryPhotos?: () => void;
  onChoosePhoto: () => void;
  onCapturePhoto: () => void;
  onRemovePhoto: (photo: ReviewPhoto) => void;
  voiceMemos: ReviewVoiceMemo[];
  voiceMemoRecording?: boolean;
  voiceMemoUploading?: boolean;
  voiceMemoElapsedSeconds?: number;
  voiceMemoError?: string;
  onRecordVoiceMemo?: () => void;
  onStopVoiceMemo?: () => void;
  onPlayPauseVoiceMemo?: (id: string) => void;
  onDeleteVoiceMemo?: (id: string) => void;
  reviewItems: ReviewItem[];
  onEditStep: (step: number) => void;
  publicPreviewEnabled: boolean;
  onPublicPreviewChange: (enabled: boolean) => void;
  disclosures: ApiShareDisclosures;
  onDisclosureChange: (key: keyof ApiShareDisclosures, value: boolean) => void;
  shareUrl?: string | null;
  shareLinkStatus?: 'idle' | 'saving' | 'error';
  shareLinkMessage?: string;
  canCreateShareLink?: boolean;
  onCreateShareLink?: () => void;
  onCopyShareLink?: () => void;
  onRetryShareLinks?: () => void;
}
