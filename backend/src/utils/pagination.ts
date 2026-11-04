// Corrección: parseInt('abc') devolvía NaN y producía "LIMIT NaN" (error 500).
// Ahora se aceptan solo enteros positivos y se usan valores por defecto en otro caso.
function positiveInt(value: unknown, fallback: number, max = 1000000): number {
  const parsed = typeof value === 'string' && /^\d{1,7}$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 1 ? Math.min(parsed, max) : fallback;
}

export function getPagination(query: { page?: string; limit?: string }) {
  const page = positiveInt(query.page, 1);
  const limit = positiveInt(query.limit, 20, 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}