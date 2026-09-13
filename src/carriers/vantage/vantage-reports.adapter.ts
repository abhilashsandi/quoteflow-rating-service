import { injectable } from 'inversify';
import type { CarrierReportAdapter, MvrReport } from '../types';

const FAKE_MVR_LOOKUP_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Stands in for a real MVR lookup — much shorter fake delay than Acme's (800ms): part of this
 * carrier's whole story is a modern API integration, so its "vendor call" is fast. Same
 * deterministic-but-fake violation logic as Acme's adapter, keyed off VIN instead of SSN so
 * the two carriers' mock data don't coincidentally agree.
 */
@injectable()
export class VantageAutoReportsAdapter implements CarrierReportAdapter {
  async pullReport(answers: Record<string, unknown>): Promise<MvrReport> {
    await delay(FAKE_MVR_LOOKUP_DELAY_MS);

    const vin = typeof answers.vin === 'string' ? answers.vin.replace(/[^A-Z0-9]/gi, '') : '';
    const violations =
      vin.length > 0 && Number(vin.charCodeAt(vin.length - 1)) % 2 === 0 ? ['speeding_2024'] : [];

    return {
      reportType: 'mvr',
      violations,
      pulledAt: new Date().toISOString(),
    };
  }
}
