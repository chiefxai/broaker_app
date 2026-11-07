import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';

import { PropertyFinancialsStep, type PropertyFinancialsStepProps } from '@/components/core/wizard/PropertyFinancialsStep';
import { pricePerUnit, sanitizeAreaInput, toAreaConversions } from '@/components/core/wizard/property-financials/measurement';
import { renderWithProviders } from '../utils/render';

function makeProps(overrides: Partial<PropertyFinancialsStepProps> = {}): PropertyFinancialsStepProps {
  return {
    askingPrice: '3600000', minimumPrice: '3450000', area: '150', areaUnit: 'cent', negotiable: true,
    advanceAmount: '500000', outstandingLoan: '1250000', lendingBank: 'State Bank of India', loanActive: true,
    paymentMilestoneFlexible: true, priceBasis: 'acre', milestoneControlAvailable: true, secondaryAreaAvailable: false,
    onAskingPriceChange: jest.fn(), onMinimumPriceChange: jest.fn(), onAreaChange: jest.fn(), onAreaUnitChange: jest.fn(),
    onNegotiableChange: jest.fn(), onPriceBasisChange: jest.fn(), onAdvanceAmountChange: jest.fn(), onLoanActiveChange: jest.fn(),
    onOutstandingLoanChange: jest.fn(), onLendingBankChange: jest.fn(), onPaymentMilestoneFlexibleChange: jest.fn(),
    ...overrides,
  };
}

describe('property financials measurement', () => {
  it('converts stable units and leaves locality-dependent units unavailable', () => {
    expect(toAreaConversions('150', 'cent')).toMatchObject({ acres: 1.5, cents: 150, squareFeet: 65340, grounds: 27.225 });
    expect(toAreaConversions(1, 'kuli')).toBeNull();
    expect(toAreaConversions('', 'acre')).toBeNull();
  });

  it('calculates rates from the total price and converted area', () => {
    expect(pricePerUnit('3600000', '150', 'cent', 'acre')).toBe(2400000);
    expect(pricePerUnit('3600000', '150', 'cent', 'cent')).toBe(24000);
    expect(pricePerUnit('0', '150', 'cent', 'acre')).toBeNull();
  });

  it('sanitizes area input to a single decimal separator', () => {
    expect(sanitizeAreaInput('1,2a.3.4')).toBe('12.34');
  });
});

describe('PropertyFinancialsStep', () => {
  it('renders price, area, loan and API capability states', async () => {
    const { getByTestId, getByText } = await renderWithProviders(<PropertyFinancialsStep {...makeProps({ milestoneControlAvailable: false })} />);
    expect(getByTestId('property-financials-step')).toBeTruthy();
    expect(getByTestId('price-basis-acre')).toBeTruthy();
    expect(getByTestId('property-asking-price')).toBeTruthy();
    expect(getByText('NOC and deed-release details are not captured by the current API.')).toBeTruthy();
    expect(getByText('Payment milestone preferences are not stored by the current API.')).toBeTruthy();
  });

  it('delegates basis changes and hides private floor when price is not negotiable', async () => {
    const props = makeProps({ negotiable: false });
    const { getByTestId, queryByTestId } = await renderWithProviders(<PropertyFinancialsStep {...props} />);
    expect(queryByTestId('property-minimum-price')).toBeNull();
    await fireEvent.press(getByTestId('price-basis-cent'));
    expect(props.onPriceBasisChange).toHaveBeenCalledWith('cent');
  });

  it('lets the user clear an optional price basis radio selection', async () => {
    const props = makeProps();
    const { getByLabelText } = await renderWithProviders(<PropertyFinancialsStep {...props} />);
    await fireEvent.press(getByLabelText('Clear price basis selection'));
    expect(props.onPriceBasisChange).toHaveBeenCalledWith(null);
  });

  it('marks required price and area inputs with accessible field errors', async () => {
    const { getAllByRole, getByTestId } = await renderWithProviders(<PropertyFinancialsStep {...makeProps({ askingPriceError: 'Enter a total asking price greater than ₹0.', areaError: 'Enter a primary area greater than 0.' })} />);
    expect(getAllByRole('alert')).toHaveLength(2);
    expect(getByTestId('property-asking-price')).toBeTruthy();
    expect(getByTestId('property-area')).toBeTruthy();
  });

  it('keeps secondary area unavailable until supported by the parent/API', async () => {
    const { getByTestId } = await renderWithProviders(<PropertyFinancialsStep {...makeProps()} />);
    expect(getByTestId('add-secondary-area').props.accessibilityState.disabled).toBe(true);
  });
});
