export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  employeeId: /^[A-Z0-9_-]{4,20}$/,
} as const;

export function isRequired(value: string): boolean {
  return value.trim().length > 0;
}

export function validateDateRange(from: string, to: string): boolean {
  if (!from || !to) return false;
  return new Date(from).getTime() <= new Date(to).getTime();
}
