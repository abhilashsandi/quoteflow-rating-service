import request from 'supertest';
import { createApp } from '../app';
import * as repo from '../quotes/quote.repository';

describe('GET /internal/quotes/:quoteId', () => {
  const app = createApp();

  afterEach(() => jest.restoreAllMocks());

  it('returns the quote answers with no Origin header (server-to-server, no CORS)', async () => {
    jest.spyOn(repo, 'findQuoteById').mockResolvedValue({
      id: 'quote-1',
      carrier_id: 'carrier-1',
      status: 'active',
      funnel_stage: 'rc1',
      current_page_key: 'driver-info',
      answers: { 'driver-info': { firstName: 'Jane', lastName: 'Doe', dob: '1990-01-01' } },
      created_at: new Date(),
      updated_at: new Date(),
    });
    jest.spyOn(repo, 'findCarrierById').mockResolvedValue({
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
      json_schema: { pages: [{ key: 'driver-info', title: 'Driver Information', sections: [] }] },
    });

    const res = await request(app).get('/internal/quotes/quote-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      quoteId: 'quote-1',
      carrierCode: 'acme',
      answers: { 'driver-info': { firstName: 'Jane', lastName: 'Doe', dob: '1990-01-01' } },
    });
  });

  it('404s for an unknown quoteId', async () => {
    jest.spyOn(repo, 'findQuoteById').mockResolvedValue(undefined);

    const res = await request(app).get('/internal/quotes/nope');

    expect(res.status).toBe(404);
  });
});
