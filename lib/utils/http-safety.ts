export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHeaderValue(value: unknown, maxLength = 120): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/[\r\n]+/g, ' ')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeContentDispositionFilename(
  value: unknown,
  fallback = 'download'
): string {
  const sanitized = sanitizeHeaderValue(value, 180)
    .replace(/[\\/";]/g, '_')
    .replace(/_+/g, '_')
    .trim();

  if (sanitized.length > 0) {
    return sanitized;
  }

  const fallbackName = sanitizeHeaderValue(fallback, 180)
    .replace(/[\\/";]/g, '_')
    .replace(/_+/g, '_')
    .trim();

  return fallbackName || 'download';
}

export function noStoreHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return {
    ...headers,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
}

export function noStoreHeadersFrom(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  merged.set('Cache-Control', 'no-store');
  merged.set('X-Content-Type-Options', 'nosniff');
  return merged;
}

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readStringField(
  value: unknown,
  maxLength: number,
  options: { trim?: boolean } = {}
): string {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = options.trim === false ? value : value.trim();
  return normalized.slice(0, maxLength);
}
