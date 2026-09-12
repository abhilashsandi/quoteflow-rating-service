import request from 'supertest';
import { createApp } from './app';

describe('app', () => {
  const app = createApp();

  it('GET /health returns ok with no Origin header', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  describe('middleware ordering: internal routes vs CORS', () => {
    it('reaches the internal router with no Origin header (mounted before cors())', async () => {
      const res = await request(app).get('/internal/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('rejects the CORS-wrapped api router when no Origin header is sent', async () => {
      const res = await request(app).get('/ping');
      expect(res.status).toBe(403);
    });

    it('allows the CORS-wrapped api router when an allowed Origin header is sent', async () => {
      const res = await request(app).get('/ping').set('Origin', 'http://localhost:3000');
      expect(res.status).toBe(200);
      expect(res.body.pong).toBe(true);
    });
  });
});
