const request = require('supertest');
const mongoose = require('mongoose');

process.env.SENTRY_DSN = 'https://public@o0.ingest.sentry.io/0';
const Sentry = require('@/instrument');

const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs } = require('./helpers/factories');

let app, auth;
beforeAll(async () => {
  app = await createTestApp();
  ({ auth } = await loginAs(app));
});
afterAll(async () => {
  delete process.env.SENTRY_DSN;
  await Sentry.close(0);
  await closeTestApp();
});

describe('#12 Sentry', () => {
  test('server errors are reported with the request id', async () => {
    const capture = jest.spyOn(Sentry, 'captureException').mockImplementation(() => 'event-id');
    jest.spyOn(mongoose.Query.prototype, 'exec').mockRejectedValueOnce(new Error('database down'));

    const res = await auth(request(app).get('/api/client/listAll'));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
    expect(capture).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'database down' }),
      { tags: { requestId: res.body.requestId } }
    );
    capture.mockRestore();
  });

  test('client errors (4xx) are not reported', async () => {
    const capture = jest.spyOn(Sentry, 'captureException');
    await auth(request(app).get('/api/client/read/not-an-id'));
    expect(capture).not.toHaveBeenCalled();
    capture.mockRestore();
  });

  test('credentials, bodies and download tokens are scrubbed before sending', () => {
    const { beforeSend } = Sentry.getClient().getOptions();
    const event = beforeSend({
      request: {
        headers: { authorization: 'Bearer secret', cookie: 'a=b', 'user-agent': 'x' },
        cookies: { a: 'b' },
        data: '{"password":"hunter2"}',
        query_string: 'token=signed-download-token',
      },
    });
    expect(event.request.headers).toEqual({ 'user-agent': 'x' });
    expect(event.request.cookies).toBeUndefined();
    expect(event.request.data).toBeUndefined();
    expect(event.request.query_string).toBe('[redacted]');
  });
});
