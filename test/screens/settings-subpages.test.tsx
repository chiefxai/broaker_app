import { fireEvent, waitFor } from '@testing-library/react-native';
import BusinessProfileScreen from '@/screens/settings/business-profile-screen';
import PropertySetupScreen from '@/screens/settings/property-setup-screen';
import SharingDefaultsScreen from '@/screens/settings/sharing-defaults-screen';
import SecurityScreen from '@/screens/settings/security-screen';
import { AppLockProvider } from '@/providers/app-lock-provider';
import { renderWithProviders } from '../utils/render';

let mockStoredPin: string | null = null;
let mockBiometricPreference: string | null = null;
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => key.includes('biometric') ? mockBiometricPreference : mockStoredPin),
  setItemAsync: jest.fn(async (key: string, value: string) => { if (key.includes('biometric')) mockBiometricPreference = value; else mockStoredPin = value; }),
  deleteItemAsync: jest.fn(async (key: string) => { if (key.includes('biometric')) mockBiometricPreference = null; else mockStoredPin = null; }),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));
jest.mock('expo-local-authentication', () => ({ hasHardwareAsync: jest.fn(async () => true), isEnrolledAsync: jest.fn(async () => true), authenticateAsync: jest.fn(async () => ({ success: true })) }));

describe('Settings detail screens', () => {
  beforeEach(() => { mockStoredPin = null; mockBiometricPreference = null; });

  it('validates and saves the mock business profile', async () => {
    const { findByLabelText, getByRole, findByTestId, findByText, queryByRole } = await renderWithProviders(<BusinessProfileScreen />);
    expect(await findByText('LISTING PREVIEW')).toBeTruthy();
    expect(await findByText('Vance Real Estate')).toBeTruthy();
    expect(queryByRole('button', { name: 'Discard changes' })).toBeNull();
    const businessName = await findByLabelText('Business name');
    await fireEvent.changeText(businessName, 'Updated Realty');
    expect(await findByText('Updated Realty')).toBeTruthy();
    expect(getByRole('button', { name: 'Discard changes' })).toBeTruthy();
    const email = await findByLabelText('Public email');
    await fireEvent.changeText(email, 'not-an-email');
    await fireEvent.press(getByRole('button', { name: 'Save profile' }));
    expect(await findByTestId('toast')).toBeTruthy();
    await fireEvent.changeText(email, 'hello@example.test');
    await fireEvent.press(getByRole('button', { name: 'Save profile' }));
    expect(await findByTestId('toast')).toBeTruthy();
  });

  it('prevents disabling every property category and allows discarding changes', async () => {
    const { findByRole, findByTestId, getByRole } = await renderWithProviders(<PropertySetupScreen />);
    for (const label of ['Agriculture Land', 'Plots', 'House / Villa', 'Commercial Building', 'Apartment']) {
      const toggle = await findByRole('switch', { name: label });
      await fireEvent(toggle, 'valueChange', false);
    }
    await fireEvent.press(getByRole('button', { name: 'Save property settings' }));
    expect(await findByTestId('toast')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Discard changes' }));
    expect(await findByTestId('toast')).toBeTruthy();
    expect((await findByRole('switch', { name: 'Agriculture Land' })).props.value).toBe(true);
  });

  it('updates sharing disclosure preview and confirms save', async () => {
    const { findByRole, findByText, findByTestId, getByRole } = await renderWithProviders(<SharingDefaultsScreen />);
    expect((await findByRole('button', { name: 'No expiration' })).props.accessibilityState.selected).toBe(true);
    const price = await findByRole('switch', { name: 'Price' });
    await fireEvent(price, 'valueChange', true);
    expect(await findByText(/will show price/)).toBeTruthy();
    expect(await findByRole('switch', { name: 'Property name' })).toBeTruthy();
    expect(await findByRole('switch', { name: 'Documents' })).toBeTruthy();
    const brokerContact = await findByRole('switch', { name: 'Broker contact details' });
    await fireEvent(brokerContact, 'valueChange', true);
    expect(await findByText(/show your public business contact details/)).toBeTruthy();
    await fireEvent.press(await findByRole('button', { name: 'Save sharing defaults' }));
    expect(await findByTestId('toast')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: '7 days' }));
    expect(getByRole('button', { name: '7 days' }).props.accessibilityState.selected).toBe(true);
    expect(await findByText(/Links expire after 7 days/)).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Save sharing defaults' }));
    expect(await findByTestId('toast')).toBeTruthy();
  });

  it('creates a secure device PIN from the security page', async () => {
    const { findByRole, findByLabelText, getByLabelText, getByRole, findByTestId } = await renderWithProviders(<AppLockProvider><SecurityScreen /></AppLockProvider>);
    const switchControl = await findByRole('switch', { name: 'Require PIN on app launch' });
    await fireEvent(switchControl, 'valueChange', true);
    await fireEvent.changeText(getByLabelText('New PIN entry'), '2946');
    await fireEvent.changeText(getByLabelText('Confirm new PIN entry'), '2946');
    await fireEvent.press(getByRole('button', { name: 'Save PIN' }));
    await waitFor(() => expect(mockStoredPin).toBe('2946'));
    const biometricSwitch = await findByRole('switch', { name: 'Biometric unlock' });
    await fireEvent(biometricSwitch, 'valueChange', true);
    await waitFor(() => expect(mockBiometricPreference).toBe('true'));
    expect((await findByRole('switch', { name: 'Biometric unlock' })).props.value).toBe(true);
    expect(await findByTestId('toast')).toBeTruthy();
  });
});
