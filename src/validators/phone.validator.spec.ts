import { validatePhone } from './phone.validator';

describe('validatePhone', () => {
  it('accepts a well-formed 10-digit US number', () => {
    expect(validatePhone('555-234-5678')).toEqual({ valid: true });
  });

  it('accepts an 11-digit number with a leading country code 1', () => {
    expect(validatePhone('1-555-234-5678').valid).toBe(true);
  });

  it('rejects a value with the wrong digit count', () => {
    expect(validatePhone('555-234-567').valid).toBe(false);
  });

  it('rejects an invalid (0/1-leading) area code', () => {
    expect(validatePhone('055-234-5678').valid).toBe(false);
  });

  it('rejects an invalid (0/1-leading) exchange code', () => {
    expect(validatePhone('555-034-5678').valid).toBe(false);
  });
});
