import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';

import { FeaturesUtilitiesStep, type FeaturesUtilitiesStepProps } from '@/components/core/wizard/FeaturesUtilitiesStep';
import { featuresUtilitiesReferenceFixture } from '../fixtures/features-utilities';
import { renderWithProviders } from '../utils/render';

function makeProps(overrides: Partial<FeaturesUtilitiesStepProps> = {}): FeaturesUtilitiesStepProps {
  return {
    soilType: 'red', soilTypeOther: '', waterTdsPpm: '', waterSources: [], utilities: [], agronomistNotes: '', irrigationMethod: null,
    onSoilTypeChange: jest.fn(), onSoilTypeOtherChange: jest.fn(), onWaterTdsChange: jest.fn(), onWaterSourcesChange: jest.fn(),
    onUtilitiesChange: jest.fn(), onAgronomistNotesChange: jest.fn(), onIrrigationMethodChange: jest.fn(),
    ...overrides,
  };
}

describe('FeaturesUtilitiesStep', () => {
  it('shows step 3 progress, soil choices, water sources, infrastructure and irrigation controls', async () => {
    const { getByText, getByRole, getByTestId } = await renderWithProviders(<FeaturesUtilitiesStep {...makeProps()} />);

    expect(getByText('STEP 3 OF 6')).toBeTruthy();
    expect(getByTestId('features-progressbar')).toBeTruthy();
    expect(getByText('Soil & Agronomy Profile')).toBeTruthy();
    expect(getByTestId('water-source-government_supply')).toBeTruthy();
    expect(getByRole('switch', { name: 'Fully Fenced Perimeter' })).toBeTruthy();
    expect(getByTestId('irrigation-drip')).toBeTruthy();
  });

  it('sends accessible selection changes to the caller', async () => {
    const props = makeProps();
    const { getByTestId } = await renderWithProviders(<FeaturesUtilitiesStep {...props} />);

    await fireEvent.press(getByTestId('soil-option-other'));
    await fireEvent.press(getByTestId('tds-150'));
    await fireEvent.press(getByTestId('water-source-borewell'));
    await fireEvent.press(getByTestId('irrigation-sprinkler'));

    expect(props.onSoilTypeChange).toHaveBeenCalledWith('other');
    expect(props.onWaterTdsChange).toHaveBeenCalledWith('150');
    expect(props.onWaterSourcesChange).toHaveBeenCalledWith(['borewell']);
    expect(props.onIrrigationMethodChange).toHaveBeenCalledWith('sprinkler');
  });

  it('reveals custom soil input and keeps selected values reflected in accessible state', async () => {
    const { getByTestId, getByRole } = await renderWithProviders(<FeaturesUtilitiesStep {...makeProps({ soilType: 'other', waterTdsPpm: '100', waterSources: ['river'] })} />);

    expect(getByTestId('property-soil-other')).toBeTruthy();
    expect(getByRole('radio', { name: 'Other Custom Mix / Clay' }).props.accessibilityState).toEqual({ checked: true });
    expect(getByRole('button', { name: 'Water TDS at most 100 parts per million' }).props.accessibilityState).toEqual({ selected: true });
    expect(getByRole('checkbox', { name: 'River / Canal Frontage' }).props.accessibilityState).toEqual({ checked: true });
  });

  it('renders lab, water source and infrastructure details from typed reference data', async () => {
    const { getByText, getByRole } = await renderWithProviders(<FeaturesUtilitiesStep {...makeProps(featuresUtilitiesReferenceFixture)} />);

    expect(getByText('Lab Verified')).toBeTruthy();
    expect(getByText('6.2 ft Deep')).toBeTruthy();
    expect(getByText('Grade A · High Nitrogen')).toBeTruthy();
    expect(getByText('0.82% (Optimal)')).toBeTruthy();
    expect(getByText('Nutrient Rich Profile: Red Ferruginous')).toBeTruthy();
    expect(getByText('TDS recorded')).toBeTruthy();
    expect(getByText('1 Active · 450 ft')).toBeTruthy();
    expect(getByText('5 Active Systems')).toBeTruthy();
    expect(getByRole('radio', { name: 'Auto Drip, Installed' }).props.accessibilityState.checked).toBe(true);
  });
});
