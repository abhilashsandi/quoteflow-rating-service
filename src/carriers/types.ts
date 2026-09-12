export const LINES_OF_BUSINESS = ['auto'] as const;
export type LineOfBusiness = (typeof LINES_OF_BUSINESS)[number];

export interface RatingResult {
  premium: number;
  currency: 'USD';
  ratedAt: string;
}

/** Carrier-specific rating logic. One implementation per carrier x line of business. */
export interface CarrierRatingAdapter {
  computeMockRate(answers: Record<string, unknown>): RatingResult;
}

export interface MvrReport {
  reportType: 'mvr';
  violations: string[];
  pulledAt: string;
}

/** Carrier-specific report lookups (e.g. MVR). One implementation per carrier x line of business. */
export interface CarrierReportAdapter {
  pullReport(answers: Record<string, unknown>): Promise<MvrReport>;
}
