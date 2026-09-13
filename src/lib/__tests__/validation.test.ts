import {
  getErrorMessage,
  isValidBankAccountNumber,
  isValidEmail,
  isValidOtp,
  isValidPhone,
  normalizeLocalPhone,
  validateDepositAmount,
  validatePassword,
  validateSlotAmount,
} from '../validation';

describe('isValidPhone', () => {
  it.each(['08012345678', '08123456789', '07012345678', '09012345678', '09123456789'])(
    'accepts real Nigerian mobile %s',
    (phone) => {
      expect(isValidPhone(phone)).toBe(true);
    }
  );

  it.each(['01234567890', '00000000000', '0801234567', '12345678901', ''])(
    'rejects %s',
    (phone) => {
      expect(isValidPhone(phone)).toBe(false);
    }
  );

  it('trims surrounding whitespace', () => {
    expect(isValidPhone(' 08012345678 ')).toBe(true);
  });
});

describe('normalizeLocalPhone', () => {
  it.each([
    ['+2348012345678', '08012345678'],
    ['2348012345678', '08012345678'],
    ['8012345678', '08012345678'],
    ['08012345678', '08012345678'],
  ])('normalizes %s -> %s', (raw, expected) => {
    expect(normalizeLocalPhone(raw)).toBe(expected);
  });

  it.each(['12345', '+447911123456', '0801234567'])('returns null for %s', (raw) => {
    expect(normalizeLocalPhone(raw)).toBeNull();
  });
});

describe('isValidEmail', () => {
  it('accepts a plain valid email and trims whitespace', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail(' a@b.co ')).toBe(true);
  });

  it('rejects obvious non-emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('rejects fewer than 6 characters', () => {
    expect(validatePassword('12345')).toBe('Password must be at least 6 characters.');
    expect(validatePassword('')).toBe('Password must be at least 6 characters.');
  });

  it('accepts 6+ characters', () => {
    expect(validatePassword('123456')).toBe('');
    expect(validatePassword('abcdef')).toBe('');
  });
});

describe('validateDepositAmount', () => {
  it('rejects empty/non-numeric input', () => {
    expect(validateDepositAmount('')).toBe('Enter a valid amount.');
    expect(validateDepositAmount('abc')).toBe('Enter a valid amount.');
  });

  it('enforces the ₦100 minimum', () => {
    expect(validateDepositAmount('99')).toContain('Minimum deposit');
  });

  it('enforces the ₦1,000,000 maximum', () => {
    expect(validateDepositAmount('1000001')).toContain('Maximum deposit');
  });

  it('accepts in-range amounts', () => {
    expect(validateDepositAmount('100')).toBe('');
    expect(validateDepositAmount('1000000')).toBe('');
  });
});

describe('validateSlotAmount', () => {
  it('rejects empty/non-numeric input', () => {
    expect(validateSlotAmount('')).toBe('Enter a valid amount.');
    expect(validateSlotAmount('x')).toBe('Enter a valid amount.');
  });

  it('enforces the ₦100 minimum', () => {
    expect(validateSlotAmount('50')).toContain('Minimum');
  });

  it('accepts 100+', () => {
    expect(validateSlotAmount('100')).toBe('');
  });
});

describe('isValidBankAccountNumber', () => {
  it('accepts exactly 10 digits and trims whitespace', () => {
    expect(isValidBankAccountNumber('0123456789')).toBe(true);
    expect(isValidBankAccountNumber(' 1234567890 ')).toBe(true);
  });

  it('rejects wrong lengths or non-digits', () => {
    expect(isValidBankAccountNumber('12345')).toBe(false);
    expect(isValidBankAccountNumber('012345678a')).toBe(false);
  });
});

describe('isValidOtp', () => {
  it('accepts 4-6 digits', () => {
    expect(isValidOtp('1234')).toBe(true);
    expect(isValidOtp('12345')).toBe(true);
    expect(isValidOtp('123456')).toBe(true);
  });

  it('rejects fewer/more digits or non-digits', () => {
    expect(isValidOtp('123')).toBe(false);
    expect(isValidOtp('1234567')).toBe(false);
    expect(isValidOtp('12a4')).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('returns the message for Error instances', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back for non-Error values', () => {
    expect(getErrorMessage('plain string')).toBe('Something went wrong. Please try again.');
    expect(getErrorMessage(undefined, 'custom fallback')).toBe('custom fallback');
  });
});
