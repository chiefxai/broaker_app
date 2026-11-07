import { afterEach, describe, expect, it, jest } from '@jest/globals';

import HomeScreen from '@/screens/home-screen';
import { mockProperties } from '@/data/mock/properties';
import { useLocalProperties } from '@/data/database';
import { act, fireEvent } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';
import { renderWithProviders } from '../utils/render';

jest.mock('@/data/database', () => ({ useLocalProperties: jest.fn(), useDeleteProperty: () => jest.fn(async () => undefined) }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return typeof children === 'string' ? <Text>{children}</Text> : children;
  },
  useRouter: () => ({ push: mockPush }),
}));

const mockUseProperties = jest.mocked(useLocalProperties);
const initialWindow = Dimensions.get('window');
const initialScreen = Dimensions.get('screen');

async function setWindowSize(width: number, height: number) {
  const metrics = { width, height, scale: 1, fontScale: 1 };
  await act(async () => { Dimensions.set({ window: metrics, screen: metrics }); });
}

describe('HomeScreen', () => {
  afterEach(async () => {
    await act(async () => { Dimensions.set({ window: initialWindow, screen: initialScreen }); });
  });

  it('matches the home reference with quick actions, portfolio metrics, and recent listings', async () => {
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { findByText, getByText, getByLabelText, getByRole } = await renderWithProviders(<HomeScreen />);

    expect(await findByText('Welcome back.')).toBeTruthy();
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('YOUR PROPERTY WORKSPACE')).toBeTruthy();
    expect(getByText('PORTFOLIO STATUS')).toBeTruthy();
    expect(getByText('Recently added')).toBeTruthy();
    const addPropertyButton = getByRole('button', { name: 'Add property' });
    expect(StyleSheet.flatten(addPropertyButton.props.style).backgroundColor).toBe('#16803C');
    expect(getByRole('button', { name: 'Browse' })).toBeTruthy();
    expect(getByRole('button', { name: 'Manage share links' })).toBeTruthy();
    expect(getByLabelText('Portfolio metrics')).toBeTruthy();
    expect(getByLabelText('All properties, 2')).toBeTruthy();
    expect(getByLabelText('Available, 1')).toBeTruthy();
    expect(getByLabelText('On hold, 1')).toBeTruthy();
    expect(getByLabelText('Sold, 0')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText(mockProperties[0].title)).toBeTruthy();
  });

  it('routes the home browse and share actions to their pages', async () => {
    mockPush.mockClear();
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByRole } = await renderWithProviders(<HomeScreen />);

    await fireEvent.press(getByRole('button', { name: 'Browse' }));
    expect(mockPush).toHaveBeenCalledWith('/explore');
    await fireEvent.press(getByRole('button', { name: 'Manage share links' }));
    expect(mockPush).toHaveBeenCalledWith('/shared-links');
  });

  it('refreshes home data when pulled down from the top', async () => {
    const refetch = jest.fn(async () => ({ data: mockProperties }));
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch } as never);
    const { getByTestId } = await renderWithProviders(<HomeScreen />);
    await act(async () => { await getByTestId('home-scroll').props.refreshControl.props.onRefresh(); });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('routes Add property to the property creation flow', async () => {
    mockPush.mockClear();
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByRole } = await renderWithProviders(<HomeScreen />);
    await fireEvent.press(getByRole('button', { name: 'Add property' }));
    expect(mockPush).toHaveBeenCalledWith('/properties/create');
  });

  it('shows a loading state while local records are read', async () => {
    mockUseProperties.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: jest.fn() } as never);
    const { findByLabelText } = await renderWithProviders(<HomeScreen />);
    expect(await findByLabelText('Loading property')).toBeTruthy();
  });

  it('offers a retry when the database query fails', async () => {
    const refetch = jest.fn();
    mockUseProperties.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch } as never);
    const { findByText, getByRole } = await renderWithProviders(<HomeScreen />);
    expect(await findByText('Your local properties could not be loaded.')).toBeTruthy();
    fireEvent.press(getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('uses a desktop dashboard grid with full-width portfolio metrics', async () => {
    await setWindowSize(1280, 900);
    mockUseProperties.mockReturnValue({ data: mockProperties, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByTestId } = await renderWithProviders(<HomeScreen />);

    expect(getByTestId('home-desktop-layout')).toBeTruthy();
    expect(getByTestId('home-metrics-wide')).toBeTruthy();
  });
});
