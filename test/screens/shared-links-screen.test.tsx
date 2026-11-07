import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import { mockSharedLinks } from '@/data/mock/shared-links';
import { mockProperties } from '@/data/mock/properties';
import { useLocalProperties } from '@/data/database';
import SharedLinksScreen from '@/screens/shared-links-screen';
import { renderWithProviders } from '../utils/render';
jest.mock('@expo/ui/swift-ui', () => jest.requireActual('../utils/mock-swift-menu'));
jest.mock('@expo/ui/community/bottom-sheet', () => {
  const { View, Pressable, Text } = require('react-native');
  return { __esModule: true, default: ({ index, onClose, children, testID }: { index: number; onClose: () => void; children: React.ReactNode; testID?: string }) => index >= 0
    ? <View testID={testID}><Pressable accessibilityRole="button" accessibilityLabel="Dismiss native sheet" onPress={onClose}><Text>Dismiss</Text></Pressable>{children}</View>
    : null };
});

const mockPush = jest.fn();
const initialWindow = Dimensions.get('window');
const initialScreen = Dimensions.get('screen');
const mockShareRouteParams: { generatePropertyId?: string; shareAfterCreate?: string } = {};
jest.mock('@/data/database', () => ({ useLocalProperties: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush as never }), useLocalSearchParams: () => mockShareRouteParams }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => undefined) }));
jest.mock('@expo/ui', () => {
  const { View } = require('react-native');
  return {
    RNHostView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

describe('SharedLinksScreen', () => {
  afterEach(async () => {
    await act(async () => { Dimensions.set({ window: initialWindow, screen: initialScreen }); });
  });
  beforeEach(() => {
    jest.mocked(useLocalProperties).mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    delete mockShareRouteParams.generatePropertyId;
    delete mockShareRouteParams.shareAfterCreate;
  });
  it('prefills a property and shares the generated URL when requested', async () => {
    mockShareRouteParams.generatePropertyId = mockProperties[0].id;
    mockShareRouteParams.shareAfterCreate = 'true';
    const { findByRole, findByText } = await renderWithProviders(<SharedLinksScreen />);
    expect((await findByRole('checkbox', { name: `Include ${mockProperties[0].title}` })).props.accessibilityState.checked).toBe(true);
    await fireEvent.press(await findByRole('button', { name: 'Create share link' }));
    expect(await findByText('Share link copied to clipboard.')).toBeTruthy();
  });
  it('limits card text without changing the accessible action labels', async () => {
    const link = mockSharedLinks[0];
    const { getByText, getByRole } = await renderWithProviders(<SharedLinksScreen />);
    expect(getByText(link.title).props).toMatchObject({ numberOfLines: 2, ellipsizeMode: 'tail' });
    expect(getByText(link.areaLabel).props).toMatchObject({ numberOfLines: 1, ellipsizeMode: 'tail' });
    if (link.shortUrl) expect(getByText(link.shortUrl).props).toMatchObject({ numberOfLines: 1, ellipsizeMode: 'tail' });
    expect(getByText('2 days ago')).toBeTruthy();
    expect(getByRole('button', { name: `Actions for ${link.title}` })).toBeTruthy();
  });
  it('shows only the access type in the shared-link details row', async () => {
    const { getAllByTestId } = await renderWithProviders(<SharedLinksScreen />);
    const card = within(getAllByTestId('shared-link-card')[0]);
    expect(card.getByLabelText(`Access type: ${mockSharedLinks[0].access}`)).toBeTruthy();
    expect(card.queryByText('Price')).toBeNull();
    expect(card.queryByText('Map')).toBeNull();
    expect(card.queryByText('Owner')).toBeNull();
  });
  it('lets shared-link cards fill the available list width without a fixed card width', async () => {
    const { getAllByTestId } = await renderWithProviders(<SharedLinksScreen />);
    const itemStyle = StyleSheet.flatten(getAllByTestId('shared-link-card-list-item')[0].props.style);
    expect(itemStyle.width).toBe('100%');
    expect(itemStyle.alignSelf).toBe('flex-start');
    expect(itemStyle.maxWidth).toBeGreaterThan(0);
  });
  it('uses compact shared-link cards on narrow screens', async () => {
    const metrics = { width: 390, height: 844, scale: 1, fontScale: 1 };
    await act(async () => { Dimensions.set({ window: metrics, screen: metrics }); });
    const { getAllByTestId } = await renderWithProviders(<SharedLinksScreen />);
    const card = StyleSheet.flatten(getAllByTestId('shared-link-card')[0].props.style);
    const thumbnail = StyleSheet.flatten(getAllByTestId('shared-link-thumbnail')[0].props.style);
    expect(card.padding).toBeGreaterThan(0);
    expect(card.padding).toBe(8);
    expect(thumbnail.width).toBe(60);
  });
  it('expands shared-link cards into a two-column layout when the list is wide', async () => {
    const { getByTestId, getAllByTestId } = await renderWithProviders(<SharedLinksScreen />);
    const list = getByTestId('shared-link-list');
    fireEvent.layout(list, { width: 1280, height: 800, x: 0, y: 0 });
    await waitFor(() => expect(StyleSheet.flatten(getAllByTestId('shared-link-card-list-item')[0].props.style).flex).toBe(1));
    const itemStyle = StyleSheet.flatten(getAllByTestId('shared-link-card-list-item')[0].props.style);
    expect(itemStyle.flex).toBe(1);
    expect(itemStyle.minWidth).toBe(0);
  });
  it('starts with the search box, without summary content above it', async () => {
    const { findByLabelText, queryByText } = await renderWithProviders(<SharedLinksScreen />);
    expect(await findByLabelText('Search shared links')).toBeTruthy();
    expect(queryByText('YOUR PORTFOLIO')).toBeNull();
    expect(queryByText('Total links')).toBeNull();
    expect(queryByText('Broker Vault protection')).toBeNull();
  });

  it('shows the specific-properties flow in the requested order with optional name and expiry', async () => {
    const { getByRole, getByLabelText, getByText, getAllByText, findByText, findByRole } = await renderWithProviders(<SharedLinksScreen />);
    await fireEvent.press(getByRole('button', { name: 'Create shared link' }));

    expect(await findByRole('button', { name: 'Specific properties' })).toBeTruthy();
    expect(getByRole('button', { name: 'Everything' })).toBeTruthy();
    expect(getByLabelText('Link name (optional)')).toBeTruthy();
    expect(getByText('Expiration (optional)')).toBeTruthy();
    expect(getAllByText('Access').length).toBeGreaterThan(0);
    expect(await findByText('Link includes')).toBeTruthy();
    expect(getByRole('button', { name: 'Create share link' }).props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(getByRole('checkbox', { name: `Include ${mockProperties[0].title}` }));
    const disclosureToggle = getByRole('button', { name: `Sharing options for ${mockProperties[0].title}` });
    expect(disclosureToggle.props.accessibilityState.expanded).toBe(false);
    await fireEvent.press(disclosureToggle);
    expect(getByRole('button', { name: `Sharing options for ${mockProperties[0].title}` }).props.accessibilityState.expanded).toBe(true);
    expect(getByRole('switch', { name: `${mockProperties[0].title}: Photos` })).toBeTruthy();
  });

  it('shows common disclosure options for Everything without showing property selection', async () => {
    const { getByRole, getByLabelText, getByText, getAllByText, findByText, queryByRole } = await renderWithProviders(<SharedLinksScreen />);
    await fireEvent.press(getByRole('button', { name: 'Create shared link' }));
    await fireEvent.press(getByRole('button', { name: 'Everything' }));

    expect(getAllByText('Access').length).toBeGreaterThan(0);
    expect(await findByText(/Broker profile \+ all 1 active property/)).toBeTruthy();
    expect(getByRole('switch', { name: 'Common sharing: Photos' })).toBeTruthy();
    expect(getByLabelText('Link name (optional)')).toBeTruthy();
    expect(getByText('Expiration (optional)')).toBeTruthy();
    expect(queryByRole('checkbox', { name: `Include ${mockProperties[0].title}` })).toBeNull();
    expect(queryByRole('button', { name: 'Select all' })).toBeNull();
  });

  it('applies common disclosures to selected properties and allows a property override', async () => {
    const { getByRole } = await renderWithProviders(<SharedLinksScreen />);
    await fireEvent.press(getByRole('button', { name: 'Create shared link' }));
    const commonPhotos = getByRole('switch', { name: 'Common sharing: Photos' });
    expect(commonPhotos.props.value).toBe(true);
    await fireEvent(commonPhotos, 'valueChange', false);
    await fireEvent.press(getByRole('checkbox', { name: `Include ${mockProperties[0].title}` }));
    await fireEvent.press(getByRole('button', { name: `Sharing options for ${mockProperties[0].title}` }));
    const propertyPhotos = getByRole('switch', { name: `${mockProperties[0].title}: Photos` });
    expect(propertyPhotos.props.value).toBe(false);
    await fireEvent(propertyPhotos, 'valueChange', true);
    expect(getByRole('switch', { name: `${mockProperties[0].title}: Photos` }).props.value).toBe(true);
  });

  it('offers active properties only for specific links', async () => {
    const draftProperty = {
      ...mockProperties[0],
      id: 'draft-property-id',
      title: 'Unpublished Orchard',
      status: { label: 'Draft', tone: 'warning' as const },
    };
    mockProperties.push(draftProperty);
    try {
      const { getByRole, findByRole, queryByRole } = await renderWithProviders(<SharedLinksScreen />);
      await fireEvent.press(getByRole('button', { name: 'Create shared link' }));

      expect(await findByRole('checkbox', { name: `Include ${mockProperties[0].title}` })).toBeTruthy();
      expect(queryByRole('checkbox', { name: 'Include Unpublished Orchard' })).toBeNull();
    } finally {
      mockProperties.pop();
    }
  });

  it('creates one named link for a specific property and allows private access', async () => {
    const { getByRole, getByLabelText, findByText } = await renderWithProviders(<SharedLinksScreen />);
    await fireEvent.press(getByRole('button', { name: 'Create shared link' }));
    await fireEvent.changeText(getByLabelText('Link name (optional)'), 'South Farm');
    await fireEvent.press(getByRole('checkbox', { name: `Include ${mockProperties[0].title}` }));
    await fireEvent.press(getByRole('button', { name: 'Private: Only you can open it' }));
    await fireEvent.press(getByRole('button', { name: 'Create share link' }));

    expect(await findByText('Share link created successfully.')).toBeTruthy();
    expect(await findByText('South Farm')).toBeTruthy();
  });

  it('creates a single portfolio link from several selected properties with an optional passcode', async () => {
    const secondProperty = { ...mockProperties[0], id: 'group-property-two', title: 'Second Farm' };
    mockProperties.push(secondProperty);
    try {
      const { getByRole, getByLabelText, getByText, findByText } = await renderWithProviders(<SharedLinksScreen />);
      await fireEvent.press(getByRole('button', { name: 'Create shared link' }));
      await fireEvent.press(getByRole('checkbox', { name: `Include ${mockProperties[0].title}` }));
      await fireEvent.press(getByRole('checkbox', { name: 'Include Second Farm' }));
      expect(getByText('Broker profile + selected properties.')).toBeTruthy();
      await fireEvent.press(getByRole('button', { name: 'Protected: Requires your passcode' }));
      await fireEvent.changeText(getByLabelText('Share link passcode'), '123456');
      await fireEvent.press(getByRole('button', { name: 'Create share link' }));

      expect(await findByText('Share link created successfully.')).toBeTruthy();
      expect(await findByText('Selected properties')).toBeTruthy();
    } finally {
      mockProperties.pop();
    }
  });

  it('creates one link for everything active without showing property selection', async () => {
    const { getByRole, getByLabelText, getByText, getAllByText, findByText, queryByRole } = await renderWithProviders(<SharedLinksScreen />);
    await fireEvent.press(getByRole('button', { name: 'Create shared link' }));
    await fireEvent.press(getByRole('button', { name: 'Everything' }));
    await fireEvent.changeText(getByLabelText('Link name (optional)'), 'My portfolio');
    await fireEvent.press(getByRole('button', { name: 'Create share link' }));

    expect(await findByText('Share link created successfully.')).toBeTruthy();
    expect(await findByText('My portfolio')).toBeTruthy();
    expect(queryByRole('checkbox', { name: `Include ${mockProperties[0].title}` })).toBeNull();
  });

  it('lets the user select all active properties or clear the selection', async () => {
    const secondProperty = { ...mockProperties[0], id: 'group-property-two', title: 'Second Farm' };
    mockProperties.push(secondProperty);
    try {
      const { getByRole, getByTestId, findByText } = await renderWithProviders(<SharedLinksScreen />);
      await fireEvent.press(getByRole('button', { name: 'Create shared link' }));

      await fireEvent.press(getByTestId('select-all-active-properties'));
      expect(getByRole('checkbox', { name: `Include ${mockProperties[0].title}` }).props.accessibilityState.checked).toBe(true);
      expect(getByRole('checkbox', { name: 'Include Second Farm' }).props.accessibilityState.checked).toBe(true);
      expect(await findByText('2 selected')).toBeTruthy();

      await fireEvent.press(getByTestId('clear-property-selection'));
      expect(getByRole('checkbox', { name: `Include ${mockProperties[0].title}` }).props.accessibilityState.checked).toBe(false);
      expect(getByRole('checkbox', { name: 'Include Second Farm' }).props.accessibilityState.checked).toBe(false);
    } finally {
      mockProperties.pop();
    }
  });

  it('closes the native sheet when dismissed', async () => {
    const { getByRole, queryByText, queryByRole } = await renderWithProviders(<SharedLinksScreen />);
    await fireEvent.press(getByRole('button', { name: 'Create shared link' }));
    expect(queryByText('Generate Share Link')).toBeTruthy();
    expect(queryByRole('button', { name: 'Cancel' })).toBeNull();
    await fireEvent.press(getByRole('button', { name: 'Dismiss native sheet' }));
    expect(queryByText('Generate Share Link')).toBeNull();
  });

  it('closes the property selection sheet using the header close button', async () => {
    const { getByRole, queryByText } = await renderWithProviders(<SharedLinksScreen />);
    await fireEvent.press(getByRole('button', { name: 'Create shared link' }));
    await fireEvent.press(getByRole('button', { name: 'Close property selection' }));
    expect(queryByText('Generate Share Link')).toBeNull();
  });

  it('renders demo links and filters by status', async () => {
    const { findByText, getByRole, queryByText } = await renderWithProviders(<SharedLinksScreen />);
    expect(await findByText(mockSharedLinks[0].title)).toBeTruthy();
    fireEvent.press(getByRole('button', { name: 'Expired, 1' }));
    await waitFor(() => expect(queryByText(mockSharedLinks[0].title)).toBeNull());
    expect(await findByText(mockSharedLinks[2].title)).toBeTruthy();
  });

  it('shows only active links initially and exposes inactive links through their status filters', async () => {
    const { findByText, queryByText, getByRole } = await renderWithProviders(<SharedLinksScreen />);
    expect(await findByText(mockSharedLinks[0].title)).toBeTruthy();
    expect(await findByText(mockSharedLinks[1].title)).toBeTruthy();
    expect(queryByText(mockSharedLinks[2].title)).toBeNull();
    fireEvent.press(getByRole('button', { name: 'Expired, 1' }));
    expect(await findByText(mockSharedLinks[2].title)).toBeTruthy();
  });

  it('keeps status chips separate and opens link filters in a sheet', async () => {
    const { findByText, getByRole, getByTestId } = await renderWithProviders(<SharedLinksScreen />);
    expect(getByTestId('search-filter-parent')).toBeTruthy();
    expect(await findByText('All (3)')).toBeTruthy();
    fireEvent.press(getByRole('button', { name: 'Filter options' }));
    expect(await findByText('Filter Shared Links')).toBeTruthy();
    expect(await findByText('Access Type')).toBeTruthy();
    expect(await findByText('Sort Order')).toBeTruthy();
  });

  it('applies access filters from the link filter sheet', async () => {
    const { findByText, getByRole, queryByText } = await renderWithProviders(<SharedLinksScreen />);
    fireEvent.press(getByRole('button', { name: 'Filter options' }));
    fireEvent.press(await waitFor(() => getByRole('button', { name: 'Unlisted' })));
    fireEvent.press(await waitFor(() => getByRole('button', { name: 'Show results (1)' })));
    expect(await findByText(mockSharedLinks[1].title)).toBeTruthy();
    expect(queryByText(mockSharedLinks[0].title)).toBeNull();
  });

  it('supports title search and an empty result state', async () => {
    const { findByText, getByLabelText } = await renderWithProviders(<SharedLinksScreen />);
    fireEvent.changeText(getByLabelText('Search shared links'), 'unknown link');
    expect(await findByText('No links found')).toBeTruthy();
  });

  it('hides the URL strip and inline copy action on mobile while retaining card actions', async () => {
    const metrics = { width: 390, height: 844, scale: 1, fontScale: 1 };
    await act(async () => { Dimensions.set({ window: metrics, screen: metrics }); });
    const { queryByText, queryByRole, getByRole } = await renderWithProviders(<SharedLinksScreen />);
    expect(queryByText(mockSharedLinks[0].shortUrl!)).toBeNull();
    expect(queryByRole('button', { name: `Copy ${mockSharedLinks[0].title} URL` })).toBeNull();
    expect(getByRole('button', { name: `Share ${mockSharedLinks[0].title}` })).toBeTruthy();
    expect(getByRole('button', { name: `Actions for ${mockSharedLinks[0].title}` })).toBeTruthy();
  });

  it('also offers share and copy actions in the shared-link overflow menu', async () => {
    const { getByRole, findByRole, findByTestId } = await renderWithProviders(<SharedLinksScreen />);
    await fireEvent.press(getByRole('button', { name: `Actions for ${mockSharedLinks[0].title}` }));
    expect(await findByRole('button', { name: 'Share link' })).toBeTruthy();
    await fireEvent.press(await findByRole('button', { name: 'Copy link' }));
    expect(await findByTestId('toast')).toBeTruthy();
  });

  it('lets a broker edit profile-link sections and access settings', async () => {
    const profileLink = {
      id: 'test-profile-link', resourceType: 'profile' as const, includeProfile: true, includeProperties: true,
      title: 'Broker profile & portfolio', propertyName: 'Broker profile', location: 'Broker profile',
      status: 'active' as const, access: 'Unlisted' as const, shortUrl: 'estateflow.in/profile-test',
      areaLabel: 'Profile details · All active properties', priceLabel: 'Public details', mapLabel: 'Approximate',
      ownerLabel: 'Broker', documentLabel: 'Portfolio share', createdLabel: 'Created today', expiryLabel: 'No expiration',
    };
    mockSharedLinks.push(profileLink);
    try {
      const { getByRole, findByRole, findByLabelText, findByText } = await renderWithProviders(<SharedLinksScreen />);
      fireEvent.press(getByRole('button', { name: `Actions for ${profileLink.title}` }));
      fireEvent.press(await findByRole('button', { name: 'Edit profile link' }));
      expect(await findByText('Edit profile link')).toBeTruthy();
      expect(await findByLabelText('Include profile details')).toBeTruthy();
      expect(await findByLabelText('Include active property portfolio')).toBeTruthy();
      fireEvent.press(await findByRole('button', { name: `Choose what buyers can see for ${mockProperties[0].title}` }));
      expect(await findByLabelText(`${mockProperties[0].title}: Price`)).toBeTruthy();
      fireEvent.press(await findByLabelText('Include profile details'));
      fireEvent.press(getByRole('button', { name: 'Save changes' }));
      expect(await findByText('Shared link updated.')).toBeTruthy();
    } finally {
      mockSharedLinks.splice(mockSharedLinks.indexOf(profileLink), 1);
    }
  });

  it('offers a delete action in each shared link overflow menu', async () => {
    const { getByRole, findByRole } = await renderWithProviders(<SharedLinksScreen />);
    fireEvent.press(getByRole('button', { name: `Actions for ${mockSharedLinks[0].title}` }));
    expect(await findByRole('button', { name: 'Delete link' })).toBeTruthy();
  });

  it('announces the long-press action on each shared-link title', async () => {
    const { getAllByTestId } = await renderWithProviders(<SharedLinksScreen />);
    expect(getAllByTestId('shared-link-title-action').every((title) => title.props.accessibilityHint.includes('Long press'))).toBe(true);
  });

  it('keeps sharing one tap away and moves poster generation into the overflow menu', async () => {
    const { getByRole, findByText, queryByRole } = await renderWithProviders(<SharedLinksScreen />);
    expect(getByRole('button', { name: `Share ${mockSharedLinks[0].title}` })).toBeTruthy();
    expect(queryByRole('button', { name: `Generate poster for ${mockSharedLinks[0].title}` })).toBeNull();
    await fireEvent.press(getByRole('button', { name: `Actions for ${mockSharedLinks[0].title}` }));
    await fireEvent.press(await waitFor(() => getByRole('button', { name: 'Generate poster' })));
    expect(await findByText('Poster generation is not available yet.')).toBeTruthy();
  });

  it('opens the linked property and reports unavailable demo details without misrouting', async () => {
    mockPush.mockClear();
    const { getByRole, findByTestId } = await renderWithProviders(<SharedLinksScreen />);

    fireEvent.press(getByRole('button', { name: 'Open Green Valley Farm' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/properties/[id]',
      params: { id: mockSharedLinks[0].propertyId },
    });

    mockPush.mockClear();
    fireEvent.press(getByRole('button', { name: 'Open Highland Agri Orchard' }));
    expect(await findByTestId('toast')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

});
