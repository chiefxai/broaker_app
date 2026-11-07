import { describe, expect, it } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react-native';

import SettingsScreen from '@/screens/settings-screen';
import { SettingsRow } from '@/components/core/settings/SettingsRow';
import { AppLockProvider } from '@/providers/app-lock-provider';
import { renderWithProviders } from '../utils/render';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args), back: jest.fn() } }));
let mockStoredPin: string | null = null;
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => mockStoredPin),
  setItemAsync: jest.fn(async (_key: string, value: string) => { mockStoredPin = value; }),
  deleteItemAsync: jest.fn(async () => { mockStoredPin = null; }),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));
jest.mock('@expo/ui', () => {
  const { View } = require('react-native');
  return {
    BottomSheet: ({ isPresented, children }: { isPresented: boolean; children: React.ReactNode }) => isPresented ? <View>{children}</View> : null,
    RNHostView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});
jest.mock('@expo/ui/community/bottom-sheet', () => {
  const mock = jest.requireActual<typeof import('../utils/mock-community-bottom-sheet')>('../utils/mock-community-bottom-sheet');
  return { __esModule: true, default: mock.default };
});

async function renderSettings() {
  return renderWithProviders(<AppLockProvider><SettingsScreen /></AppLockProvider>);
}

describe('SettingsScreen', () => {
  beforeEach(() => { mockStoredPin = null; mockPush.mockClear(); });
  it('shows mock profile data and navigates to editable business settings without the profile callout', async () => {
    const { findByText, getByRole, queryByText, queryByRole } = await renderSettings();

    expect(await findByText('My Property Workspace')).toBeTruthy();
    expect(await findByText('18')).toBeTruthy();
    expect(await findByText('12')).toBeTruthy();
    expect(queryByText('Keep your profile up to date')).toBeNull();
    expect(queryByText('Edit Business Profile')).toBeNull();
    expect(getByRole('button', { name: 'Share business profile' })).toBeTruthy();
    expect(queryByRole('button', { name: 'Log out' })).toBeNull();

    fireEvent.press(getByRole('button', { name: 'Business profile' }));
    expect(mockPush).toHaveBeenCalledWith('/settings/business-profile');
  });

  it('changes and persists the app language and updates shared navigation labels', async () => {
    const { findByText, getByRole } = await renderSettings();
    await fireEvent.press(getByRole('button', { name: 'Language' }));
    await fireEvent.press(getByRole('button', { name: 'தமிழ்' }));
    expect(await findByText('அமைப்புகள்')).toBeTruthy();
    expect(await findByText('மொழி')).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem('@broaker/language/v1')).toBe('ta'));
  });

  it.each([
    ['తెలుగు', 'te', 'సెట్టింగ్‌లు'],
    ['മലയാളം', 'ml', 'ക്രമീകരണങ്ങൾ'],
  ] as const)('selects and persists %s', async (languageLabel, languageCode, translatedSettings) => {
    const { findByText, getByRole } = await renderSettings();
    await fireEvent.press(getByRole('button', { name: 'Language' }));
    await fireEvent.press(getByRole('button', { name: languageLabel }));
    expect(await findByText(translatedSettings)).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem('@broaker/language/v1')).toBe(languageCode));
  });

  it('toggles the theme from the settings row', async () => {
    const { findByRole } = await renderSettings();
    const appearanceSwitch = await findByRole('switch', { name: 'Dark Mode' });
    expect(appearanceSwitch.props.value).toBe(false);

    await fireEvent(appearanceSwitch, 'valueChange', true);

    await waitFor(() => expect(appearanceSwitch.props.value).toBe(true));
  });

  it('opens the security detail page for app lock controls', async () => {
    const { findByRole } = await renderSettings();
    await fireEvent.press(await findByRole('button', { name: 'Security & session PIN' }));
    expect(mockPush).toHaveBeenCalledWith('/settings/security');
  });

  it('renders the grouped settings rows and disclosure footer from the reference', async () => {
    const { findByText, getByRole, queryByText, queryByRole } = await renderSettings();
    expect(await findByText('Preferences & Setup')).toBeTruthy();
    expect(await findByText('Support')).toBeTruthy();
    expect(await findByText('Language')).toBeTruthy();
    expect(queryByText('Offline Documents')).toBeNull();
    expect(queryByText('Alert Channels')).toBeNull();
    expect(await findByText('Sign out of Broaker')).toBeTruthy();
    expect(getByRole('button', { name: 'Share business profile' })).toBeTruthy();
    expect(queryByText('Log out')).toBeNull();
    expect(queryByRole('button', { name: 'Log out' })).toBeNull();
  });

  it('does not render empty optional row text as an unwrapped native text node', async () => {
    const { toJSON } = await renderWithProviders(<SettingsRow title="Optional values" icon="settings" description="" valueLabel="" />);
    const tree = toJSON();
    expect(JSON.stringify(tree)).not.toContain('""');
  });
});
