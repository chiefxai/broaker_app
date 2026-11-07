import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import PropertyCreationScreen from '@/screens/property-creation-screen';
import type { LocalProperty } from '@/data/mock/properties';
import { renderWithProviders } from '../utils/render';
import * as DocumentPicker from 'expo-document-picker';

let mockUuidCounter = 0;
const mockSaveProperty = jest.fn<(property: LocalProperty) => Promise<void>>();
const mockOfflineStore = {
  saveProperty: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getProperty: jest.fn<() => Promise<null>>().mockResolvedValue(null),
  saveAsset: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  listAssets: jest.fn<() => Promise<[]>>().mockResolvedValue([]),
  deleteAsset: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  syncNow: jest.fn<() => Promise<{ synced: number; errors: [] }>>().mockResolvedValue({ synced: 0, errors: [] }),
};
const mockUseLocalProperty = jest.fn<() => { data: (typeof import('@/data/mock/properties').mockProperties)[number] | undefined; isPending: boolean; isError: boolean; isSuccess: boolean; refetch: jest.Mock }>(() => ({ data: undefined, isPending: false, isError: false, isSuccess: false, refetch: jest.fn() }));

jest.mock('@/data/database', () => ({ useLocalProperty: () => mockUseLocalProperty(), useSaveLocalProperty: () => mockSaveProperty, useOfflinePropertyStore: () => mockOfflineStore }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn(() => false), replace: jest.fn(), push: jest.fn() }, useLocalSearchParams: jest.fn(() => ({})) }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => `test-property-${++mockUuidCounter}`) }));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  geocodeAsync: jest.fn(),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({ File: jest.fn().mockImplementation((...args: unknown[]) => ({ uri: String(args[0]), size: 4096 })) }));
jest.mock('expo-audio', () => ({
  AudioModule: { requestRecordingPermissionsAsync: jest.fn<() => Promise<{ granted: boolean }>>().mockResolvedValue({ granted: true }) },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  useAudioRecorder: () => ({ prepareToRecordAsync: jest.fn<() => Promise<void>>().mockResolvedValue(undefined), record: jest.fn(), stop: jest.fn<() => Promise<void>>().mockResolvedValue(undefined), uri: 'file:///voice-log.m4a' }),
  useAudioRecorderState: () => ({ isRecording: false, durationMillis: 3000 }),
  useAudioPlayer: () => ({ replace: jest.fn(), play: jest.fn(), pause: jest.fn() }),
  useAudioPlayerStatus: () => ({ didJustFinish: false, playing: false }),
}));

