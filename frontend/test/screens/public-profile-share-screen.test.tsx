import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import type { ApiPublicProfileShare } from '@/api/backend-api';
import PublicProfileShareScreen from '@/screens/public-profile-share-screen';
import { renderWithProviders } from '../utils/render';

const mockGetPublicProfileShare = jest.fn<(token: string, passcode?: string) => Promise<ApiPublicProfileShare>>();
const mockRouterPush = jest.fn();
jest.mock('@/api/backend-api', () => ({ getPublicProfileShare: (token: string, passcode?: string) => mockGetPublicProfileShare(token, passcode) }));
jest.mock('@/data/app-mode', () => ({ isMockMode: false }));
jest.mock('expo-router', () => ({ router: { push: (href: unknown) => mockRouterPush(href) }, useLocalSearchParams: () => ({ token: 'profile-token' }) }));
jest.mock('@expo/ui/community/bottom-sheet', () => {
  const { View, Pressable, Text } = require('react-native');
  return { __esModule: true, default: ({ index, onClose, children, testID }: { index: number; onClose: () => void; children: React.ReactNode; testID?: string }) => index >= 0
    ? <View testID={testID}><Pressable accessibilityRole="button" accessibilityLabel="Dismiss native sheet" onPress={onClose}><Text>Dismiss</Text></Pressable>{children}</View>
    : null };
});

describe('PublicProfileShareScreen', () => {
  beforeEach(() => {
    mockGetPublicProfileShare.mockReset();
    mockRouterPush.mockReset();
    mockGetPublicProfileShare.mockResolvedValue({
      profile: { business_name: 'EstateFlow Realty', professional_title: 'Property Consultant', public_phone: '+91 98765 43210', public_email: 'hello@example.test', city: 'Tirunelveli', district: 'Tirunelveli', state: 'Tamil Nadu' },
      properties: [{ public_listing_token: 'profile-token~property-uuid', title: 'Green Valley Farm', description: 'Agricultural land with established water access.', category: 'agriculture', asking_price_inr: 2400000, area: 92, area_unit: 'acre', approximate_location: 'Tirunelveli, Tamil Nadu' }],
    });
  });

  it('renders selected public profile and portfolio information', async () => {
    const { findByText } = await renderWithProviders(<PublicProfileShareScreen />);
    expect(await findByText('EstateFlow Realty')).toBeTruthy();
    expect(await findByText('Property Consultant')).toBeTruthy();
    expect(await findByText('hello@example.test')).toBeTruthy();
    expect(await findByText('+91 98765 43210')).toBeTruthy();
    expect(await findByText('Tirunelveli, Tirunelveli, Tamil Nadu')).toBeTruthy();
    expect(await findByText('Available properties')).toBeTruthy();
    expect(await findByText('1')).toBeTruthy();
    expect(await findByText('Green Valley Farm')).toBeTruthy();
    expect(await findByText('agriculture · 92 acre · Tirunelveli, Tamil Nadu')).toBeTruthy();
    expect(await findByText('Agricultural land with established water access.')).toBeTruthy();
    expect(mockGetPublicProfileShare).toHaveBeenCalledWith('profile-token', undefined);
  });

  it('opens a selected property in the full shared listing screen', async () => {
    const { findByRole } = await renderWithProviders(<PublicProfileShareScreen />);
    fireEvent.press(await findByRole('button', { name: 'View Green Valley Farm details' }));
    expect(mockRouterPush).toHaveBeenCalledWith({ pathname: '/share/[token]', params: { token: 'profile-token~property-uuid' } });
  });

  it('keeps a contact action fixed and offers WhatsApp and phone options', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { findByRole } = await renderWithProviders(<PublicProfileShareScreen />);
    fireEvent.press(await findByRole('button', { name: 'Contact broker' }));
    fireEvent.press(await findByRole('button', { name: 'WhatsApp' }));
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://wa.me/919876543210'));
    openURL.mockRestore();
  });

  it('requests the passcode for a protected link and retries using it', async () => {
    mockGetPublicProfileShare.mockRejectedValueOnce({ response: { status: 401 } });
    mockGetPublicProfileShare.mockResolvedValueOnce({ profile: { business_name: 'Protected Realty' } });
    const { findByLabelText, findByRole, findByText } = await renderWithProviders(<PublicProfileShareScreen />);
    const input = await findByLabelText('Share passcode');
    fireEvent.changeText(input, '123456');
    fireEvent.press(await findByRole('button', { name: 'View profile' }));
    expect(await findByText('Protected Realty')).toBeTruthy();
    await waitFor(() => expect(mockGetPublicProfileShare).toHaveBeenLastCalledWith('profile-token', '123456'));
  });
});
