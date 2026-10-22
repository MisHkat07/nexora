const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('@/services/email', () => ({
  ...jest.requireActual('@/services/email'),
  sendEmail: jest.fn(async () => ({ id: 'email-id' })),
}));
const { sendEmail: sendMail } = require('@/services/email');

const { createTestApp, closeTestApp } = require('./helpers/app');
const { createAdmin, loginAs } = require('./helpers/factories');

let app;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(closeTestApp);
beforeEach(() => sendMail.mockClear());

// Requests a reset and returns { userId, resetToken } parsed from the emailed link
const requestReset = async (email) => {
  const res = await request(app).post('/api/forgetpassword').send({ email });
  expect(res.status).toBe(200);
  const { text } = sendMail.mock.calls[0][0];
  const [, userId, resetToken] = text.match(/\/resetpassword\/([0-9a-f]{24})\/([0-9a-f]{64})/);
  return { userId, resetToken };
};

describe('password reset', () => {
  test('the email goes to the user and links to this app (APP_URL), not a third-party site', async () => {
    await createAdmin({ email: 'link@test.com' });
    await request(app).post('/api/forgetpassword').send({ email: 'link@test.com' });
    const { to, html, text } = sendMail.mock.calls[0][0];
    expect(to).toBe('link@test.com');
    expect(text).toMatch(/http:\/\/localhost:3000\/resetpassword\/[0-9a-f]{24}\/[0-9a-f]{64}/);
    expect(html + text).not.toMatch(/idurar/i);
  });

  test('a failing email provider still returns the generic response', async () => {
    await createAdmin({ email: 'fail@test.com' });
    sendMail.mockRejectedValueOnce(new Error('provider down'));
    const res = await request(app).post('/api/forgetpassword').send({ email: 'fail@test.com' });
    expect(res.status).toBe(200);
  });

  test('unknown emails get the same response and no email is sent', async () => {
    const res = await request(app).post('/api/forgetpassword').send({ email: 'nobody@test.com' });
    expect(res.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('only a hash of the token is stored', async () => {
    const { admin } = await createAdmin({ email: 'hash@test.com' });
    const { resetToken } = await requestReset('hash@test.com');
    const stored = await mongoose.model('AdminPassword').findOne({ user: admin._id });
    expect(resetToken).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.resetToken).not.toBe(resetToken);
    expect(stored.resetTokenExpires.getTime()).toBeGreaterThan(Date.now());
  });

  test('a valid token resets the password, signs out old sessions and is single-use', async () => {
    const { token: oldSession } = await loginAs(app, { email: 'reset@test.com', password: 'oldpassword' });
    const { userId, resetToken } = await requestReset('reset@test.com');

    const res = await request(app)
      .post('/api/resetpassword')
      .send({ userId, resetToken, password: 'newpassword' });
    expect(res.status).toBe(200);

    const oldSessionRes = await request(app)
      .get('/api/client/list')
      .set('Authorization', `Bearer ${oldSession}`);
    expect(oldSessionRes.status).toBe(401);

    const login = await request(app)
      .post('/api/login')
      .send({ email: 'reset@test.com', password: 'newpassword' });
    expect(login.status).toBe(200);

    const reuse = await request(app)
      .post('/api/resetpassword')
      .send({ userId, resetToken, password: 'anotherpassword' });
    expect(reuse.status).toBe(403);
  });

  test('a wrong or expired token is rejected', async () => {
    const { admin } = await createAdmin({ email: 'expired@test.com' });
    const { userId, resetToken } = await requestReset('expired@test.com');

    const wrong = await request(app)
      .post('/api/resetpassword')
      .send({ userId, resetToken: 'f'.repeat(64), password: 'newpassword' });
    expect(wrong.status).toBe(403);

    await mongoose
      .model('AdminPassword')
      .updateOne({ user: admin._id }, { resetTokenExpires: new Date(Date.now() - 1000) });
    const expired = await request(app)
      .post('/api/resetpassword')
      .send({ userId, resetToken, password: 'newpassword' });
    expect(expired.status).toBe(403);
  });

  test('an unknown user id is rejected without crashing', async () => {
    const res = await request(app).post('/api/resetpassword').send({
      userId: new mongoose.Types.ObjectId().toString(),
      resetToken: 'abc',
      password: 'newpassword',
    });
    expect(res.status).toBe(403);
  });

  test('short passwords are rejected', async () => {
    await createAdmin({ email: 'short@test.com' });
    const { userId, resetToken } = await requestReset('short@test.com');
    const res = await request(app).post('/api/resetpassword').send({ userId, resetToken, password: 'abc' });
    expect(res.status).toBe(400);
  });
});
