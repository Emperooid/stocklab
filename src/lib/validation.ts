// Nigerian mobile format: 11 digits, leading 0, and a real MNO prefix.
// Every Nigerian mobile number starts 070/080/081/090/091 — this rejects
// obviously fake numbers (e.g. 00000000000, 01234567890) that would
// otherwise pass a plain "11 digits" check and waste a real OTP send.
const PHONE_RE = /^0[789]\d{9}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone.trim());
}

// Not RFC 5322 — just enough to catch obvious mistakes and satisfy the
// payment gateway's own format check (CONFIRMED live: it rejected a plain
// phone number as femail with "The CustomerEmail field is not a valid
// e-mail address.").
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/**
 * Password, not a numeric PIN — the backend field is still called
 * "pincode"/"PinCode" on the wire (see httpApi.ts), but accepts any string,
 * so this only needs to satisfy our own product requirement: letters and
 * numbers allowed, minimum 6 characters.
 */
export function validatePassword(password: string): string {
  if (password.length < 6) return 'Password must be at least 6 characters.';
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

// Confirmed live against the real backend: G12 needs a `SlotAmount` — the
// fixed amount to play a round with — and rejected a play as "Balance
// Allocated to Slot is too low" until this is set explicitly. ₦100 was also
// separately confirmed as the floor ("Minimum balance required is 100")
// before SlotAmount existed as its own field; using it as the floor here
// too until the backend confirms whether SlotAmount has its own minimum.
export const MIN_SLOT_AMOUNT = 100;

/** Returns an error message, or '' if the per-round play amount is valid. */
export function validateSlotAmount(rawAmount: string): string {
  const amount = Number(rawAmount);
  if (!rawAmount.trim() || Number.isNaN(amount)) return 'Enter a valid amount.';
  if (amount < MIN_SLOT_AMOUNT) return `Minimum is ₦${MIN_SLOT_AMOUNT.toLocaleString()}.`;
  return '';
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
