/**
 * Strip HTML / script payloads — store plain text only (XSS hardening).
 */
export function sanitizeMessageContent(raw: string | null | undefined): string {
  if (raw == null) return '';
  let text = String(raw);

  // Remove script/style blocks entirely
  text = text.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common entities
  text = text
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ');
  // Neutralize leftover angle brackets / javascript: URLs
  text = text.replace(/javascript\s*:/gi, '');
  text = text.replace(/[<>]/g, '');
  // Collapse whitespace
  text = text.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim();
  return text;
}

export function assertSafePlainText(raw: string, maxLength = 10000): string {
  const cleaned = sanitizeMessageContent(raw);
  if (!cleaned) {
    throw new Error('محتوى الرسالة فارغ بعد التنظيف');
  }
  if (cleaned.length > maxLength) {
    throw new Error(`محتوى الرسالة يتجاوز الحد المسموح (${maxLength})`);
  }
  return cleaned;
}
