import type { MeasurementUnit } from './measurement';

export type PriceBasis = 'acre' | 'cent' | 'sq_ft' | 'total';

export interface PropertyFinancialsStepProps {
  askingPrice: string;
  minimumPrice: string;
  area: string;
  areaUnit: MeasurementUnit;
  negotiable: boolean;
  advanceAmount: string;
  outstandingLoan: string;
  lendingBank: string;
  loanActive: boolean;
  paymentMilestoneFlexible: boolean;
  priceBasis: PriceBasis | null;
  askingPriceError?: string;
  areaError?: string;
  milestoneControlAvailable?: boolean;
  secondaryAreaAvailable?: boolean;
  onAskingPriceChange: (value: string) => void;
  onMinimumPriceChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onAreaUnitChange: (value: MeasurementUnit) => void;
  onNegotiableChange: (value: boolean) => void;
  onPriceBasisChange: (value: PriceBasis | null) => void;
  onAdvanceAmountChange: (value: string) => void;
  onLoanActiveChange: (value: boolean) => void;
  onOutstandingLoanChange: (value: string) => void;
  onLendingBankChange: (value: string) => void;
  onPaymentMilestoneFlexibleChange: (value: boolean) => void;
  onAddSecondaryArea?: () => void;
  testID?: string;
}
