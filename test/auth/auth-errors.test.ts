import { describe, expect, it } from '@jest/globals';

import { formatAuthRequestError, formatAuthValidationErrors } from '@/auth/auth-errors';

describe('formatAuthValidationErrors', () => {
  it('shows readable field errors without echoing secret input values', () => {
    const message = formatAuthValidationErrors([
      { loc: ['body', 'email'], msg: 'value is not a valid email address', input: 'test-broker' },
      { loc: ['body', 'password'], msg: 'String should have at least 12 characters', input: 'secret' },
    ], 'Fallback');
    expect(message).toBe('Email: value is not a valid email address Password: String should have at least 12 characters');
    expect(message).not.toContain('test-broker');
    expect(message).not.toContain('secret');
  });

  it('uses a safe fallback for empty or malformed validation details', () => {
    expect(formatAuthValidationErrors([], 'Fallback')).toBe('Fallback');
    expect(formatAuthValidationErrors({ message: 'unexpected' }, 'Fallback')).toBe('Fallback');
  });
});

describe('formatAuthRequestError', () => {
  it('explains network failures clearly', () => {
    expect(formatAuthRequestError({ code: 'ERR_NETWORK' }, 'fallback')).toMatch(/can’t reach the server/i);
  });

  it('explains request timeouts clearly', () => {
    expect(formatAuthRequestError({ code: 'ETIMEDOUT' }, 'fallback')).toMatch(/too long to respond/i);
  });

  it('uses the supplied fallback for other errors', () => {
    expect(formatAuthRequestError({ code: 'ERR_BAD_REQUEST' }, 'fallback')).toBe('fallback');
  });
});
