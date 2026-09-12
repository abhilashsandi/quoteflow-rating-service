import * as bindEvents from './bind-events';
import * as bindService from './bind.service';
import * as repo from './quote.repository';
import * as rabbitmq from '../queue/rabbitmq';

const baseQuote: repo.QuoteRow = {
  id: 'quote-1',
  carrier_id: 'carrier-1',
  status: 'active',
  funnel_stage: 'rc2',
  current_page_key: 'driver-info',
  answers: {},
  created_at: new Date(),
  updated_at: new Date(),
};

const baseCarrier: repo.CarrierRow = {
  id: 'carrier-1',
  code: 'acme',
  name: 'Acme Insurance',
  is_active: true,
};

const baseJob: repo.CarrierJobRow = {
  id: 'job-1',
  quote_id: 'quote-1',
  carrier_id: 'carrier-1',
  status: 'pending',
  attempt_count: 0,
  last_error: null,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('requestBind', () => {
  it('rejects a quote that has not reached rc2 yet', async () => {
    jest.spyOn(repo, 'findQuoteById').mockResolvedValue({ ...baseQuote, funnel_stage: 'rc1' });
    await expect(bindService.requestBind('quote-1')).rejects.toMatchObject({ status: 400 });
  });

  it('creates a job, publishes to RabbitMQ, advances the quote to bind, and emits progress', async () => {
    jest.spyOn(repo, 'findQuoteById').mockResolvedValue(baseQuote);
    jest.spyOn(repo, 'findCarrierById').mockResolvedValue(baseCarrier);
    jest.spyOn(repo, 'insertCarrierJob').mockResolvedValue(baseJob);
    const updateQuoteSpy = jest
      .spyOn(repo, 'updateQuote')
      .mockResolvedValue({ ...baseQuote, funnel_stage: 'bind' });
    const publishSpy = jest.spyOn(rabbitmq, 'publishBindRequested').mockResolvedValue();
    const emitSpy = jest.spyOn(bindEvents, 'emitBindProgress').mockImplementation(() => {});

    const job = await bindService.requestBind('quote-1');

    expect(job).toEqual(baseJob);
    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', quoteId: 'quote-1', carrierCode: 'acme' }),
    );
    expect(updateQuoteSpy).toHaveBeenCalledWith('quote-1', { funnel_stage: 'bind' });
    expect(emitSpy).toHaveBeenCalledWith('quote-1', expect.objectContaining({ status: 'pending' }));
  });

  it('marks the job failed and rethrows if the RabbitMQ publish fails', async () => {
    jest.spyOn(repo, 'findQuoteById').mockResolvedValue(baseQuote);
    jest.spyOn(repo, 'findCarrierById').mockResolvedValue(baseCarrier);
    jest.spyOn(repo, 'insertCarrierJob').mockResolvedValue(baseJob);
    jest.spyOn(repo, 'updateQuote').mockResolvedValue({ ...baseQuote, funnel_stage: 'bind' });
    jest.spyOn(rabbitmq, 'publishBindRequested').mockRejectedValue(new Error('connection refused'));
    const updateJobSpy = jest
      .spyOn(repo, 'updateCarrierJob')
      .mockResolvedValue({
        ...baseJob,
        status: 'failed',
        last_error: 'Failed to publish to RabbitMQ: connection refused',
      });
    jest.spyOn(bindEvents, 'emitBindProgress').mockImplementation(() => {});

    await expect(bindService.requestBind('quote-1')).rejects.toMatchObject({ status: 502 });
    expect(updateJobSpy).toHaveBeenCalledWith('job-1', expect.objectContaining({ status: 'failed' }));
  });
});

describe('reportBindProgress', () => {
  it('marks the quote bound when the job succeeds', async () => {
    jest.spyOn(repo, 'findCarrierJobById').mockResolvedValue(baseJob);
    jest.spyOn(repo, 'updateCarrierJob').mockResolvedValue({ ...baseJob, status: 'succeeded' });
    const updateQuoteSpy = jest
      .spyOn(repo, 'updateQuote')
      .mockResolvedValue({ ...baseQuote, status: 'bound' });
    jest.spyOn(bindEvents, 'emitBindProgress').mockImplementation(() => {});

    await bindService.reportBindProgress('job-1', { status: 'succeeded' });

    expect(updateQuoteSpy).toHaveBeenCalledWith('quote-1', { status: 'bound' });
  });

  it('does not touch the quote status for a non-terminal status update', async () => {
    jest.spyOn(repo, 'findCarrierJobById').mockResolvedValue(baseJob);
    jest.spyOn(repo, 'updateCarrierJob').mockResolvedValue({ ...baseJob, status: 'running' });
    const updateQuoteSpy = jest.spyOn(repo, 'updateQuote');
    jest.spyOn(bindEvents, 'emitBindProgress').mockImplementation(() => {});

    await bindService.reportBindProgress('job-1', { status: 'running', incrementAttempt: true });

    expect(updateQuoteSpy).not.toHaveBeenCalled();
  });
});
