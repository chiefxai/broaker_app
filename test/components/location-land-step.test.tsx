import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, within } from '@testing-library/react-native';

import { LocationLandStep, type LocationLandStepProps } from '@/components/core/wizard/LocationLandStep';
import { propertyWizardDraftFixture } from '../fixtures/property-wizard';
import { renderWithProviders } from '../utils/render';

function makeProps(overrides: Partial<LocationLandStepProps> = {}): LocationLandStepProps {
  return {
    location: propertyWizardDraftFixture.location,
    titleClassification: propertyWizardDraftFixture.titleClassification,
    onLocationChange: jest.fn(),
    onTitleClassificationChange: jest.fn(),
    onDetectLocation: jest.fn(),
    onCoordinateSelect: jest.fn(),
    ...overrides,
  };
}

describe('LocationLandStep', () => {
  it('renders location, cadastral, frontage, and access sections with step 2 progress', async () => {
    const { getByTestId, getByText } = await renderWithProviders(<LocationLandStep {...makeProps()} />);

    expect(getByTestId('location-progressbar')).toBeTruthy();
    expect(getByText('Geographic Address & GPS')).toBeTruthy();
    expect(getByText('Cadastral Survey & Classification')).toBeTruthy();
    expect(getByText('Dimensions & Frontage')).toBeTruthy();
    expect(getByText('Road Connectivity & Access')).toBeTruthy();
    expect(getByText(/tap the map once to place or move the pin, and swipe to explore/i)).toBeTruthy();
  });

  it('captures selection and field changes through typed callbacks', async () => {
    const props = makeProps();
    const { getByTestId } = await renderWithProviders(<LocationLandStep {...props} />);

    await fireEvent.press(getByTestId('frontage-north'));
    await fireEvent.press(getByTestId('road-width-40'));
    await fireEvent.press(getByTestId('road-type-metal_road'));
    await fireEvent.press(getByTestId('road-subdivision-sketch'));
    await fireEvent.press(getByTestId('highway-distance-1'));
    await fireEvent.press(getByTestId('detect-gps-pin'));

    expect(props.onLocationChange).toHaveBeenCalledWith('frontageDirection', 'North');
    expect(props.onLocationChange).toHaveBeenCalledWith('roadWidthFt', '40');
    expect(props.onLocationChange).toHaveBeenCalledWith('roadAccessType', 'metal_road');
    expect(props.onLocationChange).toHaveBeenCalledWith('roadSubdivisionBasis', 'sketch_path');
    expect(props.onLocationChange).toHaveBeenCalledWith('highwayDistanceKm', '1');
    expect(props.onDetectLocation).toHaveBeenCalledTimes(1);
  });

  it('opens a dedicated map overlay for accurate pin placement and closes back to the form', async () => {
    const props = makeProps({ location: { ...propertyWizardDraftFixture.location, pincode: '627001', taluk: 'Ambasamudram' } });
    const { getByTestId, getByText, getByLabelText, queryByTestId } = await renderWithProviders(<LocationLandStep {...props} />);

    expect(queryByTestId('property-map-overlay')).toBeNull();
    await fireEvent.press(getByTestId('expand-location-map'));
    expect(getByTestId('property-map-overlay')).toBeTruthy();
    expect(getByText('Choose property location')).toBeTruthy();
    expect(getByText(/Tap once to move the pin/)).toBeTruthy();
    await fireEvent.press(getByLabelText('Show location details'));
    expect(getByText('Current address')).toBeTruthy();
    const details = within(getByTestId('map-location-details'));
    expect(details.getByText('627001')).toBeTruthy();
    expect(details.getAllByText('Ambasamudram').length).toBeGreaterThan(0);
    expect(details.getAllByText('Tirunelveli').length).toBeGreaterThan(0);
    expect(details.getByText('Tamil Nadu')).toBeTruthy();
    expect(getByTestId('close-expanded-location-map')).toBeTruthy();
    await fireEvent.press(getByTestId('close-expanded-location-map'));
    expect(queryByTestId('property-map-overlay')).toBeNull();
  });

  it('keeps GPS and assignment state honest and exposes location errors accessibly', async () => {
    const props = makeProps({ location: { ...propertyWizardDraftFixture.location, latitude: '', longitude: '', assignmentLand: true }, detectLocationError: 'Location permission was not granted.' });
    const { getByRole, getByText } = await renderWithProviders(<LocationLandStep {...props} />);

    expect(getByRole('switch', { name: 'Assignment or Patta land' }).props.value).toBe(true);
    expect(getByText('Location permission was not granted.')).toBeTruthy();
    expect(getByText('GPS pin not set')).toBeTruthy();
  });
});
