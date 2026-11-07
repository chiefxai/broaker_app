import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';

import { Toast } from '@/components/core/toast/Toast';
import { useToast } from '@/components/core/toast/ToastProvider';
import { CoreButton } from '@/components/core/CoreButton';
import { renderWithProviders } from '../utils/render';
import { toastCases } from '../fixtures/toasts';

describe('Toast', () => {
  it.each(toastCases)('renders $variant feedback with the correct accessibility role', async ({ message, variant, role }) => {
    const onDismiss = jest.fn();
    const { getByText, getByRole } = await renderWithProviders(<Toast message={message} variant={variant} onDismiss={onDismiss} />);
    expect(getByText(message)).toBeTruthy();
    expect(getByRole(role, { name: message })).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Dismiss notification' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('provides a shared context and exposes notifications above the screen content', async () => {
    function Trigger() {
      const { showToast } = useToast();
      return <CoreButton testID="show-toast" label="Show toast" onPress={() => showToast('Toast overlay', 'success', 0)} />;
    }
    const { getByTestId, getByText } = await renderWithProviders(<Trigger />);
    await fireEvent.press(getByTestId('show-toast'));
    expect(getByText('Toast overlay')).toBeTruthy();
    expect(getByTestId('toast')).toBeTruthy();
  });
});
