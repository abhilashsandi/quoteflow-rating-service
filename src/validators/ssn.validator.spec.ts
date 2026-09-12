import { validateSsn } from './ssn.validator';

describe('validateSsn', () => {
  it('accepts a well-formed SSN', () => {
    expect(validateSsn('123-45-6789')).toEqual({ valid: true });
  });

  it('rejects a value with the wrong digit count', () => {
    expect(validateSsn('123-45-678').valid).toBe(false);
  });

  it('rejects the 000 prefix', () => {
    expect(validateSsn('000-45-6789').valid).toBe(false);
  });

  it('rejects the 666 prefix', () => {
    expect(validateSsn('666-45-6789').valid).toBe(false);
  });

  it('rejects a 9xx prefix', () => {
    expect(validateSsn('923-45-6789').valid).toBe(false);
  });

  it('rejects a 00 group number', () => {
    expect(validateSsn('123-00-6789').valid).toBe(false);
  });

  it('rejects a 0000 serial number', () => {
    expect(validateSsn('123-45-0000').valid).toBe(false);
  });
});
