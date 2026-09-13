import { validatePhone } from './phone.validator';
import { validateSsn } from './ssn.validator';
import type { ValidationResult } from './ssn.validator';
import { validateVin } from './vin.validator';

export { validatePhone, validateSsn, validateVin };
export type { ValidationResult };

/**
 * Name -> function registry. A carrier config field references a validator by this name
 * (`{ validator: 'ssn' }`) rather than inline logic — the browser resolves it dynamically
 * against this same registry once it dynamic-imports this bundle (see manifest.json's
 * `validators` key); the server resolves it by importing this module directly, unbundled.
 * Shared across every carrier — Vantage's vehicle-info page uses `vin` the same way Acme
 * uses `ssn`/`phone`.
 */
export const validators = {
  ssn: validateSsn,
  phone: validatePhone,
  vin: validateVin,
} as const;

export type ValidatorName = keyof typeof validators;
