import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FloatingActionButton } from '@/components/core';
import { AppThemeProvider } from '@/theme/theme-provider';
import { LanguageProvider } from '@/i18n/language-provider';
import { renderWithProviders } from '../utils/render';

describe('FloatingActionButton', () => {
  it('exposes its action label and calls the supplied handler', async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithProviders(
      <FloatingActionButton accessibilityLabel="Add property" onPress={onPress} />,
    );

    await fireEvent.press(getByRole('button', { name: 'Add property' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('stays above the footer and bottom safe area', async () => {
    const { getByRole } = await render(
      <AppThemeProvider><LanguageProvider><SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, right: 0, bottom: 34, left: 0 } }}>
        <FloatingActionButton accessibilityLabel="Add property" onPress={() => undefined} />
      </SafeAreaProvider></LanguageProvider></AppThemeProvider>,
    );
    expect(StyleSheet.flatten(getByRole('button', { name: 'Add property' }).props.style).bottom).toBe(114 + (Platform.OS === 'ios' ? 4 : 0));
  });
});
