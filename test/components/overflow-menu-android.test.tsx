import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { OverflowMenu } from '@/components/core/navigation/OverflowMenu.android';
import { renderWithProviders } from '../utils/render';

jest.mock('@expo/ui/jetpack-compose', () => jest.requireActual('../utils/mock-compose-menu'));

describe('Android overflow menu', () => {
  it('opens the Material menu and runs the chosen action after closing', async () => {
    const action = jest.fn();
    const { getByRole, queryByRole } = await renderWithProviders(<OverflowMenu items={[{ id: 'delete', label: 'Delete link', icon: 'delete', tone: 'danger', onPress: action }]} />);
    await fireEvent.press(getByRole('button', { name: 'More options' }));
    await fireEvent.press(getByRole('button', { name: 'Delete link' }));
    expect(queryByRole('button', { name: 'Delete link' })).toBeNull();
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it('dismisses without invoking an action', async () => {
    const action = jest.fn();
    const { getByRole, queryByRole } = await renderWithProviders(<OverflowMenu items={[{ id: 'copy', label: 'Copy link', icon: 'content_copy', onPress: action }]} />);
    await fireEvent.press(getByRole('button', { name: 'More options' }));
    await fireEvent.press(getByRole('button', { name: 'Dismiss menu' }));
    expect(queryByRole('button', { name: 'Copy link' })).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });
});
