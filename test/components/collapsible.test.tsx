import { fireEvent } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';
import { Text } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { renderWithProviders } from '../utils/render';

describe('Collapsible', () => {
  it('toggles its child content when the heading is pressed', async () => {
    const { getByText, queryByText } = await renderWithProviders(
      <Collapsible title="More details">
        <Text>Expanded content</Text>
      </Collapsible>,
    );

    expect(queryByText('Expanded content')).toBeNull();

    await fireEvent.press(getByText('More details'));
    expect(getByText('Expanded content')).toBeTruthy();

    await fireEvent.press(getByText('More details'));
    expect(queryByText('Expanded content')).toBeNull();
  });
});
