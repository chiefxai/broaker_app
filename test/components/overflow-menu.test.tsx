import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { OverflowMenu } from '@/components/core';
import { renderWithProviders } from '../utils/render';

jest.mock('@expo/ui/swift-ui', () => jest.requireActual('../utils/mock-swift-menu'));

describe('OverflowMenu', () => {
  it('opens accessibly, invokes a selected action, and closes', async () => {
    const onCopy = jest.fn();
    const { getByRole } = await renderWithProviders(
      <OverflowMenu items={[{ id: 'copy', label: 'Copy link', icon: 'content_copy', onPress: onCopy }]} />,
    );

    await fireEvent.press(getByRole('button', { name: 'More options' }));
    await waitFor(() => expect(getByRole('button', { name: 'More options' }).props.accessibilityState.expanded).toBe(true));
    await fireEvent.press(await waitFor(() => getByRole('button', { name: 'Copy link' })));
    await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getByRole('button', { name: 'More options' }).props.accessibilityState.expanded).toBe(false));
  });

  it('dismisses when the backdrop is pressed', async () => {
    const { getByRole } = await renderWithProviders(
      <OverflowMenu items={[{ id: 'edit', label: 'Edit', icon: 'edit', onPress: jest.fn() }]} />,
    );
    await fireEvent.press(getByRole('button', { name: 'More options' }));
    await waitFor(() => expect(getByRole('button', { name: 'More options' }).props.accessibilityState.expanded).toBe(true));
    await fireEvent.press(getByRole('button', { name: 'Dismiss menu' }));
    await waitFor(() => expect(getByRole('button', { name: 'More options' }).props.accessibilityState.expanded).toBe(false));
  });
});
