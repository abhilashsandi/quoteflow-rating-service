import { injectable } from 'inversify';
import type { CarrierReportAdapter, MvrReport } from '../types';

const FAKE_MVR_LOOKUP_DELAY_MS = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Stands in for a real MVR (Motor Vehicle Record) lookup — a fixed delay, deterministic result. */
@injectable()
export class AcmeAutoReportsAdapter implements CarrierReportAdapter {
  async pullReport(answers: Record<string, unknown>): Promise<MvrReport> {
    await delay(FAKE_MVR_LOOKUP_DELAY_MS);

    const ssn = typeof answers.ssn === 'string' ? answers.ssn.replace(/\D/g, '') : '';
    // Deterministic-but-fake: an odd last digit "has" one violation, so re-runs are stable.
    const violations = ssn.length > 0 && Number(ssn[ssn.length - 1]) % 2 === 1 ? ['speeding_2023'] : [];

    return {
      reportType: 'mvr',
      violations,
      pulledAt: new Date().toISOString(),
    };
  }
}
