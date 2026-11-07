export interface AreaValue {
  value: number;
  unit: string;
}

export function formatInr(amount: number | null | undefined) {
  if (amount == null || !Number.isSafeInteger(amount) || amount < 0) return '—';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatArea(area: AreaValue | null | undefined) {
  if (!area || !Number.isFinite(area.value) || area.value < 0 || !area.unit.trim()) return null;

  const value = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(area.value);
  return `${value} ${area.unit.trim()}`;
}
