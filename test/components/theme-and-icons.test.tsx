import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { AppIcon, ThemeToggle } from '@/components/core';
import { renderWithProviders } from '../utils/render';

describe('theme and icons', () => {
  it('persists the selected color scheme', async () => {
    const { getByLabelText } = await renderWithProviders(<ThemeToggle />);
    const toggle = getByLabelText('Dark mode');

    await waitFor(() => expect(toggle.props.accessibilityState?.disabled).toBe(false));
    await fireEvent.press(toggle);

    await waitFor(async () => {
      expect(toggle.props.accessibilityState?.checked).toBe(true);
      await expect(AsyncStorage.getItem('@broaker/theme-mode/v1')).resolves.toBe('dark');
    });
  });

  it('renders a named icon accessibly', async () => {
    const { getByLabelText } = await renderWithProviders(
      <AppIcon name="verified" accessibilityLabel="Verified listing" />,
    );

    expect(getByLabelText('Verified listing')).toBeTruthy();
  });
});
