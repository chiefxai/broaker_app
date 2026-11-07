import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';

import { PropertyBasicsStep, type PropertyBasicsStepProps } from '@/components/core/wizard/PropertyBasicsStep';
import { mockPropertyBasics } from '@/data/mock/property-basics';
import { renderWithProviders } from '../utils/render';

function makeProps(overrides: Partial<PropertyBasicsStepProps> = {}): PropertyBasicsStepProps {
  return {
    ...mockPropertyBasics,
    isMockData: true,
    onTitleChange: jest.fn(), onDescriptionChange: jest.fn(), onCategoryChange: jest.fn(),
    onSecondaryUsesChange: jest.fn(), onIntentChange: jest.fn(), onListingReadinessChange: jest.fn(),
    ...overrides,
  };
}

describe('PropertyBasicsStep', () => {
  it('renders mock basics, categories, secondary uses and readiness score', async () => {
    const { getByTestId, getByText } = await renderWithProviders(<PropertyBasicsStep {...makeProps()} />);
    expect(getByTestId('property-basics-step')).toBeTruthy();
    expect(getByTestId('property-title').props.value).toBe(mockPropertyBasics.title);
    expect(getByTestId('property-category-agriculture').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('secondary-use-plots').props.accessibilityState.checked).toBe(true);
    expect(getByText('Listing Purpose & Intent')).toBeTruthy();
    expect(getByTestId('property-readiness-score')).toBeTruthy();
  });

  it('delegates suggestion, title clearing, category, intent and status interactions', async () => {
    const props = makeProps({ title: 'Current title' });
    const { getByTestId, getByLabelText, getByText } = await renderWithProviders(<PropertyBasicsStep {...props} />);
    await fireEvent.press(getByText('Riverfront Coconut Grove'));
    expect(props.onTitleChange).toHaveBeenCalledWith('Riverfront Coconut Grove');
    await fireEvent.press(getByLabelText('Clear property title'));
    expect(props.onTitleChange).toHaveBeenCalledWith('');
    await fireEvent.press(getByTestId('property-category-plots'));
    expect(props.onCategoryChange).toHaveBeenCalledWith('plots');
    await fireEvent.press(getByTestId('transaction-joint_venture'));
    expect(props.onIntentChange).toHaveBeenCalledWith('joint_venture');
    await fireEvent.press(getByTestId('listing-readiness-active'));
    expect(props.onListingReadinessChange).toHaveBeenCalledWith('active');
  });

  it('keeps secondary use multi-select controlled', async () => {
    const props = makeProps({ secondaryUses: ['plots'] });
    const { getByTestId } = await renderWithProviders(<PropertyBasicsStep {...props} />);
    await fireEvent.press(getByTestId('secondary-use-house'));
    expect(props.onSecondaryUsesChange).toHaveBeenCalledWith(['plots', 'house']);
    await fireEvent.press(getByTestId('secondary-use-plots'));
    expect(props.onSecondaryUsesChange).toHaveBeenCalledWith([]);
  });
});
