import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent } from '@testing-library/react-native';
import { Dimensions, Platform, StyleSheet } from 'react-native';

import { AppFooter } from '@/components/core';
import { renderWithProviders } from '../utils/render';

const mockNavigate = jest.fn();
let mockPath = '/explore';
const initialWindow = Dimensions.get('window');
const initialScreen = Dimensions.get('screen');

async function setWindowSize(width: number, height: number) {
  const metrics = { width, height, scale: 1, fontScale: 1 };
  await act(async () => { Dimensions.set({ window: metrics, screen: metrics }); });
}

jest.mock('expo-router', () => ({
  usePathname: () => mockPath,
  useRouter: () => ({ navigate: mockNavigate }),
}));

describe('AppFooter', () => {
  afterEach(async () => {
    await act(async () => { Dimensions.set({ window: initialWindow, screen: initialScreen }); });
  });

  it('exposes all destinations and routes to the selected destination', async () => {
    mockNavigate.mockClear();
    mockPath = '/explore';
    const { getByRole, getByTestId } = await renderWithProviders(<AppFooter />);
    if (Platform.OS === 'ios') expect(StyleSheet.flatten(getByTestId('footer-bar').props.style).borderRadius).toBe(999);
    const propertiesTab = getByRole('tab', { name: 'Properties' });
    expect(propertiesTab.props.accessibilityState.selected).toBe(true);
    expect(StyleSheet.flatten(propertiesTab.props.style).width).toBe('25%');
    await fireEvent.press(propertiesTab);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(getByRole('tab', { name: 'Shared Links' })).toHaveTextContent('Shared Links');
    await fireEvent.press(getByRole('tab', { name: 'Shared Links' }));
    expect(mockNavigate).toHaveBeenCalledWith('/shared-links');
    expect(getByRole('tab', { name: 'Settings' })).toBeTruthy();
  });

  it('returns to the property list when a property detail is open', async () => {
    mockNavigate.mockClear();
    mockPath = '/properties/123';
    const { getByRole } = await renderWithProviders(<AppFooter />);
    await fireEvent.press(getByRole('tab', { name: 'Properties' }));
    expect(mockNavigate).toHaveBeenCalledWith('/explore');
  });

  it('becomes a labeled vertical sidebar on wide screens', async () => {
    await setWindowSize(1280, 900);
    mockNavigate.mockClear();
    mockPath = '/';
    const { getByRole, getByText, getByTestId } = await renderWithProviders(<AppFooter />);

    expect(getByText('Broaker')).toBeTruthy();
    expect(getByTestId('footer-bar').props.accessibilityRole).toBe('navigation');
    expect(StyleSheet.flatten(getByTestId('footer-bar').props.style).flexDirection).toBe('column');
    expect(getByRole('link', { name: 'Home' }).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(getByRole('link', { name: 'Shared Links' }));
    expect(mockNavigate).toHaveBeenCalledWith('/shared-links');
  });
});