describe('PropertyCreationScreen', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
    mockSaveProperty.mockReset().mockResolvedValue(undefined);
    mockOfflineStore.saveProperty.mockReset().mockResolvedValue(undefined);
    mockOfflineStore.getProperty.mockReset().mockResolvedValue(null);
    mockOfflineStore.saveAsset.mockReset().mockResolvedValue(undefined);
    mockOfflineStore.listAssets.mockReset().mockResolvedValue([]);
    mockOfflineStore.deleteAsset.mockReset().mockResolvedValue(undefined);
    mockOfflineStore.syncNow.mockReset().mockResolvedValue({ synced: 0, errors: [] });
    mockUseLocalProperty.mockReset().mockReturnValue({ data: undefined, isPending: false, isError: false, isSuccess: false, refetch: jest.fn() });
    jest.mocked(require('expo-router').useLocalSearchParams).mockReturnValue({});
    jest.mocked(router.back).mockClear();
    jest.mocked(router.canGoBack).mockReturnValue(false);
    jest.mocked(router.replace).mockClear();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockReset();
    jest.mocked(ImagePicker.launchCameraAsync).mockReset();
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockReset();
    jest.mocked(DocumentPicker.getDocumentAsync).mockReset();
  });

  it('loads existing property data into the same six-step wizard for editing', async () => {
    const existing = { ...require('@/data/mock/properties').mockProperties[0], title: 'Saved farm to edit' };
    mockUseLocalProperty.mockReturnValue({ data: existing, isPending: false, isError: false, isSuccess: true, refetch: jest.fn() });
    jest.mocked(require('expo-router').useLocalSearchParams).mockReturnValue({ propertyId: existing.id });

    const { findByTestId, getByTestId } = await renderWithProviders(<PropertyCreationScreen />);
    expect(await findByTestId('property-step-1')).toBeTruthy();
    expect(getByTestId('property-title').props.value).toBe('Saved farm to edit');
    expect(getByTestId('property-continue')).toBeTruthy();
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-2')).toBeTruthy());
    expect(getByTestId('property-village').props.value).toContain('Sample Village');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-3')).toBeTruthy());
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-4')).toBeTruthy());
    expect(getByTestId('property-asking-price').props.value).toBe('24,00,000');
    expect(getByTestId('property-area').props.value).toBe('150');
  });

  it('locks the form scroll while the location map is being dragged and restores it afterward', async () => {
    const { getByTestId } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-2')).toBeTruthy());

    const formScroll = getByTestId('property-editor-scroll');
    const map = getByTestId('property-map-interaction-shell');
    expect(formScroll.props.scrollEnabled).toBe(true);
    await fireEvent(map, 'touchStart', { nativeEvent: { touches: [{ identifier: 1 }] } });
    expect(getByTestId('property-editor-scroll').props.scrollEnabled).toBe(false);
    await fireEvent(map, 'touchEnd', { nativeEvent: { touches: [] } });
    expect(getByTestId('property-editor-scroll').props.scrollEnabled).toBe(true);
  });

  it('keeps Save draft in the header and uses a clearly separated native input field', async () => {
    const { getAllByText, getByTestId } = await renderWithProviders(<PropertyCreationScreen />);

    expect(getByTestId('property-save-draft-header')).toBeTruthy();
    expect(getAllByText('Save draft')).toHaveLength(1);
    expect(getByTestId('property-title').type).toBe('TextInput');
    expect(getByTestId('property-title').parent?.parent?.props.style).toBeDefined();
  });

  it('keeps a property in draft only when Save draft is selected', async () => {
    const { getByTestId, findByText } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.changeText(getByTestId('property-title'), 'Draft only farm');
    await fireEvent.press(getByTestId('property-save-draft-header'));

    await findByText('Draft saved.');
    expect(mockSaveProperty.mock.calls.at(-1)?.[0].status.label).toBe('Draft');
  });

  it('returns to home when opened directly with no back history', async () => {
    jest.mocked(router.replace).mockClear();
    const { getByLabelText } = await renderWithProviders(<PropertyCreationScreen />);

    await fireEvent.press(getByLabelText('Go back'));

    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('requests foreground location and fills GPS coordinates and reverse-geocoded address', async () => {
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' as Location.PermissionStatus, granted: true, canAskAgain: true, expires: 'never' });
    jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: 8.7139, longitude: 77.7567, altitude: null, accuracy: 12, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.now(), mocked: false,
    });
    jest.mocked(Location.reverseGeocodeAsync).mockResolvedValue([{ streetNumber: null, street: 'Riverbank Road', name: 'Vagaikulam', postalCode: '627001', district: 'Tirunelveli', city: 'Ambasamudram', region: 'Tamil Nadu', country: 'India', isoCountryCode: 'IN', timezone: null, subregion: 'Ambasamudram', formattedAddress: 'Riverbank Road, Vagaikulam' }]);

    const { getByTestId, getByText, getByLabelText } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.changeText(getByTestId('property-title'), 'GPS test property');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-2')).toBeTruthy());
    await fireEvent.press(getByTestId('detect-gps-pin'));

    expect(await getByText('GPS pin captured')).toBeTruthy();
    expect(getByText('Lat 8.713900° · Lng 77.756700°')).toBeTruthy();
    expect(getByLabelText('Address Line / Village').props.value).toBe('Riverbank Road, Vagaikulam');
    expect(getByLabelText('Pincode').props.value).toBe('627001');
    expect(getByLabelText('Taluk').props.value).toBe('Tirunelveli');
    expect(getByLabelText('District').props.value).toBe('Ambasamudram');
    expect(getByLabelText('State').props.value).toBe('Tamil Nadu');
    expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
  });

  it('moves the pin to the address after the user enters pincode and locality details', async () => {
    jest.mocked(Location.geocodeAsync).mockResolvedValue([{ latitude: 8.7142, longitude: 77.7571, accuracy: 35 }]);
    const { getByTestId, getByLabelText, findByText } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.changeText(getByTestId('property-title'), 'Address lookup test property');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-2')).toBeTruthy());

    await fireEvent.changeText(getByLabelText('Address Line / Village'), 'Vagaikulam');
    await fireEvent.changeText(getByLabelText('Pincode'), '627001');
    await fireEvent.changeText(getByLabelText('Taluk'), 'Ambasamudram');
    await fireEvent.changeText(getByLabelText('District'), 'Tirunelveli');
    await fireEvent.changeText(getByLabelText('State'), 'Tamil Nadu');

    expect(await findByText('Lat 8.714200° · Lng 77.757100°', {}, { timeout: 2500 })).toBeTruthy();
    expect(Location.geocodeAsync).toHaveBeenCalledWith('Vagaikulam, Ambasamudram, Tirunelveli, Tamil Nadu, 627001, India');
  });

  it('explains when foreground location permission is denied', async () => {
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ status: 'denied' as Location.PermissionStatus, granted: false, canAskAgain: false, expires: 'never' });

    const { getByTestId, findByText } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.changeText(getByTestId('property-title'), 'GPS test property');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-2')).toBeTruthy());
    await fireEvent.press(getByTestId('detect-gps-pin'));

    expect(await findByText('Location permission was not granted. You can still enter the address and coordinates manually.')).toBeTruthy();
  });

  it('requires a title before advancing from basic information', async () => {
    const { findByRole, findByTestId, getByTestId, queryByRole } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.press(getByTestId('clear-property-title'));
    await fireEvent.press(getByTestId('property-continue'));
    expect(await findByRole('alert')).toHaveTextContent('Property title is required.');
    expect(await findByTestId('toast')).toBeTruthy();
    expect(await findByRole('status')).toHaveTextContent('Property title is required.');
    expect(getByTestId('property-step-1')).toBeTruthy();

    await fireEvent.changeText(getByTestId('property-title'), 'Riverside Farm');
    expect(queryByRole('alert')).toBeNull();

    await fireEvent.press(getByTestId('clear-property-title'));
    await fireEvent.press(getByTestId('property-save-draft-header'));
    expect(await findByRole('alert')).toHaveTextContent('Property title is required.');
    expect(await findByTestId('toast')).toBeTruthy();
  });

  it('moves through the six steps and saves a local draft', async () => {
    const { findByText, getByTestId, getByText, getByRole } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.changeText(getByTestId('property-title'), 'Riverside Farm');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-2')).toBeTruthy());
    await fireEvent.changeText(getByTestId('property-village'), 'Ambasamudram');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-3')).toBeTruthy());
    await fireEvent.press(getByTestId('water-source-borewell'));
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-4')).toBeTruthy());
    expect(getByTestId('property-financials-step')).toBeTruthy();
    expect(getByTestId('property-asking-price').props.value).toBe('36,00,000');
    expect(getByTestId('property-area').props.value).toBe('150');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-5')).toBeTruthy());
    expect(getByTestId('ownership-documents-step')).toBeTruthy();
    expect(getByTestId('ownership-documents-progress')).toBeTruthy();
    expect(getByText('Legal documents')).toBeTruthy();
    expect(getByText('Reference link management is not available in this release.')).toBeTruthy();
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-6')).toBeTruthy());
    expect(getByTestId('property-review-publish-step')).toBeTruthy();
    expect(getByText('Field Media & Audio Notes')).toBeTruthy();
    expect(getByText('Review Listing Details')).toBeTruthy();
    expect(getByText('Public Share Access')).toBeTruthy();
    expect(getByText('Riverside Farm')).toBeTruthy();
    expect(getByText('A public link will be available after publishing.')).toBeTruthy();
    expect(mockSaveProperty).toHaveBeenCalled();
    await fireEvent.press(getByRole('button', { name: 'Record a field voice log' }));
    expect(getByRole('button', { name: 'Stop recording' })).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Stop recording' }));
    expect(await findByText('Voice log saved in test mode.')).toBeTruthy();
    expect(getByText('2 / 5 clips')).toBeTruthy();
  });

  it('highlights missing required step 4 price and area and stays on the step', async () => {
    const { findAllByRole, findByRole, getByTestId } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.changeText(getByTestId('property-title'), 'Financial validation test');
    for (const step of [2, 3, 4]) {
      await fireEvent.press(getByTestId('property-continue'));
      await waitFor(() => expect(getByTestId(`property-step-${step}`)).toBeTruthy());
    }

    await fireEvent.changeText(getByTestId('property-asking-price'), '0');
    await fireEvent.changeText(getByTestId('property-area'), '0');
    await fireEvent.press(getByTestId('property-continue'));

    expect(await findAllByRole('alert')).toHaveLength(2);
    expect(await findByRole('status')).toHaveTextContent('Enter a total asking price greater than ₹0.');
    expect(getByTestId('property-step-4')).toBeTruthy();

    await fireEvent.changeText(getByTestId('property-asking-price'), '3600000');
    await fireEvent.changeText(getByTestId('property-area'), '150');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-5')).toBeTruthy());
  });

  it('selects multiple photos in one picker action and immediately previews each image', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///field-a.jpg', fileName: 'field-a.jpg', mimeType: 'image/jpeg', fileSize: 4096, width: 1200, height: 800, type: 'image' },
        { uri: 'file:///field-b.png', fileName: 'field-b.png', mimeType: 'image/png', fileSize: 4096, width: 1200, height: 800, type: 'image' },
      ],
    } as ImagePicker.ImagePickerResult);
    const { findByLabelText, findByText, getByTestId, getByText } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.changeText(getByTestId('property-title'), 'Multi photo test');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-2')).toBeTruthy());
    for (const step of [3, 4, 5, 6]) {
      await fireEvent.press(getByTestId('property-continue'));
      await waitFor(() => expect(getByTestId(`property-step-${step}`)).toBeTruthy());
    }

    await fireEvent.press(getByText('Choose photos'));

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({
      allowsMultipleSelection: true,
      selectionLimit: 2,
      orderedSelection: true,
    }));
    expect(await findByText('5 / 5 Photos')).toBeTruthy();
    expect(await findByLabelText('field-a.jpg')).toBeTruthy();
    expect(await findByLabelText('field-b.png')).toBeTruthy();
  });

  it('adds a clearly marked mock legal file under the chosen category', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ name: 'title-deed.pdf', uri: 'file:///title-deed.pdf', mimeType: 'application/pdf', size: 2048, lastModified: Date.now() }],
    });
    const { findByTestId, getByTestId, getByRole, findByText } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.changeText(getByTestId('property-title'), 'Document upload test');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-2')).toBeTruthy());
    for (const step of [3, 4, 5]) {
      await fireEvent.press(getByTestId('property-continue'));
      await waitFor(() => expect(getByTestId(`property-step-${step}`)).toBeTruthy());
    }
    await fireEvent.press(getByRole('button', { name: 'Survey record document category' }));
    await fireEvent.press(getByRole('button', { name: 'Choose file' }));
    expect(await findByText('title-deed.pdf')).toBeTruthy();
    expect(await findByText(/survey · Mock file, not uploaded/)).toBeTruthy();
    expect(jest.mocked(DocumentPicker.getDocumentAsync)).toHaveBeenCalledWith(expect.objectContaining({ type: expect.arrayContaining(['image/webp']), copyToCacheDirectory: true }));
    expect(await findByTestId('ownership-documents-step')).toBeTruthy();
  });

  it('publishes the final property and returns to the screen that opened creation', async () => {
    const { findByTestId, getByTestId } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.changeText(getByTestId('property-title'), 'Riverside Farm');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(mockSaveProperty).toHaveBeenCalled());
    for (const step of [3, 4, 5, 6]) {
      await fireEvent.press(getByTestId('property-continue'));
      await waitFor(() => expect(getByTestId(`property-step-${step}`)).toBeTruthy());
    }
    jest.mocked(router.canGoBack).mockReturnValue(true);
    await fireEvent.press(getByTestId('property-save-final'));
    expect(await findByTestId('toast')).toBeTruthy();
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(router.replace).not.toHaveBeenCalled();
    expect(mockSaveProperty).toHaveBeenCalled();
    expect(mockSaveProperty.mock.calls.at(-1)?.[0].status.label).toBe('Available');
  });

  it('returns to home after saving when opened without a previous route', async () => {
    const { findByTestId, getByTestId } = await renderWithProviders(<PropertyCreationScreen />);
    await fireEvent.changeText(getByTestId('property-title'), 'Direct route property');
    await fireEvent.press(getByTestId('property-continue'));
    await waitFor(() => expect(getByTestId('property-step-2')).toBeTruthy());
    for (const step of [3, 4, 5, 6]) {
      await fireEvent.press(getByTestId('property-continue'));
      await waitFor(() => expect(getByTestId(`property-step-${step}`)).toBeTruthy());
    }
    await fireEvent.press(getByTestId('property-save-final'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });
});
