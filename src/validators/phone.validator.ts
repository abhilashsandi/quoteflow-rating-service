import type { ValidationResult } from './ssn.validator';

export function validatePhone(value: string): ValidationResult {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;

  if (!/^\d{10}$/.test(normalized)) return { valid: false, message: 'Phone number must be 10 digits' };
  if (/^[01]/.test(normalized)) return { valid: false, message: 'Invalid area code' };
  if (/^[01]/.test(normalized.slice(3))) return { valid: false, message: 'Invalid exchange code' };
  return { valid: true };
}
