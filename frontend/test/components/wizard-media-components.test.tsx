import { fireEvent } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { DocumentFileRow, VoiceMemoCard, WizardProgressHeader } from '@/components/core';
import { unverifiedDocument, verifiedDocument } from '../fixtures/wizard-components';
import { renderWithProviders } from '../utils/render';

describe('listing wizard and media components', () => {
  it('clamps wizard progress and invokes back and save actions', async () => {
    const onBack = jest.fn();
    const onSaveDraft = jest.fn();
    const { getByRole, getByText, getByLabelText } = await renderWithProviders(
      <WizardProgressHeader step={7} totalSteps={6} title="Photos, Review & Publish" statusLabel="100% ready" onBack={onBack} onSaveDraft={onSaveDraft} />,
    );

    expect(getByText('Step 6 of 6')).toBeTruthy();
    expect(getByLabelText('Listing progress, step 6 of 6').props.accessibilityValue.now).toBe(100);
    await fireEvent.press(getByRole('button', { name: 'Go back' }));
    await fireEvent.press(getByRole('button', { name: 'Save draft' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
  });

  it('handles voice memo record, playback, pause, and deletion actions', async () => {
    const onRecord = jest.fn();
    const idle = await renderWithProviders(<VoiceMemoCard state="idle" onRecord={onRecord} />);
    await fireEvent.press(idle.getByRole('button', { name: 'Start recording' }));
    expect(onRecord).toHaveBeenCalledTimes(1);
    await idle.unmount();

    const onPlayPause = jest.fn();
    const onDelete = jest.fn();
    const playing = await renderWithProviders(<VoiceMemoCard state="playing" durationSeconds={102} onPlayPause={onPlayPause} onDelete={onDelete} />);
    expect(playing.getByText('01:42')).toBeTruthy();
    await fireEvent.press(playing.getByRole('button', { name: 'Pause voice note' }));
    await fireEvent.press(playing.getByRole('button', { name: 'Delete voice note' }));
    expect(onPlayPause).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('shows verified documents and retries failed verification', async () => {
    const onRetry = jest.fn();
    const onPress = jest.fn();
    const { getByRole, getByText } = await renderWithProviders(
      <>
        <DocumentFileRow {...verifiedDocument} onPress={onPress} />
        <DocumentFileRow {...unverifiedDocument} onRetry={onRetry} />
      </>,
    );
    expect(getByText('Verified')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Mother Deed (1984).pdf' }));
    await fireEvent.press(getByRole('button', { name: 'Retry verification for Encumbrance Certificate.pdf' }));
    expect(onPress).toHaveBeenCalledWith('doc-mother-deed');
    expect(onRetry).toHaveBeenCalledWith('doc-encumbrance');
  });

  it('keeps document actions available alongside the row action', async () => {
    const onPress = jest.fn();
    const onRemove = jest.fn();
    const onMoreActions = jest.fn();
    const { getByRole } = await renderWithProviders(
      <DocumentFileRow {...verifiedDocument} onPress={onPress} onRemove={onRemove} onMoreActions={onMoreActions} />,
    );

    await fireEvent.press(getByRole('button', { name: verifiedDocument.name }));
    await fireEvent.press(getByRole('button', { name: `Remove ${verifiedDocument.name}` }));
    await fireEvent.press(getByRole('button', { name: `More actions for ${verifiedDocument.name}` }));

    expect(onPress).toHaveBeenCalledWith(verifiedDocument.id);
    expect(onRemove).toHaveBeenCalledWith(verifiedDocument.id);
    expect(onMoreActions).toHaveBeenCalledWith(verifiedDocument.id);
  });
});
