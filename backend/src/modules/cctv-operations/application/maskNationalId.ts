export function maskNationalId(
  value: string | null | undefined,
  canViewSensitive: boolean,
): string | null {
  if (!value) return null;
  if (canViewSensitive) return value;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '**********';
  return `${'*'.repeat(10)}${digits.slice(-4)}`;
}
