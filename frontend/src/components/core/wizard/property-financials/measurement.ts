export type MeasurementUnit = 'cent' | 'acre' | 'sq_ft' | 'sq_m' | 'ground' | 'kuli' | 'ma' | 'veli';

export const MEASUREMENT_UNITS: { value: MeasurementUnit; label: string }[] = [
  { value: 'cent', label: 'Cents' },
  { value: 'acre', label: 'Acres' },
  { value: 'sq_ft', label: 'Sq Ft' },
  { value: 'sq_m', label: 'Sq M' },
  { value: 'ground', label: 'Grounds' },
  { value: 'kuli', label: 'Kuli' },
  { value: 'ma', label: 'Ma' },
  { value: 'veli', label: 'Veli' },
];

// These units have stable definitions. Kuli, ma, and veli vary by locality and are left unconverted.
const SQUARE_FEET_PER_UNIT: Partial<Record<MeasurementUnit, number>> = {
  cent: 435.6,
  acre: 43_560,
  sq_ft: 1,
  sq_m: 10.7639104167,
  ground: 2_400,
};

export interface AreaConversions {
  acres: number;
  cents: number;
  squareFeet: number;
  squareMeters: number;
  grounds: number;
}

export function sanitizeAreaInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...decimalParts] = cleaned.split('.');
  return decimalParts.length ? `${whole}.${decimalParts.join('')}` : whole;
}

export function toAreaConversions(value: string | number, unit: MeasurementUnit): AreaConversions | null {
  const amount = typeof value === 'number' ? value : Number(value.trim());
  const factor = SQUARE_FEET_PER_UNIT[unit];
  if (!Number.isFinite(amount) || amount <= 0 || factor === undefined) return null;
  const squareFeet = amount * factor;
  return {
    squareFeet,
    acres: squareFeet / SQUARE_FEET_PER_UNIT.acre!,
    cents: squareFeet / SQUARE_FEET_PER_UNIT.cent!,
    squareMeters: squareFeet / SQUARE_FEET_PER_UNIT.sq_m!,
    grounds: squareFeet / SQUARE_FEET_PER_UNIT.ground!,
  };
}

export function formatArea(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits, minimumFractionDigits: 0 }).format(value);
}

export function formatRupees(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits, minimumFractionDigits: 0 }).format(value);
}

export function pricePerUnit(totalPrice: string | number, area: string | number, unit: MeasurementUnit, basis: 'acre' | 'cent' | 'sq_ft'): number | null {
  const price = typeof totalPrice === 'number' ? totalPrice : Number(totalPrice.trim());
  const conversions = toAreaConversions(area, unit);
  if (!Number.isFinite(price) || price <= 0 || !conversions) return null;
  const denominator = basis === 'acre' ? conversions.acres : basis === 'cent' ? conversions.cents : conversions.squareFeet;
  return denominator > 0 ? price / denominator : null;
}
