import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { mockProperties } from '@/data/mock/properties';
import { useLocalProperty } from '@/data/database';
import PropertyDetailsScreen from '@/screens/property-details-screen';
import { renderWithProviders } from '../utils/render';

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('@/data/database', () => ({ useLocalProperty: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, canGoBack: () => true, replace: mockReplace }),
  useLocalSearchParams: () => ({ id: '4a83e9c8-7643-4cbe-9e32-a7fa042aa5c0' }),
}));

const mockUseProperty = jest.mocked(useLocalProperty);

describe('PropertyDetailsScreen', () => {
  it('renders property description, gallery, and facts', async () => {
    mockUseProperty.mockReturnValue({ data: mockProperties[0], isPending: false, isError: false, refetch: jest.fn() } as never);
    const { findByText, getAllByLabelText } = await renderWithProviders(<PropertyDetailsScreen />);

    expect(await findByText(mockProperties[0].title)).toBeTruthy();
    expect(await findByText('About this property')).toBeTruthy();
    expect(await findByText('Property specifications')).toBeTruthy();
    expect(await findByText('Field media')).toBeTruthy();
    expect(await findByText('Property documents')).toBeTruthy();
    expect(await findByText('Pattadhar Passbook Copy')).toBeTruthy();
    expect(await findByText('Marcus Vance')).toBeTruthy();
    expect(await findByText(/Exact survey coordinates remain private/)).toBeTruthy();
    expect(getAllByLabelText('Riverside farm from the entrance').length).toBeGreaterThan(0);
  });

  it('keeps the property ID close to the photo gallery on mobile', async () => {
    mockUseProperty.mockReturnValue({ data: mockProperties[0], isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByTestId } = await renderWithProviders(<PropertyDetailsScreen />);
    expect(StyleSheet.flatten(getByTestId('property-media-heading-group').props.style).gap).toBe(16);
  });

  it('shows a not-found state for an unknown local property', async () => {
    mockUseProperty.mockReturnValue({ data: null, isPending: false, isError: false, refetch: jest.fn() } as never);
    const { findByText } = await renderWithProviders(<PropertyDetailsScreen />);
    expect(await findByText('This property is not available on this device.')).toBeTruthy();
  });

  it('supports back navigation', async () => {
    mockBack.mockClear();
    mockUseProperty.mockReturnValue({ data: mockProperties[0], isPending: false, isError: false, refetch: jest.fn() } as never);
    const { getByRole } = await renderWithProviders(<PropertyDetailsScreen />);
    fireEvent.press(getByRole('button', { name: 'Go back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
