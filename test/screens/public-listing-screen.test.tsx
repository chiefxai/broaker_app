import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import type { ApiPublicListing } from '@/api/backend-api';
import PublicListingScreen from '@/screens/public-listing-screen';
import { renderWithProviders } from '../utils/render';

const mockGetPublicListing = jest.fn<(token: string, passcode?: string, accessToken?: string) => Promise<ApiPublicListing>>();
const mockRouteParams = { token: 'public-token' };
jest.mock('@/api/backend-api', () => ({
  getPublicListing: (token: string, passcode?: string, accessToken?: string) => mockGetPublicListing(token, passcode, accessToken),
}));
jest.mock('@/data/app-mode', () => ({ isMockMode: true }));
jest.mock('@/auth/auth-provider', () => ({ useOptionalAuth: () => null }));
jest.mock('@/auth/auth-gate', () => ({
  AuthGate: () => {
    const { Text } = require('react-native');
    return <Text>Sign in to view this private link</Text>;
  },
}));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockRouteParams }));

describe('PublicListingScreen', () => {
  afterEach(() => { jest.restoreAllMocks(); });

  beforeEach(() => {
    mockRouteParams.token = 'public-token';
    mockGetPublicListing.mockReset();
    mockGetPublicListing.mockResolvedValue({
      title: 'Riverside Farm', description: 'River frontage and borewell.', category: 'agriculture',
      asking_price_inr: 3_600_000, area: 150, area_unit: 'cent', approximate_location: 'Tirunelveli, Tamil Nadu',
      media: [{ url: 'https://files.example.test/farm.jpg', name: 'Farm overview' }], reports: [],
    });
  });

  it('renders the mock shared listing for a property opened from a mock portfolio', async () => {
    mockRouteParams.token = 'mock-profile~green-valley';
    const { findByText } = await renderWithProviders(<PublicListingScreen />);

    expect(await findByText('Green Valley Farm')).toBeTruthy();
    expect(await findByText('Tirunelveli, Tamil Nadu')).toBeTruthy();
    expect(mockGetPublicListing).not.toHaveBeenCalled();
  });

  it('renders the allowed public listing fields and loads by share token', async () => {
    const { findByText, getByLabelText } = await renderWithProviders(<PublicListingScreen />);
    expect(await findByText('Riverside Farm')).toBeTruthy();
    expect(getByLabelText('Farm overview')).toBeTruthy();
    expect(await findByText('Tirunelveli, Tamil Nadu')).toBeTruthy();
    expect(await findByText('₹36,00,000')).toBeTruthy();
    expect(mockGetPublicListing).toHaveBeenCalledWith('public-token', undefined, undefined);
  });

  it('shows a designed photo placeholder when a listing has no shared photos', async () => {
    mockGetPublicListing.mockResolvedValue({ title: 'Meadow Farm' });
    const { findByLabelText, findByText } = await renderWithProviders(<PublicListingScreen />);
    expect(await findByText('Meadow Farm')).toBeTruthy();
    expect(await findByLabelText('No property photos are shared')).toBeTruthy();
  });

  it('shows a loading skeleton while the listing is being fetched', async () => {
    let resolveListing!: (listing: ApiPublicListing) => void;
    mockGetPublicListing.mockReturnValue(new Promise((resolve) => { resolveListing = resolve; }));
    const { getByLabelText, findByText } = await renderWithProviders(<PublicListingScreen />);

    expect(getByLabelText('Loading property preview')).toBeTruthy();
    resolveListing({ title: 'Loaded Farm' });
    expect(await findByText('Loaded Farm')).toBeTruthy();
  });

  it('lets buyers select gallery photos and updates the visible photo count', async () => {
    mockGetPublicListing.mockResolvedValue({
      title: 'Gallery Farm',
      media: [
        { url: 'https://files.example.test/entrance.jpg', name: 'Farm entrance' },
        { url: 'https://files.example.test/north.jpg', name: 'North field' },
      ],
    });
    const { findByRole, findByText, getByTestId } = await renderWithProviders(<PublicListingScreen />);
    const secondPhoto = await findByRole('button', { name: 'Show photo 2: North field' });

    await fireEvent.press(secondPhoto);

    expect(getByTestId('shared-photo-2').props.accessibilityState).toMatchObject({ selected: true });
    expect(await findByText('2 / 2')).toBeTruthy();
    expect(getByTestId('shared-photo-2').props.accessibilityLabel).toBe('Show photo 2: North field');
  });

  it('shows an unavailable state when the public token has expired or been revoked', async () => {
    mockGetPublicListing.mockRejectedValue({ response: { status: 404 } });
    const { getByRole, getByText } = await renderWithProviders(<PublicListingScreen />);
    await waitFor(() => expect(getByText('This property link is unavailable')).toBeTruthy(), { timeout: 5000 });
    expect(getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('prompts for and submits a passcode for protected links', async () => {
    mockGetPublicListing.mockRejectedValueOnce({ response: { status: 401 } });
    mockGetPublicListing.mockResolvedValueOnce({ title: 'Protected Farm' });
    const { findByLabelText, findByRole, findByText } = await renderWithProviders(<PublicListingScreen />);
    const passcodeField = await findByLabelText('Property share passcode');
    fireEvent.changeText(passcodeField, '123456');
    fireEvent.press(await findByRole('button', { name: 'Unlock property' }));
    expect(await findByText('Protected Farm')).toBeTruthy();
    expect(mockGetPublicListing).toHaveBeenLastCalledWith('public-token', '123456', undefined);
  });

  it('asks for app sign-in only when the link is private', async () => {
    mockGetPublicListing.mockRejectedValue({
      response: { status: 401, data: { detail: 'Sign in to view this private share link' } },
    });
    const { findByText } = await renderWithProviders(<PublicListingScreen />);
    expect(await findByText('Sign in to view this private link')).toBeTruthy();
  });

  it('renders only optional fields and shared documents returned by the permission-filtered API', async () => {
    mockGetPublicListing.mockResolvedValue({
      specifications: { area: 12, area_unit: 'acre', soil_type: 'red', water_sources: [], utilities: [] },
      documents: [{ url: 'https://api.example.test/api/v1/public/listings/public-token/documents/doc-1', name: 'Survey plan', category: 'survey' }],
    });
    const { findByText, queryByText } = await renderWithProviders(<PublicListingScreen />);
    expect(await findByText('12 acre')).toBeTruthy();
    expect(await findByText('Survey plan')).toBeTruthy();
    expect(await findByText('survey')).toBeTruthy();
    expect(queryByText('Riverside Farm')).toBeNull();
    expect(queryByText('₹36,00,000')).toBeNull();
  });

  it('presents the broker-shared photos, files, and public contact details in separate cards', async () => {
    mockGetPublicListing.mockResolvedValue({
      title: 'Fieldstone Farm',
      media: [{ url: 'https://api.example.test/photo/1', name: 'Entrance' }, { url: 'https://api.example.test/photo/2', name: 'North field' }],
      documents: [{ url: 'https://api.example.test/document/1', name: 'Survey plan', category: 'survey' }],
      broker_contact: { business_name: 'Fieldstone Realty', public_phone: '+919876543210', public_email: 'hello@example.test', district: 'Chennai', state: 'Tamil Nadu' },
    });
    const { findByText, findByRole } = await renderWithProviders(<PublicListingScreen />);

    expect(await findByText('Property photos')).toBeTruthy();
    expect(await findByText('North field')).toBeTruthy();
    expect(await findByText('Shared documents')).toBeTruthy();
    expect(await findByText('Survey plan')).toBeTruthy();
    expect(await findByText('Contact the broker')).toBeTruthy();
    expect(await findByText('Fieldstone Realty')).toBeTruthy();
    expect(await findByRole('button', { name: 'Call broker at +919876543210' })).toBeTruthy();
    expect(await findByRole('button', { name: 'Email broker at hello@example.test' })).toBeTruthy();
  });

  it('opens shared documents inside the web app and revokes the temporary viewer URL on close', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    mockGetPublicListing.mockResolvedValue({
      documents: [{ url: 'https://api.example.test/api/v1/public/listings/public-token/documents/doc-1', name: 'Survey plan', category: 'survey' }],
    });
    const createObjectURL = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:shared-survey');
    const revokeObjectURL = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const fetchDocument = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, blob: async () => new Blob(['%PDF-test'], { type: 'application/pdf' }) } as Response);
    const { findByRole, findByLabelText, queryByLabelText } = await renderWithProviders(<PublicListingScreen />);

    const openButton = await findByRole('button', { name: 'Open shared survey Survey plan' });
    await act(async () => {
      fireEvent.press(openButton);
      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    });

    const viewer = await findByLabelText('Shared document viewer: Survey plan');
    expect(viewer.props.src).toBe('blob:shared-survey');
    expect(fetchDocument).toHaveBeenCalledWith('https://api.example.test/api/v1/public/listings/public-token/documents/doc-1', { headers: {} });
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    fireEvent.press(await findByLabelText('Close shared document'));
    await waitFor(() => expect(queryByLabelText('Shared document viewer: Survey plan')).toBeNull());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:shared-survey');
  });
});
