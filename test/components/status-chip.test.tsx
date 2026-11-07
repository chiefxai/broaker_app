import { describe, expect, it } from '@jest/globals';

import { StatusChip } from '@/components/core';
import { renderWithProviders } from '../utils/render';

describe('StatusChip', () => {
  it('renders its caller-provided label and accessibility text', async () => {
    const { getByRole } = await renderWithProviders(
      <StatusChip label="Available" tone="success" icon="verified" />,
    );

    expect(getByRole('text', { name: 'Available' })).toBeTruthy();
  });
});
