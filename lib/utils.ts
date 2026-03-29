import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on both native and web.
 * On web, Alert.alert is a no-op, so we fall back to window.alert.
 */
export function showAlert(title: string, message?: string, buttons?: any[]) {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      // For confirm-style dialogs on web
      const destructive = buttons.find((b: any) => b.style === 'destructive');
      const confirm = buttons.find((b: any) => b.style !== 'cancel');
      const cancel = buttons.find((b: any) => b.style === 'cancel');
      const result = window.confirm(message ? `${title}\n\n${message}` : title);
      if (result) {
        (destructive || confirm)?.onPress?.();
      } else {
        cancel?.onPress?.();
      }
    } else {
      window.alert(message ? `${title}\n\n${message}` : title);
      buttons?.[0]?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}

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
const uzsFormatter = new Intl.NumberFormat('uz-UZ');

export function formatMoney(amount: number): string {
  const formatted = uzsFormatter.format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  return `${sign}${formatted} UZS`;
}
