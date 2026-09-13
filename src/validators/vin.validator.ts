// Browser-safe pure function: this file is bundled and run directly in the browser (see
// scripts/build-bundles.ts) and also imported unbundled by quote-validation.ts for
// server-side re-validation — one implementation, two runtimes. No server-only imports
// allowed here (enforced by eslint.config.js's no-restricted-imports/-globals rule).
import type { ValidationResult } from './ssn.validator';

/**
 * A format check, not a full ISO 3779 check-digit validation: 17 characters, letters and
 * digits only, excluding I/O/Q (real VINs never use those three — easy to confuse with 1/0).
 * Good enough for a mock carrier's vehicle-info page; a real integration would verify the
 * check digit (position 9) too.
 */
export function validateVin(value: string): ValidationResult {
  const normalized = value.trim().toUpperCase();
  if (normalized.length !== 17) return { valid: false, message: 'VIN must be 17 characters' };
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) {
    return { valid: false, message: 'VIN may only contain letters and digits (no I, O, or Q)' };
  }
  return { valid: true };
}
