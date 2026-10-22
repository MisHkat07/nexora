const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('@/controllers/middlewaresControllers/createAuthMiddleware/sendMail', () => jest.fn());
const sendMail = require('@/controllers/middlewaresControllers/createAuthMiddleware/sendMail');

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
  const { link } = sendMail.mock.calls[0][0];
  const [userId, resetToken] = link.split('/resetpassword/')[1].split('/');
  return { userId, resetToken };
};

describe('password reset', () => {
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
