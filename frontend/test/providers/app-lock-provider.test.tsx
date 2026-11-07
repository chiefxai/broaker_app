import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Text, Pressable, View } from 'react-native';

import { AppLockProvider, useAppLock } from '@/providers/app-lock-provider';
import { renderWithProviders } from '../utils/render';

let mockStoredPin: string | null = null;
let mockBiometricPreference: string | null = null;
let mockReadError = false;
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => {
    if (mockReadError) throw new Error('Secure storage unavailable');
    return key.includes('biometric') ? mockBiometricPreference : mockStoredPin;
  }),
  setItemAsync: jest.fn(async (key: string, value: string) => { if (key.includes('biometric')) mockBiometricPreference = value; else mockStoredPin = value; }),
  deleteItemAsync: jest.fn(async (key: string) => { if (key.includes('biometric')) mockBiometricPreference = null; else mockStoredPin = null; }),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));
let mockAuthSuccess = true;
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: mockAuthSuccess })),
}));

function LockProbe() {
  const lock = useAppLock();
  return (
    <View>
      <Text>Configured: {String(lock.isEnabled)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Lock now" onPress={lock.lock}><Text>Lock</Text></Pressable>
    </View>
  );
}

describe('AppLockProvider', () => {
  beforeEach(() => {
    mockStoredPin = null;
    mockBiometricPreference = null;
    mockReadError = false;
    mockAuthSuccess = false;
  });

  it('unlocks with enrolled biometrics only after biometric unlock was enabled', async () => {
    mockStoredPin = '2580';
    mockBiometricPreference = 'true';
    mockAuthSuccess = true;
    const { findByText, queryByText } = await renderWithProviders(<AppLockProvider><LockProbe /></AppLockProvider>);
    expect(await findByText('Configured: true')).toBeTruthy();
    await waitFor(() => expect(queryByText('Broaker is locked')).toBeNull());
    expect((jest.requireMock('expo-local-authentication') as { authenticateAsync: jest.Mock }).authenticateAsync).toHaveBeenCalled();
  });

  it('locks on startup when a PIN is stored and unlocks only with the matching PIN', async () => {
    mockStoredPin = '2580';
    const { findByText, getByLabelText, getByRole, queryByText } = await renderWithProviders(
      <AppLockProvider><LockProbe /></AppLockProvider>,
    );

    expect(await findByText('Broaker is locked')).toBeTruthy();
    await fireEvent.changeText(getByLabelText('App lock PIN entry'), '1111');
    expect(await findByText('That PIN is incorrect. Try again.')).toBeTruthy();

    await fireEvent.changeText(getByLabelText('App lock PIN entry'), '2580');
    await waitFor(() => expect(queryByText('Broaker is locked')).toBeNull());
    expect(await findByText('Configured: true')).toBeTruthy();
    fireEvent.press(getByRole('button', { name: 'Lock now' }));
    expect(await findByText('Broaker is locked')).toBeTruthy();
  });

  it('fails closed and offers retry when secure storage cannot be read', async () => {
    mockReadError = true;
    const { findByText, getByRole } = await renderWithProviders(
      <AppLockProvider><LockProbe /></AppLockProvider>,
    );
    expect(await findByText('App lock unavailable')).toBeTruthy();
    expect(getByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});
