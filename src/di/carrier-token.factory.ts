import type { LineOfBusiness } from '../carriers/types';

export type CarrierServiceKind = 'rating' | 'reports';

/**
 * carrierId here is a carrier's stable `code` (e.g. "acme"), not its DB row UUID: DI bindings
 * are wired once at module-load time, before any database round trip, so the token has to be
 * derivable from a compile-time-known identifier. Route handlers look up `carriers.code` from
 * the DB row for the request's quote and pass that in. Adding a second carrier is then just
 * new adapter classes bound under a new code here — no change to the quote-lifecycle code that
 * calls resolveCarrierRatingAdapter/resolveCarrierReportAdapter.
 */
export function carrierServiceToken(
  kind: CarrierServiceKind,
  carrierId: string,
  lineOfBusiness: LineOfBusiness,
): symbol {
  return Symbol.for(`carrier-service:${kind}:${carrierId}:${lineOfBusiness}`);
}
