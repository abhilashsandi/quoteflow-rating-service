import { resolveCarrierRatingAdapter, resolveCarrierReportAdapter } from './container';

describe('carrier DI container', () => {
  it('resolves the Acme auto rating adapter carrier-agnostically', () => {
    const adapter = resolveCarrierRatingAdapter('acme', 'auto');
    const result = adapter.computeMockRate({ dob: '2000-01-01' });
    expect(result.currency).toBe('USD');
    expect(result.premium).toBeGreaterThan(0);
  });

  it('resolves the Acme auto reports adapter and pulls a deterministic fake MVR', async () => {
    const adapter = resolveCarrierReportAdapter('acme', 'auto');
    const report = await adapter.pullReport({ ssn: '123-45-6789' });
    expect(report.reportType).toBe('mvr');
    expect(Array.isArray(report.violations)).toBe(true);
  });

  it('throws for an unregistered carrier code (no silent fallback)', () => {
    expect(() => resolveCarrierRatingAdapter('unknown-carrier', 'auto')).toThrow();
  });
});
