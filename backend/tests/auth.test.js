const request = require('supertest');
const { createTestApp, closeTestApp } = require('./helpers/app');
const { createAdmin, loginAs } = require('./helpers/factories');

let app;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(closeTestApp);

describe('auth', () => {
  test('login with valid credentials returns a token', async () => {
    const { email, password } = await createAdmin({ email: 'valid@test.com' });
    const res = await request(app).post('/api/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.result.token).toEqual(expect.any(String));
  });

  test('login with a wrong password is rejected', async () => {
    const { email } = await createAdmin({ email: 'wrongpass@test.com' });
    const res = await request(app).post('/api/login').send({ email, password: 'nope' });
    expect(res.status).toBe(403);
    expect(res.body.result).toBeNull();
  });

  test('an unknown email gets the same answer as a wrong password', async () => {
    const res = await request(app).post('/api/login').send({ email: 'ghost@test.com', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Invalid credentials.');
  });

  test('protected routes need a token', async () => {
    const res = await request(app).get('/api/client/list');
    expect(res.status).toBe(401);
  });

  test('a malformed token is rejected with 401', async () => {
    const res = await request(app).get('/api/client/list').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  test('logout invalidates the token', async () => {
    const { auth } = await loginAs(app, { email: 'logout@test.com' });
    expect([200, 203]).toContain((await auth(request(app).get('/api/client/list'))).status);
    await auth(request(app).post('/api/logout'));
    expect((await auth(request(app).get('/api/client/list'))).status).toBe(401);
  });
});
