const request = require('supertest');
const mongoose = require('mongoose');
const { authenticator } = require('otplib');

const { createTestApp, closeTestApp } = require('./helpers/app');
const { createAdmin, loginAs } = require('./helpers/factories');

let app;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(closeTestApp);

const enroll = async (auth) => {
  const setup = await auth(request(app).post('/api/auth/2fa/setup'));
  expect(setup.status).toBe(200);
  const code = authenticator.generate(setup.body.result.secret);
  const confirm = await auth(request(app).post('/api/auth/2fa/confirm')).send({ code });
  expect(confirm.status).toBe(200);
  return confirm.body.result.recoveryCodes;
};

describe('two-factor authentication', () => {
  test('login then requires a code, and each recovery code works once', async () => {
    const email = 'totp@test.com';
    const password = 'secret123';
    const { auth } = await loginAs(app, { email, password });
    const [recovery] = await enroll(auth);

    const passwordOnly = await request(app).post('/api/login').send({ email, password });
    expect(passwordOnly.status).toBe(200);
    expect(passwordOnly.body.result.twoFactorRequired).toBe(true);
    expect(passwordOnly.body.result.token).toBeUndefined();

    const bad = await request(app)
      .post('/api/auth/2fa/challenge')
      .send({ ticket: passwordOnly.body.result.ticket, code: '000000' });
    expect(bad.status).toBe(403);

    const again = await request(app).post('/api/login').send({ email, password });
    const good = await request(app)
      .post('/api/auth/2fa/challenge')
      .send({ ticket: again.body.result.ticket, recoveryCode: recovery });
    expect(good.status).toBe(200);
    expect(good.body.result.token).toEqual(expect.any(String));
    expect(
      (await request(app).get('/api/client/list').set('Authorization', `Bearer ${good.body.result.token}`)).status
    ).not.toBe(401);

    const third = await request(app).post('/api/login').send({ email, password });
    const reused = await request(app)
      .post('/api/auth/2fa/challenge')
      .send({ ticket: third.body.result.ticket, recoveryCode: recovery });
    expect(reused.status).toBe(403);
  });

  test('an organization can require every member to enroll before using the app', async () => {
    const { auth, admin } = await loginAs(app, { email: 'required@test.com' });
    const turnedOn = await auth(request(app).patch('/api/organization')).send({ requireTwoFactor: true });
    expect(turnedOn.status).toBe(200);

    const blocked = await auth(request(app).get('/api/client/list'));
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('two_factor_enrollment_required');

    expect((await auth(request(app).post('/api/auth/2fa/setup'))).status).toBe(200);
    await enroll(auth);
    expect((await auth(request(app).get('/api/client/list'))).status).not.toBe(403);

    const org = await mongoose.model('Organization').findById(admin.organizationId);
    expect(org.requireTwoFactor).toBe(true);
  });
});
