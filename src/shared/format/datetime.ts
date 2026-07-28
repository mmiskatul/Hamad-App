/*
 * Timestamp formatting for list metadata ("9:48 PM • DEC 7, 2026" in Figma
 * 182:740 and 184:3053).
 *
 * Locale-aware via toLocaleTimeString/toLocaleDateString rather than a
 * hand-rolled format string: the app ships Arabic, where both the numerals and
 * the month names differ, and a template like `${h}:${m} PM` would hardcode an
 * English clock into an RTL locale.
 *
 * The uppercase in the design comes from the LABEL type style (textTransform in
 * the row component), not from the formatter — uppercasing here would break
 * Arabic month names, which have no case.
 *
 * Fail-safe: some Hermes builds ship a trimmed Intl. If formatting throws, the
 * caller still gets a usable ISO-ish fragment rather than a crashed list.
 */
export function formatRowTime(at: number, locale: string): string {
  try {
    return new Date(at).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return new Date(at).toISOString().slice(11, 16);
  }
}

/** Billing-period chip on the usage dashboard (Figma 140:2163: "MAY 2026"). */
export function formatMonthLabel(at: number, locale: string): string {
  try {
    return new Date(at).toLocaleDateString(locale, { year: 'numeric', month: 'long' });
  } catch {
    return new Date(at).toISOString().slice(0, 7);
  }
}

export function formatRowDate(at: number, locale: string): string {
  try {
    return new Date(at).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return new Date(at).toISOString().slice(0, 10);
  }
}
