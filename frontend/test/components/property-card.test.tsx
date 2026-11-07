import { fireEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { PropertyCard } from '@/components/core';
import { propertyCardErrorFixture, propertyCardFixtures } from '../fixtures/core-components';
import { renderWithProviders } from '../utils/render';
jest.mock('@expo/ui/swift-ui', () => jest.requireActual('../utils/mock-swift-menu'));

describe('PropertyCard', () => {
  it('limits long property text while keeping the full title in the open action', async () => {
    const property = { ...propertyCardFixtures[0], title: 'A very long property title '.repeat(8), location: 'A very long location '.repeat(8), referenceCode: 'REFERENCE'.repeat(12) };
    const { getByText, getAllByRole, queryByText } = await renderWithProviders(<PropertyCard property={property} onOpenProperty={jest.fn()} />);

    expect(getByText(property.title).props).toMatchObject({ numberOfLines: 2, ellipsizeMode: 'tail' });
    expect(getByText(property.location).props).toMatchObject({ numberOfLines: 1, ellipsizeMode: 'tail' });
    expect(queryByText(property.referenceCode)).toBeNull();
    expect(getAllByRole('button', { name: `Open ${property.title}` })).toHaveLength(2);
  });

  it('renders property view data and opens the property from its title or photo', async () => {
    const onOpenProperty = jest.fn();
    const property = propertyCardFixtures[0];
    const { getByText, getAllByRole } = await renderWithProviders(
      <PropertyCard property={property} onOpenProperty={onOpenProperty} />,
    );

    expect(getByText(property.title)).toBeTruthy();
    expect(getByText('150 cent')).toBeTruthy();
    expect(getByText('₹24,00,000')).toBeTruthy();
    expect(getByText('Sample Village, Tirunelveli')).toBeTruthy();

    await fireEvent.press(getAllByRole('button', { name: `Open ${property.title}` })[0]);
    expect(onOpenProperty).toHaveBeenCalledTimes(1);
    expect(getByText(property.title)).toBeTruthy();
  });

  it('shows the active status chip with a loading indicator while the property is syncing', async () => {
    const property = { ...propertyCardFixtures[0], status: { label: 'Active', tone: 'success' as const }, syncStatus: 'syncing' as const };
    const { getByLabelText } = await renderWithProviders(<PropertyCard property={property} />);

    expect(getByLabelText('Active, updating')).toBeTruthy();
    expect(getByLabelText('Updating property status')).toBeTruthy();
  });

  it('uses safe fallbacks for missing image, location, and price', async () => {
    const property = { ...propertyCardFixtures[1], priceInr: null };
    const { getByText, getByLabelText } = await renderWithProviders(<PropertyCard property={property} />);

    expect(getByLabelText('Property image unavailable')).toBeTruthy();
    expect(getByText('Location not added')).toBeTruthy();
    expect(getByText('Price not added')).toBeTruthy();
  });

  it('renders loading and retryable error states', async () => {
    const onRetry = jest.fn();
    const loading = await renderWithProviders(<PropertyCard state="loading" />);
    expect(loading.getByLabelText('Loading property')).toBeTruthy();
    expect(loading.getByTestId('property-card-skeleton-image')).toBeTruthy();
    await loading.unmount();

    const error = await renderWithProviders(
      <PropertyCard state="error" {...propertyCardErrorFixture} onRetry={onRetry} />,
    );
    expect(error.getByText('Could not load this property.')).toBeTruthy();
    await fireEvent.press(error.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the card focused while preserving the photo count, share action, and overflow actions', async () => {
    const onShare = jest.fn();
    const property = { ...propertyCardFixtures[0], referenceCode: 'PRO-2026-F92AC30C', photoCount: 6 };
    const { getByText, getByRole, queryByRole, queryByText } = await renderWithProviders(<PropertyCard property={property} onShare={onShare} menuItems={[{ id: 'edit', label: 'Edit property', icon: 'edit', onPress: jest.fn() }]} />);

    expect(queryByText('PRO-2026-F92AC30C')).toBeNull();
    expect(getByText('6 photos')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: `Share ${property.title}` }));
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(queryByRole('button', { name: 'Media' })).toBeNull();
    expect(queryByRole('button', { name: 'View details' })).toBeNull();
    expect(getByRole('button', { name: `Actions for ${property.title}` })).toBeTruthy();
  });

  it('keeps the photo action and overflow menu as independent controls', async () => {
    const onOpenProperty = jest.fn();
    const onEdit = jest.fn();
    const property = propertyCardFixtures[0];
    const { getAllByRole, getByRole } = await renderWithProviders(
      <PropertyCard
        property={property}
        onOpenProperty={onOpenProperty}
        menuItems={[{ id: 'edit', label: 'Edit property', icon: 'edit', onPress: onEdit }]}
      />,
    );

    await fireEvent.press(getAllByRole('button', { name: `Open ${property.title}` })[0]);
    expect(onOpenProperty).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();

    await fireEvent.press(getByRole('button', { name: `Actions for ${property.title}` }));
    await fireEvent.press(getByRole('button', { name: 'Edit property' }));
    await waitFor(() => expect(onEdit).toHaveBeenCalledTimes(1));
    expect(onOpenProperty).toHaveBeenCalledTimes(1);
  });

  it('announces the long-press action on the property title', async () => {
    const property = propertyCardFixtures[0];
    const { getByTestId } = await renderWithProviders(
      <PropertyCard property={property} onOpenProperty={jest.fn()} menuItems={[{ id: 'edit', label: 'Edit property', icon: 'edit', onPress: jest.fn() }]} />,
    );
    expect(getByTestId('property-card-title-action').props.accessibilityHint).toContain('Long press');
  });
});
