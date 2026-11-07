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

  it('keeps the status in a chip and announces its loading state', async () => {
    const { getByLabelText } = await renderWithProviders(
      <StatusChip label="Active" tone="success" loading />,
    );

    expect(getByLabelText('Active, updating')).toBeTruthy();
    expect(getByLabelText('Updating property status')).toBeTruthy();
  });
});
