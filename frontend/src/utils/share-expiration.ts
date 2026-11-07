import type { ApiDefaultExpirationDays } from '@/api/backend-api';

const DAY_MS = 24 * 60 * 60 * 1000;

export function getDefaultExpirationDateInput(days: ApiDefaultExpirationDays | undefined, now = Date.now()) {
  return days == null ? '' : new Date(now + days * DAY_MS).toISOString().slice(0, 10);
}

export function getDefaultExpirationTimestamp(days: ApiDefaultExpirationDays | undefined, now = Date.now()) {
  const date = getDefaultExpirationDateInput(days, now);
  return date ? `${date}T23:59:59.000Z` : null;
}
