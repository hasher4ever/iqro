/** UTC+5 offset in milliseconds (Tashkent timezone) */
export const TIMEZONE_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5 Tashkent

/** Returns the current date/time shifted to Tashkent (UTC+5). */
export function getTashkentNow(): Date {
  return new Date(Date.now() + TIMEZONE_OFFSET_MS);
}

/** Shifts an arbitrary Date to Tashkent (UTC+5). */
export function toTashkentDate(date: Date): Date {
  return new Date(date.getTime() + TIMEZONE_OFFSET_MS);
}

/**
 * Shared currency formatter for UZS amounts.
 * Returns e.g. "1,234 UZS" or "-1,234 UZS".
 */
export function formatMoney(amount: number): string {
  const formatted = new Intl.NumberFormat('uz-UZ').format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  return `${sign}${formatted} UZS`;
}
