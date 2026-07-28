/*
 * Number formatting for the usage surfaces (dashboard 142:496, and the
 * conversation view's quota chip).
 *
 * Locale-aware via Intl, NOT string concatenation: Arabic renders digits as
 * Eastern Arabic numerals and groups them its own way, so a hand-built "1,200"
 * would be wrong in half the app.
 *
 * Fail-safe for the same reason as shared/format/datetime: some Hermes builds
 * ship a trimmed Intl, and a missing `notation: 'compact'` must degrade to a
 * plain number rather than throw inside a list.
 */

/** Compact count for a tight chip: 1200 → "1.2K". Infinity → "∞". */
export function formatCompact(value: number, locale: string): string {
  if (!Number.isFinite(value)) return '∞';

  try {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return String(value);
  }
}

/** Plain count with grouping: 1200 → "1,200". Infinity → "∞". */
export function formatCount(value: number, locale: string): string {
  if (!Number.isFinite(value)) return '∞';

  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

/** 0.85 → "85%", locale-aware. */
export function formatPercent(ratio: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(ratio);
  } catch {
    return `${Math.round(ratio * 100)}%`;
  }
}

/** 10700 → "$10,700.00", locale-aware. */
export function formatCurrency(value: number, locale: string, currency = 'USD'): string {
  if (!Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}
