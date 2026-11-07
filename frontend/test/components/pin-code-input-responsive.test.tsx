import { describe, expect, it } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';

import { PinCodeInput } from '@/components/core';
import { renderWithProviders } from '../utils/render';

describe('PinCodeInput responsive layout', () => {
  it('wraps higher digit counts and keeps numeric input bounded', async () => {
    const onChangeText = jest.fn();
    const { getByRole, getByLabelText } = await renderWithProviders(
      <PinCodeInput length={8} value="" onChangeText={onChangeText} />,
    );

    const digitRow = getByRole('button', { name: 'Security PIN, 0 of 8 digits entered' });
    expect(digitRow.props.style).toEqual(expect.objectContaining({ flexWrap: 'wrap', width: '100%' }));
    fireEvent.changeText(getByLabelText('Security PIN entry'), '12ab3456789');
    expect(onChangeText).toHaveBeenCalledWith('12345678');
  });
});
