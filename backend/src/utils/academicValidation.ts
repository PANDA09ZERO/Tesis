export const positiveId = (value: unknown): boolean => (typeof value === 'number' || typeof value === 'string') && /^[1-9][0-9]*$/.test(String(value)) && Number.isSafeInteger(Number(value));
export const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;

// Both grades and evaluation maxima are stored as DECIMAL(4,2); reject silent rounding.
export function validGrade(value: unknown, allowString = false): boolean {
  if (typeof value !== 'number' && !(allowString && typeof value === 'string' && value.trim())) return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 20 && Number(numeric.toFixed(2)) === numeric;
}
