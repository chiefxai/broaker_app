import { fireEvent } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { PortfolioKpiCard } from '@/components/core';
import { portfolioKpiFixture } from '../fixtures/core-components';
import { renderWithProviders } from '../utils/render';

describe('PortfolioKpiCard', () => {
  it('renders the provided metric data without owning its source', async () => {
    const { getByText } = await renderWithProviders(<PortfolioKpiCard {...portfolioKpiFixture} />);

    expect(getByText('2')).toBeTruthy();
    expect(getByText('All properties')).toBeTruthy();
    expect(getByText('Total')).toBeTruthy();
  });

  it('shows a loading state instead of stale data', async () => {
    const { getByLabelText, getByTestId, queryByText } = await renderWithProviders(
      <PortfolioKpiCard label="All properties" icon="apartment" state="loading" value={42} />,
    );

    expect(getByLabelText('Loading All properties')).toBeTruthy();
    expect(getByTestId('portfolio-kpi-value-skeleton')).toBeTruthy();
    expect(queryByText('42')).toBeNull();
  });

  it('shows an error and offers retry when supplied', async () => {
    const onRetry = jest.fn();
    const { getByText, getByRole } = await renderWithProviders(
      <PortfolioKpiCard label="Available" icon="verified" state="error" onRetry={onRetry} />,
    );

    expect(getByText('Could not load this metric.')).toBeTruthy();
    await fireEvent.press(getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
