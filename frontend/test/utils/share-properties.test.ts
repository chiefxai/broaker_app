import { describe, expect, it } from '@jest/globals';

import { isActivePropertyStatus } from '@/utils/share-properties';

describe('active property status', () => {
  it('allows active listings and excludes saved drafts', () => {
    expect(isActivePropertyStatus('draft')).toBe(false);
    expect(isActivePropertyStatus('Active')).toBe(true);
    expect(isActivePropertyStatus('Available')).toBe(true);
  });

  it('keeps archived and unknown statuses out of the property picker', () => {
    expect(isActivePropertyStatus('archived')).toBe(false);
    expect(isActivePropertyStatus('hold')).toBe(false);
  });
});
