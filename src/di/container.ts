import 'reflect-metadata';
import { Container } from 'inversify';
import { AcmeAutoRatingAdapter } from '../carriers/acme/acme-rating.adapter';
import { AcmeAutoReportsAdapter } from '../carriers/acme/acme-reports.adapter';
import type { CarrierRatingAdapter, CarrierReportAdapter, LineOfBusiness } from '../carriers/types';
import { carrierServiceToken } from './carrier-token.factory';

export const container = new Container({ defaultScope: 'Singleton' });

// Registering a second carrier here (new adapter classes bound under a new `code`) is the
// entire integration surface — no change to quote-lifecycle code is needed.
container.bind<CarrierRatingAdapter>(carrierServiceToken('rating', 'acme', 'auto')).to(AcmeAutoRatingAdapter);
container
  .bind<CarrierReportAdapter>(carrierServiceToken('reports', 'acme', 'auto'))
  .to(AcmeAutoReportsAdapter);

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
