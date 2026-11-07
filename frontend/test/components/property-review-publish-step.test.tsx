import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';

import { PropertyReviewPublishStep, type PropertyReviewPublishStepProps } from '@/components/core/wizard/PropertyReviewPublishStep';
import { renderWithProviders } from '../utils/render';

function makeProps(overrides: Partial<PropertyReviewPublishStepProps> = {}): PropertyReviewPublishStepProps {
  return {
    photos: [{ id: 'photo-cover', label: 'Farm overview', isCover: true }],
    onChoosePhoto: jest.fn(), onCapturePhoto: jest.fn(), onRemovePhoto: jest.fn(),
    voiceMemos: [{ id: 'voice-1', state: 'ready', title: 'Canal water timing & yield', durationSeconds: 102 }],
    onRecordVoiceMemo: jest.fn(), onPlayPauseVoiceMemo: jest.fn(), onDeleteVoiceMemo: jest.fn(),
    reviewItems: [{ id: 'title', label: 'Property Title', value: 'Riverside Farm', icon: 'domain', editStep: 1 }],
    onEditStep: jest.fn(), publicPreviewEnabled: true, onPublicPreviewChange: jest.fn(),
    disclosures: { show_price: true, show_exact_coordinates: false, show_photos: true, show_reports: false, show_approach_roads: true },
    onDisclosureChange: jest.fn(), shareUrl: 'https://estateflow.test/p/demo', shareLinkStatus: 'idle',
    canCreateShareLink: true, onCreateShareLink: jest.fn(), onCopyShareLink: jest.fn(), ...overrides,
  };
}

