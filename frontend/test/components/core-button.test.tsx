import { fireEvent } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { CoreButton } from '@/components/core';
import { renderWithProviders } from '../utils/render';

describe('CoreButton', () => {
  it('runs the supplied action and exposes a button label', async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithProviders(
      <CoreButton label="Add property" leadingIcon="add" onPress={onPress} />,
    );

    await fireEvent.press(getByRole('button', { name: 'Add property' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate action while loading', async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderWithProviders(
      <CoreButton label="Saving" loading onPress={onPress} />,
    );
    const button = getByRole('button', { name: 'Saving' });

    expect(button.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
