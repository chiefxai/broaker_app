import { describe, expect, it } from '@jest/globals';

import { AppHeader } from '@/components/core';
import { renderWithProviders } from '../utils/render';

describe('AppHeader', () => {
  it('renders the brand, workspace label, and accessible theme control', async () => {
    const { findByText, getByTestId } = await renderWithProviders(<AppHeader />);
    expect(await findByText('Broaker')).toBeTruthy();
    expect(await findByText('Solo Broker')).toBeTruthy();
    expect(await findByText('MOCK')).toBeTruthy();
    expect(getByTestId('theme-toggle')).toBeTruthy();
  });
});