describe('PropertyReviewPublishStep', () => {
  it('renders the review sections and reports progress and edit callbacks', async () => {
    const props = makeProps();
    const { getByTestId, getByText, getByRole } = await renderWithProviders(<PropertyReviewPublishStep {...props} />);
    expect(getByTestId('property-review-progress').props.accessibilityValue.now).toBe(100);
    expect(getByTestId('review-photo-photo-cover')).toBeTruthy();
    expect(getByText('Field Media & Audio Notes')).toBeTruthy();
    expect(getByText('Review Listing Details')).toBeTruthy();
    expect(getByText('Public Share Access')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Edit Property Title' }));
    await fireEvent.press(getByRole('button', { name: 'Update public share link' }));
    await fireEvent.press(getByRole('button', { name: 'Copy public share link' }));
    expect(props.onEditStep).toHaveBeenCalledWith(1);
    expect(props.onCreateShareLink).toHaveBeenCalled();
    expect(props.onCopyShareLink).toHaveBeenCalled();
  });

  it('previews the selected location and address on the review step', async () => {
    const props = makeProps({ locationPreview: { latitude: 8.7139, longitude: 77.7567, address: 'Vagaikulam, 627001, Ambasamudram, Tirunelveli, Tamil Nadu' } });
    const { getByTestId, getByText } = await renderWithProviders(<PropertyReviewPublishStep {...props} />);

    expect(getByText('Property Location Preview')).toBeTruthy();
    expect(getByTestId('property-review-location-preview')).toBeTruthy();
    expect(getByTestId('property-map-interaction-shell')).toBeTruthy();
    expect(getByText('Pin selected')).toBeTruthy();
    expect(getByText('Vagaikulam, 627001, Ambasamudram, Tirunelveli, Tamil Nadu')).toBeTruthy();
  });

  it('keeps confidential fields locked and lets the caller change public disclosures', async () => {
    const props = makeProps();
    const { getByLabelText, getByText } = await renderWithProviders(<PropertyReviewPublishStep {...props} />);
    expect(getByText('Patta copies & internal broker notes')).toBeTruthy();
    await fireEvent.press(getByLabelText('Exact GPS coordinates'));
    expect(props.onDisclosureChange).toHaveBeenCalledWith('show_exact_coordinates', true);
  });

  it('displays empty media states, audio errors, and disables photo actions at the limit', async () => {
    const props = makeProps({ photos: [], photoLimit: 0, voiceMemos: [], voiceMemoError: 'Microphone permission is required.' });
    const { getByText, getByRole } = await renderWithProviders(<PropertyReviewPublishStep {...props} />);
    expect(getByText('No property photos added yet.')).toBeTruthy();
    expect(getByText('Microphone permission is required.')).toBeTruthy();
    expect(getByText('Record a field voice log')).toBeTruthy();
    expect(getByRole('button', { name: 'Choose photos' }).props.accessibilityState.disabled).toBe(true);
  });

  it('wires recording, playback, and deletion actions to the caller', async () => {
    const props = makeProps({
      onStopVoiceMemo: jest.fn(),
      onRecordVoiceMemo: jest.fn(),
      onPlayPauseVoiceMemo: jest.fn(),
      onDeleteVoiceMemo: jest.fn(),
    });
    const { getByRole } = await renderWithProviders(<PropertyReviewPublishStep {...props} />);
    await fireEvent.press(getByRole('button', { name: 'Record a field voice log' }));
    expect(props.onRecordVoiceMemo).toHaveBeenCalled();
    await fireEvent.press(getByRole('button', { name: 'Play voice note' }));
    expect(props.onPlayPauseVoiceMemo).toHaveBeenCalledWith('voice-1');
    await fireEvent.press(getByRole('button', { name: 'Delete voice note' }));
    expect(props.onDeleteVoiceMemo).toHaveBeenCalledWith('voice-1');

    const recordingProps = makeProps({ voiceMemoRecording: true, onStopVoiceMemo: jest.fn() });
    const recordingView = await renderWithProviders(<PropertyReviewPublishStep {...recordingProps} />);
    await fireEvent.press(recordingView.getByRole('button', { name: 'Stop recording' }));
    expect(recordingProps.onStopVoiceMemo).toHaveBeenCalled();
  });

  it('keeps uploaded previews visible when refreshing storage URLs fails', async () => {
    const props = makeProps({
      photos: [{ id: 'just-uploaded', uri: 'file:///field.jpg', label: 'Field photo.jpg' }],
      photosError: 'Could not refresh stored photos.',
      onRetryPhotos: jest.fn(),
    });
    const { getByTestId, getByText, getAllByRole } = await renderWithProviders(<PropertyReviewPublishStep {...props} />);
    expect(getByTestId('review-photo-just-uploaded')).toBeTruthy();
    expect(getByText('Could not refresh stored photos.')).toBeTruthy();
    await fireEvent.press(getAllByRole('button', { name: 'Retry' })[0]);
    expect(props.onRetryPhotos).toHaveBeenCalled();
  });

  it('renders local image URIs in the native gallery and replaces broken images with a visible fallback', async () => {
    const props = makeProps({ photos: [{ id: 'local-photo', uri: 'file:///field.jpg', label: 'Selected field photo' }] });
    const { findByLabelText, findByText } = await renderWithProviders(<PropertyReviewPublishStep {...props} />);
    const image = await findByLabelText('Selected field photo');
    expect(image.props.source).toEqual({ uri: 'file:///field.jpg' });

    await fireEvent(image, 'error');
    expect(await findByText('Preview unavailable')).toBeTruthy();
  });

  it('shows retry actions after photo and share-link loading errors', async () => {
    const props = makeProps({ photos: [], photosError: 'Could not load photos.', onRetryPhotos: jest.fn(), shareLinkStatus: 'error', shareLinkMessage: 'Could not load share links.', onRetryShareLinks: jest.fn() });
    const { getByText, getAllByRole } = await renderWithProviders(<PropertyReviewPublishStep {...props} />);
    expect(getByText('Could not load photos.')).toBeTruthy();
    expect(getByText('Could not load share links.')).toBeTruthy();
    await fireEvent.press(getAllByRole('button', { name: 'Retry' })[0]);
    expect(props.onRetryPhotos).toHaveBeenCalled();
    await fireEvent.press(getAllByRole('button', { name: 'Retry' })[1]);
    expect(props.onRetryShareLinks).toHaveBeenCalled();
  });
});
