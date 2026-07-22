/** Sensitive key substrings (case-insensitive) to mask in audit JSON. */
const SENSITIVE_KEY_RE =
  /(password|token|secret|jwt|refreshtoken)/i;

export function maskSensitiveValue(_key: string, _value: unknown): string {
  return '***';
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_RE.test(key);
}

export function maskSensitiveData(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => maskSensitiveData(item));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(k)) {
        out[k] = maskSensitiveValue(k, v);
      } else {
        out[k] = maskSensitiveData(v);
      }
    }
    return out;
  }
  return value;
}

export function toMaskedJson(
  value: unknown,
): Record<string, unknown> | unknown[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return maskSensitiveData(value) as Record<string, unknown> | unknown[];
}
