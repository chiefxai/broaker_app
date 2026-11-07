import type { PropertyWizardDraft } from './property-wizard';
import type { PriceBasis } from '@/components/core/wizard/PropertyFinancialsStep';

export const mockPropertyFinancials: Pick<PropertyWizardDraft, 'askingPrice' | 'minimumPrice' | 'area' | 'areaUnit' | 'negotiable' | 'advanceAmount' | 'outstandingLoan' | 'lendingBank'> & {
  loanActive: boolean;
  paymentMilestoneFlexible: boolean;
  priceBasis: PriceBasis;
} = {
  askingPrice: '3600000',
  minimumPrice: '3450000',
  area: '150',
  areaUnit: 'cent',
  negotiable: true,
  advanceAmount: '500000',
  outstandingLoan: '1250000',
  lendingBank: 'State Bank of India',
  loanActive: true,
  paymentMilestoneFlexible: true,
  priceBasis: 'acre',
};
