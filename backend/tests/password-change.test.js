const request = require('supertest');
const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs } = require('./helpers/factories');

let app;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(closeTestApp);

const login = (email, password) => request(app).post('/api/login').send({ email, password });

describe('password changes', () => {
  test('changing your own password keeps this session and signs out the others', async () => {
    const { auth, token } = await loginAs(app, { email: 'me@test.com', password: 'oldpassword' });
    const other = (await login('me@test.com', 'oldpassword')).body.result.token;

    const res = await auth(request(app).patch('/api/admin/profile/password')).send({
      password: 'newpassword1',
      passwordCheck: 'newpassword1',
    });
    expect(res.status).toBe(200);

    const withCurrent = await request(app).get('/api/client/list').set('Authorization', `Bearer ${token}`);
    expect([200, 203]).toContain(withCurrent.status);
    const withOther = await request(app).get('/api/client/list').set('Authorization', `Bearer ${other}`);
    expect(withOther.status).toBe(401);
    expect((await login('me@test.com', 'newpassword1')).status).toBe(200);
  });

  test('short, missing or mismatched passwords are rejected with a message', async () => {
    const { auth } = await loginAs(app, { email: 'short@test.com' });
    const short = await auth(request(app).patch('/api/admin/profile/password')).send({
      password: 'abc',
      passwordCheck: 'abc',
    });
    expect(short.status).toBe(400);
    expect(short.body.message).toMatch(/at least 8/);

    const mismatch = await auth(request(app).patch('/api/admin/profile/password')).send({
      password: 'abcdefgh',
      passwordCheck: 'abcdefgi',
    });
    expect(mismatch.status).toBe(400);

    const missing = await auth(request(app).patch(`/api/admin/password-update/000000000000000000000000`)).send({});
    expect([400, 404]).toContain(missing.status);
  });

  test('the default demo account can change its password outside demo mode', async () => {
    const { auth } = await loginAs(app, { email: 'admin@demo.com', password: 'admin123' });
    const res = await auth(request(app).patch('/api/admin/profile/password')).send({
      password: 'a-real-password',
      passwordCheck: 'a-real-password',
    });
    expect(res.status).toBe(200);
  });

  test('in demo mode the demo password is locked', async () => {
    process.env.DEMO_MODE = 'true';
    try {
      // The demo account from the previous test
      const { token } = (await login('admin@demo.com', 'a-real-password')).body.result;
      const res = await request(app)
        .patch('/api/admin/profile/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
        password: 'another-password',
        passwordCheck: 'another-password',
      });
      expect(res.status).toBe(403);
    } finally {
      delete process.env.DEMO_MODE;
    }
  });
});
