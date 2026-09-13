import { injectable } from 'inversify';
import type { CarrierRatingAdapter, RatingResult } from '../types';

const BASE_PREMIUM = 550;

/**
 * Fake premium calc for the demo: cheaper base than Acme's and a flatter age curve — the
 * numbers only need to be *different* from Acme's, to prove createQuote/applyAnswerPatch
 * genuinely dispatch per carrier rather than hardcoding Acme's adapter. Not real underwriting
 * logic.
 */
@injectable()
export class VantageAutoRatingAdapter implements CarrierRatingAdapter {
  computeMockRate(answers: Record<string, unknown>): RatingResult {
    let premium = BASE_PREMIUM;

    const dob = typeof answers.dob === 'string' ? new Date(answers.dob) : undefined;
    if (dob && !Number.isNaN(dob.getTime())) {
      const ageYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (ageYears < 25) premium += 250;
      else if (ageYears < 70) premium += 0;
      else premium += 80;
    }

    const violations = Array.isArray(answers.mvrViolations) ? (answers.mvrViolations as unknown[]) : [];
    premium += violations.length * 150;

    return {
      premium: Math.round(premium * 100) / 100,
      currency: 'USD',
      ratedAt: new Date().toISOString(),
    };
  }
}
