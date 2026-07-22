/**
 * Only allow same-origin relative paths for notification action URLs.
 * Blocks external http(s), protocol-relative, and javascript: URLs.
 */
export function getSafeInternalPath(actionUrl: string | null | undefined): string | null {
  if (!actionUrl) return null;
  const trimmed = actionUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    if (trimmed.includes('://')) return null;
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
