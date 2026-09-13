import { createQuote, getResolvedSchema } from './quote.service';
import * as repo from './quote.repository';

const ACME_CARRIER: repo.CarrierRow = {
  id: 'carrier-1',
  code: 'acme',
  name: 'Acme Insurance',
  is_active: true,
};
const ACME_CONFIG_VERSION: repo.CarrierConfigVersionRow = {
  id: 'cfg-1',
  carrier_id: 'carrier-1',
  version: 1,
  published_at: new Date(),
  json_schema: {
    pages: [{ key: 'driver-info', title: 'Driver Information', sections: [] }],
  },
};

describe('createQuote', () => {
  it('pre-creates one empty answers object per schema page (JSON Patch add needs an existing parent)', async () => {
    jest.spyOn(repo, 'findCarrierByCode').mockResolvedValue({
      id: 'carrier-1',
      code: 'acme',
      name: 'Acme Insurance',
      is_active: true,
    });
    jest.spyOn(repo, 'findLatestConfigVersion').mockResolvedValue({
      id: 'cfg-1',
      carrier_id: 'carrier-1',
      version: 1,
      published_at: new Date(),
      json_schema: {
        pages: [
          { key: 'driver-info', title: 'Driver Information', sections: [] },
          { key: 'vehicle-info', title: 'Vehicle Information', sections: [] },
        ],
      },
    });
    const insertSpy = jest.spyOn(repo, 'insertQuote').mockResolvedValue({
      id: 'quote-1',
      carrier_id: 'carrier-1',
      status: 'active',
      funnel_stage: 'schema',
      current_page_key: 'driver-info',
      answers: { 'driver-info': {}, 'vehicle-info': {} },
      created_at: new Date(),
      updated_at: new Date(),
    });

    await createQuote('acme');

    expect(insertSpy).toHaveBeenCalledWith({
      carrierId: 'carrier-1',
      currentPageKey: 'driver-info',
      initialAnswers: { 'driver-info': {}, 'vehicle-info': {} },
    });
  });
});

describe('getResolvedSchema', () => {
  beforeEach(() => {
    jest.spyOn(repo, 'findCarrierById').mockResolvedValue(ACME_CARRIER);
    jest.spyOn(repo, 'findLatestConfigVersion').mockResolvedValue(ACME_CONFIG_VERSION);
  });

  it('returns rate: null while the quote is still at the schema stage', async () => {
    jest.spyOn(repo, 'findQuoteById').mockResolvedValue({
      id: 'quote-1',
      carrier_id: 'carrier-1',
      status: 'active',
      funnel_stage: 'schema',
      current_page_key: 'driver-info',
      answers: { 'driver-info': {} },
      created_at: new Date(),
      updated_at: new Date(),
    });

    const { rate } = await getResolvedSchema('quote-1');

    expect(rate).toBeNull();
  });

  it('recomputes the rc1 rate from stored answers once past the schema stage', async () => {
    jest.spyOn(repo, 'findQuoteById').mockResolvedValue({
      id: 'quote-1',
      carrier_id: 'carrier-1',
      status: 'active',
      funnel_stage: 'rc1',
      current_page_key: 'driver-info',
      answers: { 'driver-info': { dob: '1990-01-01' } },
      created_at: new Date(),
      updated_at: new Date(),
    });

    const { rate } = await getResolvedSchema('quote-1');

    expect(rate).not.toBeNull();
    expect(rate?.premium).toBe(600); // BASE_PREMIUM, no age/violation surcharge for this dob
  });

  it('folds stored __reports.mvr violations into the recomputed rc2 rate, matching pullReportAndRerate', async () => {
    jest.spyOn(repo, 'findQuoteById').mockResolvedValue({
      id: 'quote-1',
      carrier_id: 'carrier-1',
      status: 'active',
      funnel_stage: 'rc2',
      current_page_key: 'driver-info',
      answers: {
        'driver-info': { dob: '1990-01-01' },
        __reports: {
          mvr: { reportType: 'mvr', violations: ['speeding_2024'], pulledAt: new Date().toISOString() },
        },
      },
      created_at: new Date(),
      updated_at: new Date(),
    });

    const { rate } = await getResolvedSchema('quote-1');

    expect(rate?.premium).toBe(775); // 600 base + 175 for one MVR violation
  });
});
