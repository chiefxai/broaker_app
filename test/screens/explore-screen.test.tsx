import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { useLocalProperties } from '@/data/database';
import { mockProperties } from '@/data/mock/properties';
import ExploreScreen from '@/screens/explore-screen';
import { renderWithProviders } from '../utils/render';
jest.mock('@expo/ui/swift-ui', () => jest.requireActual('../utils/mock-swift-menu'));
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

jest.mock('@/data/database', () => ({ useLocalProperties: jest.fn(), useDeleteProperty: () => jest.fn(async () => undefined) }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => undefined) }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  Link: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return typeof children === 'string' ? <Text>{children}</Text> : children;
  },
}));

const mockUseProperties = jest.mocked(useLocalProperties);
const initialWindow = Dimensions.get('window');
const initialScreen = Dimensions.get('screen');

afterEach(async () => {
  await act(async () => { Dimensions.set({ window: initialWindow, screen: initialScreen }); });
});

describe('ExploreScreen', () => {
  it('uses a shorter property image area on narrow screens', async () => {
    const metrics = { width: 390, height: 844, scale: 1, fontScale: 1 };
    await act(async () => { Dimensions.set({ window: metrics, screen: metrics }); });
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getAllByTestId } = await renderWithProviders(<ExploreScreen />);
    expect(StyleSheet.flatten(getAllByTestId('property-card-photo')[0].props.style).aspectRatio).toBeCloseTo(2.15);
  });
  it('offers Share and Generate and share from the property action', async () => {
    jest.mocked(require('expo-router').router.push).mockClear();
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByRole } = await renderWithProviders(<ExploreScreen />);
    await fireEvent.press(getByRole('button', { name: `Share ${mockProperties[0].title}` }));
    await fireEvent.press(getByRole('button', { name: 'Generate and share' }));
    expect(require('expo-router').router.push).toHaveBeenCalledWith({ pathname: '/shared-links', params: { generatePropertyId: mockProperties[0].id, shareAfterCreate: 'true' } });
  });
  it('refreshes properties when pulled down from the top', async () => {
    const refetch = jest.fn(async () => ({ data: mockProperties }));
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch } as never);
    const { getByTestId } = await renderWithProviders(<ExploreScreen />);
    await act(async () => { await getByTestId('property-list').props.refreshControl.props.onRefresh(); });
    expect(refetch).toHaveBeenCalledTimes(1);
  });
  it('fits one to four property cards per row based on the available list width', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByTestId, getAllByTestId } = await renderWithProviders(<ExploreScreen />);
    const list = getByTestId('property-list');

    fireEvent.layout(list, { width: 800, height: 600, x: 0, y: 0 });
    await waitFor(() => expect(StyleSheet.flatten(getAllByTestId('property-list-item')[0].props.style).width).toBeCloseTo(376));
    expect(StyleSheet.flatten(getAllByTestId('property-list-item')[0].props.style).minWidth).toBe(0);
    expect(StyleSheet.flatten(getAllByTestId('property-list-item')[0].props.style).flexGrow).toBe(0);

    fireEvent.layout(getByTestId('property-list'), { width: 1000, height: 600, x: 0, y: 0 });
    await waitFor(() => expect(StyleSheet.flatten(getAllByTestId('property-list-item')[0].props.style).width).toBeCloseTo(312));

    fireEvent.layout(getByTestId('property-list'), { width: 1500, height: 600, x: 0, y: 0 });
    await waitFor(() => expect(StyleSheet.flatten(getAllByTestId('property-list-item')[0].props.style).width).toBeCloseTo(320));

    fireEvent.layout(getByTestId('property-list'), { width: 380, height: 600, x: 0, y: 0 });
    await waitFor(() => expect(StyleSheet.flatten(getAllByTestId('property-list-item')[0].props.style).width).toBe('100%'));
  });

  it('renders stored properties and filters by title', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { findByText, getByLabelText, queryByText } = await renderWithProviders(<ExploreScreen />);

    expect(await findByText(mockProperties[0].title)).toBeTruthy();
    expect(queryByText('DEMO DATA · STORED LOCALLY')).toBeNull();
    fireEvent.changeText(getByLabelText('Search properties'), 'Green Valley');
    expect(await findByText(mockProperties[1].title)).toBeTruthy();
    expect(queryByText(mockProperties[0].title)).toBeNull();
  });

  it('shows a helpful empty state when nothing matches', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { findByText, getByLabelText } = await renderWithProviders(<ExploreScreen />);
    fireEvent.changeText(getByLabelText('Search properties'), 'does not exist');
    expect(await findByText('No matching properties')).toBeTruthy();
  });

  it('opens the property creation wizard from the floating add action', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByRole } = await renderWithProviders(<ExploreScreen />);
    fireEvent.press(getByRole('button', { name: 'Add property' }));
    expect(require('expo-router').router.push).toHaveBeenCalledWith('/properties/create');
  });

  it('opens the edit screen from each property overflow menu', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByRole, findByRole } = await renderWithProviders(<ExploreScreen />);
    await fireEvent.press(getByRole('button', { name: `Actions for ${mockProperties[0].title}` }));
    expect(await findByRole('button', { name: 'Open property' })).toBeTruthy();
    expect(await findByRole('button', { name: 'Archive property' })).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Edit property' }));
    await waitFor(() => expect(require('expo-router').router.push).toHaveBeenLastCalledWith({ pathname: '/properties/create', params: { propertyId: mockProperties[0].id } }));
  });

  it('keeps secondary property details available from the overflow menu', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByRole, findByRole, findByTestId } = await renderWithProviders(<ExploreScreen />);
    await fireEvent.press(getByRole('button', { name: `Actions for ${mockProperties[0].title}` }));
    await fireEvent.press(await findByRole('button', { name: 'Copy reference code' }));
    expect(await findByTestId('toast')).toBeTruthy();
    expect(require('expo-clipboard').setStringAsync).toHaveBeenCalledWith(mockProperties[0].referenceCode);
  });

  it('offers a share action in the property overflow menu', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByRole, findByRole } = await renderWithProviders(<ExploreScreen />);
    await fireEvent.press(getByRole('button', { name: `Actions for ${mockProperties[0].title}` }));
    expect(await findByRole('button', { name: 'Share property' })).toBeTruthy();
  });

  it('renders status filters and filters properties by status', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { findByText, getByLabelText, queryByText } = await renderWithProviders(<ExploreScreen />);

    expect(await findByText('All (2)')).toBeTruthy();
    fireEvent.press(getByLabelText('Available properties, 1'));
    expect(await findByText(mockProperties[0].title)).toBeTruthy();
    expect(queryByText(mockProperties[1].title)).toBeNull();
  });

  it('keeps status chips separate and opens the property filter sheet from the search container', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { findByText, getByRole, getByTestId } = await renderWithProviders(<ExploreScreen />);
    expect(getByTestId('search-filter-parent')).toBeTruthy();
    expect(await findByText('All (2)')).toBeTruthy();
    fireEvent.press(getByRole('button', { name: 'Filter options' }));
    expect(await findByText('Filter Properties')).toBeTruthy();
    expect(await findByText('Property Category')).toBeTruthy();
    expect(await findByText('Price Range')).toBeTruthy();
    expect(await findByText('Extent / Size')).toBeTruthy();
  });

  it('applies the selected price range from the filter sheet', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { findByText, getByRole, queryByText } = await renderWithProviders(<ExploreScreen />);
    fireEvent.press(getByRole('button', { name: 'Filter options' }));
    fireEvent.press(await waitFor(() => getByRole('button', { name: 'Under ₹15L' })));
    fireEvent.press(await waitFor(() => getByRole('button', { name: 'Show results (1)' })));
    expect(await findByText(mockProperties[1].title)).toBeTruthy();
    expect(queryByText(mockProperties[0].title)).toBeNull();
  });

  it('shows database loading and error states', async () => {
    mockUseProperties.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: jest.fn() } as never);
    const loadingView = await renderWithProviders(<ExploreScreen />);
    expect(await loadingView.findByLabelText('Loading property')).toBeTruthy();

    mockUseProperties.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch: jest.fn() } as never);
    const errorView = await renderWithProviders(<ExploreScreen />);
    expect(await errorView.findByText('Properties could not be loaded from this device.')).toBeTruthy();
  });

  it('keeps sorting in filters and opens a property without the extra controls below chips', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { findByRole, getByRole, getAllByRole, findByText, queryByRole, queryByText } = await renderWithProviders(<ExploreScreen />);
    expect(await findByText('Properties')).toBeTruthy();
    expect(queryByText('2 properties')).toBeNull();
    expect(queryByRole('button', { name: 'Sort properties' })).toBeNull();
    expect(queryByRole('button', { name: 'Show grid view' })).toBeNull();
    await fireEvent.press(getByRole('button', { name: 'Filter options' }));
    await fireEvent.press(await findByRole('button', { name: 'Price: Low to High' }));
    await fireEvent.press(getByRole('button', { name: 'Show results (2)' }));
    await fireEvent.press(getAllByRole('button', { name: `Open ${mockProperties[1].title}` })[0]);
    expect(require('expo-router').router.push).toHaveBeenCalledWith({ pathname: '/properties/[id]', params: { id: mockProperties[1].id } });
  });
});
