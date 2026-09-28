// Nigerian mobile format: 11 digits, leading 0, and a real MNO prefix.
// Every Nigerian mobile number starts 070/080/081/090/091 — this rejects
// obviously fake numbers (e.g. 00000000000, 01234567890) that would
// otherwise pass a plain "11 digits" check and waste a real OTP send.
const PHONE_RE = /^0[789]\d{9}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone.trim());
}

/**
 * Device contacts commonly come back as +234..., 234... (no +), or a bare
 * 10-digit number missing the leading 0 — none of which match this app's
 * canonical local format (isValidPhone above). Converts any of those into
 * that canonical format, or returns null if the result still isn't a
 * recognizable Nigerian mobile number (e.g. a landline, or a non-Nigerian
 * contact) — callers should skip contacts this returns null for rather
 * than sending an unnormalized number to the backend.
 */
export function normalizeLocalPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  let local: string | null = null;
  if (digits.length === 11 && digits.startsWith('0')) {
    local = digits;
  } else if (digits.length === 13 && digits.startsWith('234')) {
    local = `0${digits.slice(3)}`;
  } else if (digits.length === 10 && /^[789]/.test(digits)) {
    local = `0${digits}`;
  }
  return local && isValidPhone(local) ? local : null;
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

// NUBAN (Nigerian bank account number) format — always exactly 10 digits.
export function isValidBankAccountNumber(accountNumber: string): boolean {
  return /^\d{10}$/.test(accountNumber.trim());
}

// A one-time verification code sent to confirm a payout account — 4-6
// digits covers every OTP length this backend has used elsewhere (G10/G20).
export function isValidOtp(otp: string): boolean {
  return /^\d{4,6}$/.test(otp.trim());
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * CONFIRMED live: logging in from a device the backend hasn't seen before
 * for that account gets rejected outright by G22, even with the correct
 * password — the only way through is resetting the password (G20/G21),
 * which re-registers the device as a side effect. The raw backend message
 * for this ("New Device Detected...") read as a dead end rather than an
 * instruction, since nothing on the login screen connected it to the
 * Forgot Password flow. Matched loosely on "device" rather than the exact
 * wording, since this is the only login-failure case that ever mentions a
 * device at all, and the backend's exact phrasing isn't a documented
 * contract.
 */
export function isNewDeviceError(message: string): boolean {
  return /device/i.test(message);
}
