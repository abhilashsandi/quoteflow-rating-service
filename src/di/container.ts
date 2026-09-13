import 'reflect-metadata';
import { Container } from 'inversify';
import { AcmeAutoRatingAdapter } from '../carriers/acme/acme-rating.adapter';
import { AcmeAutoReportsAdapter } from '../carriers/acme/acme-reports.adapter';
import type { CarrierRatingAdapter, CarrierReportAdapter, LineOfBusiness } from '../carriers/types';
import { VantageAutoRatingAdapter } from '../carriers/vantage/vantage-rating.adapter';
import { VantageAutoReportsAdapter } from '../carriers/vantage/vantage-reports.adapter';
import { carrierServiceToken } from './carrier-token.factory';

export const container = new Container({ defaultScope: 'Singleton' });

// Registering a second carrier here (new adapter classes bound under a new `code`) is the
// entire integration surface — no change to quote-lifecycle code is needed. Vantage (below)
// is the proof: same rating/reports contracts as Acme, a completely different bind mechanism
// (a REST API in quoteflow-apps' automation-worker instead of Playwright), and nothing in
// this service's quote lifecycle had to change to support it.
container.bind<CarrierRatingAdapter>(carrierServiceToken('rating', 'acme', 'auto')).to(AcmeAutoRatingAdapter);
container
  .bind<CarrierReportAdapter>(carrierServiceToken('reports', 'acme', 'auto'))
  .to(AcmeAutoReportsAdapter);

container
  .bind<CarrierRatingAdapter>(carrierServiceToken('rating', 'vantage', 'auto'))
  .to(VantageAutoRatingAdapter);
container
  .bind<CarrierReportAdapter>(carrierServiceToken('reports', 'vantage', 'auto'))
  .to(VantageAutoReportsAdapter);

export function resolveCarrierRatingAdapter(
  carrierCode: string,
  lineOfBusiness: LineOfBusiness,
): CarrierRatingAdapter {
  return container.get<CarrierRatingAdapter>(carrierServiceToken('rating', carrierCode, lineOfBusiness));
}

export function resolveCarrierReportAdapter(
  carrierCode: string,
  lineOfBusiness: LineOfBusiness,
): CarrierReportAdapter {
  return container.get<CarrierReportAdapter>(carrierServiceToken('reports', carrierCode, lineOfBusiness));
}
