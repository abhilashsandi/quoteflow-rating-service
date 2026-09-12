import { createQuote } from './quote.service';
import * as repo from './quote.repository';

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
