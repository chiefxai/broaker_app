import { fireEvent } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { ActionCalloutCard, SyncStatusCard } from '@/components/core';
import { renderWithProviders } from '../utils/render';

describe('ActionCalloutCard', () => {
  it('renders its message and invokes only the supplied action', async () => {
    const onAction = jest.fn();
    const { getByText, getByRole } = await renderWithProviders(
      <ActionCalloutCard
        title="Share with confidence"
        description="Choose what buyers can see."
        icon="verified_user"
        actionLabel="Manage share links"
        note={{ icon: 'lock', text: 'Private notes stay private.' }}
        onAction={onAction}
      />,
    );

    expect(getByText('Share with confidence')).toBeTruthy();
    expect(getByText('Private notes stay private.')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Manage share links' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('SyncStatusCard', () => {
  it('renders the caller-provided synchronization state', async () => {
    const { getByText, getByLabelText } = await renderWithProviders(
      <SyncStatusCard title="Workspace synced" detail="All listing assets up to date" state="synced" />,
    );

    expect(getByText('Workspace synced')).toBeTruthy();
    expect(getByText('All listing assets up to date')).toBeTruthy();
    expect(getByLabelText('Synced')).toBeTruthy();
  });
});
