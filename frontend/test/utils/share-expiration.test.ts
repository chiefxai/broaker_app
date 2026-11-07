import { describe, expect, it } from '@jest/globals';
import { getDefaultExpirationDateInput, getDefaultExpirationTimestamp } from '@/utils/share-expiration';

describe('share expiration defaults', () => {
  it('converts the configured duration into the date picker value and end-of-day UTC timestamp', () => {
    const now = Date.parse('2026-11-06T08:00:00.000Z');
    expect(getDefaultExpirationDateInput(7, now)).toBe('2026-11-13');
    expect(getDefaultExpirationTimestamp(7, now)).toBe('2026-11-13T23:59:59.000Z');
  });

  it('leaves expiry blank when no default is configured', () => {
    expect(getDefaultExpirationDateInput(null, Date.parse('2026-11-06T08:00:00.000Z'))).toBe('');
    expect(getDefaultExpirationTimestamp(null, Date.parse('2026-11-06T08:00:00.000Z'))).toBeNull();
  });
});
