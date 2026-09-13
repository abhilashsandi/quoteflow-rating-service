import { validateVin } from './vin.validator';

describe('validateVin', () => {
  it('accepts a well-formed 17-character VIN', () => {
    expect(validateVin('1HGCM82633A004352')).toEqual({ valid: true });
  });

  it('accepts lowercase input by normalizing it', () => {
    expect(validateVin('1hgcm82633a004352').valid).toBe(true);
  });

  it('rejects a value with the wrong length', () => {
    expect(validateVin('1HGCM82633A00435').valid).toBe(false);
  });

  it('rejects a VIN containing the letter I', () => {
    expect(validateVin('1HGCM82633AI04352').valid).toBe(false);
  });

  it('rejects a VIN containing the letter O', () => {
    expect(validateVin('1HGCM82633AO04352').valid).toBe(false);
  });

  it('rejects a VIN containing the letter Q', () => {
    expect(validateVin('1HGCM82633AQ04352').valid).toBe(false);
  });

  it('rejects punctuation', () => {
    expect(validateVin('1HGCM8263-3A00435').valid).toBe(false);
  });
});
