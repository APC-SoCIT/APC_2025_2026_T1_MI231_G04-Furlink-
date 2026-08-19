import { validateLogin } from '@/app/(public)/auth/validation/loginValidation';

describe('validateLogin', () => {
  // --- Identifier field ---

  // USR-LOG_TC03: Empty identifier field blocked
  it('flags a missing identifier as required', () => {
    const result = validateLogin({ identifier: '', password: 'validpass' });
    expect(result.isValid).toBe(false);
    expect(result.errors.identifier).toBe('Email or username is required');
  });

  it('treats a whitespace-only identifier as missing', () => {
    const result = validateLogin({ identifier: '   ', password: 'validpass' });
    expect(result.errors.identifier).toBe('Email or username is required');
  });

  // USR-LOG_TC04: Identifier that is neither a valid email nor 3+ characters
  it('rejects an identifier that is too short and not an email', () => {
    const result = validateLogin({ identifier: 'ab', password: 'validpass' });
    expect(result.isValid).toBe(false);
    expect(result.errors.identifier).toBe(
      'Please enter a valid email address or username'
    );
  });

  it('accepts a 3+ character username-style identifier', () => {
    const result = validateLogin({ identifier: 'abc', password: 'validpass' });
    expect(result.errors.identifier).toBeUndefined();
  });

  it('accepts a well-formed email as identifier', () => {
    const result = validateLogin({
      identifier: 'juan.delacruz@gmail.com',
      password: 'validpass',
    });
    expect(result.errors.identifier).toBeUndefined();
  });

  it('rejects a malformed email-like string shorter than 3 chars', () => {
    // "a@" is not a valid email AND is under 3 chars
    const result = validateLogin({ identifier: 'a@', password: 'validpass' });
    expect(result.errors.identifier).toBe(
      'Please enter a valid email address or username'
    );
  });

  // --- Password field ---

  // USR-LOG_TC05: Empty password field blocked
  it('flags a missing password as required', () => {
    const result = validateLogin({ identifier: 'validuser', password: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe('Password is required');
  });

  // USR-LOG_TC06: Password shorter than 6 characters blocked
  it('rejects a password under 6 characters', () => {
    const result = validateLogin({ identifier: 'validuser', password: 'abcde' });
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe(
      'Password must be at least 6 characters'
    );
  });

  it('accepts a password of exactly 6 characters (boundary)', () => {
    const result = validateLogin({ identifier: 'validuser', password: 'abcdef' });
    expect(result.errors.password).toBeUndefined();
  });

  // --- Combined ---

  it('returns isValid: true only when both fields pass', () => {
    const result = validateLogin({
      identifier: 'juan.delacruz@gmail.com',
      password: 'Passw0rd!',
    });
    expect(result).toEqual({ isValid: true, errors: {} });
  });

  it('reports both errors at once when both fields are invalid', () => {
    const result = validateLogin({ identifier: '', password: '' });
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors)).toEqual(
      expect.arrayContaining(['identifier', 'password'])
    );
  });
});