/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format a numeric amount into Indian Rupee representation (e.g. ₹1,00,000.00 or -₹500.00)
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Use Intl.NumberFormat with en-IN
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Convert Rupees to integer paise (avoids float precision errors)
 * e.g. 6470.20 -> 647020
 */
export function toPaise(rupees: number): number {
  return Math.round(Number(rupees || 0) * 100);
}

/**
 * Convert integer paise back to rupees
 * e.g. 647020 -> 6470.20
 */
export function fromPaise(paise: number): number {
  return Number((Number(paise || 0) / 100).toFixed(2));
}

/**
 * Format date in Asia/Kolkata timezone to 'DD MMM YYYY'
 * e.g., '21 Oct 2026'
 */
export function formatDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Format date and time for audit logs / timestamps
 */
export function formatDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Get current date string in Asia/Kolkata timezone formatted as YYYY-MM-DD
 */
export function getTodayKolkata(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // en-CA produces YYYY-MM-DD
}

/**
 * Generate a unique, monotonic, human-readable ID
 */
export function generateId(prefix: 'EXP' | 'CR' | 'STMT' | 'SETTL' | 'REC' | 'AUD'): string {
  const dateStr = getTodayKolkata().replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${randomSuffix}`;
}
