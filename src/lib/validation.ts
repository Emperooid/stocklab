const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Returns an error message, or '' if the password is valid. */
export function validatePassword(password: string): string {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  return '';
}

export const MIN_DEPOSIT = 100;
export const MAX_DEPOSIT = 1_000_000;

/** Returns an error message, or '' if the deposit amount is valid. */
export function validateDepositAmount(rawAmount: string): string {
  const amount = Number(rawAmount);
  if (!rawAmount.trim() || Number.isNaN(amount)) return 'Enter a valid amount.';
  if (amount < MIN_DEPOSIT) return `Minimum deposit is ₦${MIN_DEPOSIT.toLocaleString()}.`;
  if (amount > MAX_DEPOSIT) return `Maximum deposit is ₦${MAX_DEPOSIT.toLocaleString()}.`;
  return '';
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
