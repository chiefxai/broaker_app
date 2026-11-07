import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

import { GlassBackground } from '@/components/core/GlassBackground';
import { renderWithProviders } from '../utils/render';

jest.mock('expo-glass-effect', () => ({
  isLiquidGlassAvailable: jest.fn(),
  GlassView: (props: object) => {
    const { View } = require('react-native');
    return <View {...props} testID="native-glass" />;
  },
}));

describe('GlassBackground', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  it('renders native glass on supported iOS devices', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);
    const { getByTestId } = await renderWithProviders(<GlassBackground />);
    expect(getByTestId('native-glass').props.glassEffectStyle).toBe('regular');
  });

  it('uses the caller’s fallback when iOS glass is unavailable', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(false);
    const { queryByTestId } = await renderWithProviders(<GlassBackground />);
    expect(queryByTestId('native-glass')).toBeNull();
  });
});
