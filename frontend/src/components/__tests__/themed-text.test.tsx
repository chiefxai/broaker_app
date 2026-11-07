import { render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { ThemedText } from '@/components/themed-text';

jest.mock('@/theme/tokens', () => ({ Fonts: { mono: 'monospace' } }));
jest.mock('@/theme/theme-provider', () => ({ useTheme: () => ({ text: '#111111' }) }));

describe('ThemedText', () => {
  it('renders text through the native Text component', async () => {
    const { getByText } = await render(<ThemedText>Platform-native text</ThemedText>);

    expect(getByText('Platform-native text')).toBeTruthy();
  });
});
