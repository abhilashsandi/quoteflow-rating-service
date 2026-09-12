// Browser-safe pure function: this file is bundled and run directly in the browser (see
// scripts/build-bundles.ts) and also imported unbundled by quote-validation.ts for
// server-side re-validation — one implementation, two runtimes. No server-only imports
// allowed here (enforced by eslint.config.js's no-restricted-imports/-globals rule).

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateSsn(value: string): ValidationResult {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{9}$/.test(digits)) return { valid: false, message: 'SSN must be 9 digits' };
  if (/^(000|666|9\d\d)/.test(digits)) return { valid: false, message: 'Invalid SSN prefix' };
  if (digits.slice(3, 5) === '00') return { valid: false, message: 'Invalid SSN group number' };
  if (digits.slice(5) === '0000') return { valid: false, message: 'Invalid SSN serial number' };
  return { valid: true };
}
