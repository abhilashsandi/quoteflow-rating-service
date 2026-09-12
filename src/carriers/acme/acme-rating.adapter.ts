import { injectable } from 'inversify';
import type { CarrierRatingAdapter, RatingResult } from '../types';

const BASE_PREMIUM = 600;

/**
 * Fake premium calc for the demo: a base rate nudged by driver age (younger = higher) and
 * whether an MVR report with violations has already been pulled. Not real underwriting logic.
 */
@injectable()
export class AcmeAutoRatingAdapter implements CarrierRatingAdapter {
  computeMockRate(answers: Record<string, unknown>): RatingResult {
    let premium = BASE_PREMIUM;

    const dob = typeof answers.dob === 'string' ? new Date(answers.dob) : undefined;
    if (dob && !Number.isNaN(dob.getTime())) {
      const ageYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (ageYears < 25) premium += 350;
      else if (ageYears < 65) premium += 0;
      else premium += 120;
    }

    const violations = Array.isArray(answers.mvrViolations) ? (answers.mvrViolations as unknown[]) : [];
    premium += violations.length * 175;

    return {
      premium: Math.round(premium * 100) / 100,
      currency: 'USD',
      ratedAt: new Date().toISOString(),
    };
  }
}
