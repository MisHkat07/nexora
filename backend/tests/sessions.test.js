const request = require('supertest');
const jwt = require('jsonwebtoken');

const { createTestApp, closeTestApp } = require('./helpers/app');
const { createAdmin, loginAs } = require('./helpers/factories');

let app;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(closeTestApp);

const cookiePair = (setCookie) => {
  const raw = [].concat(setCookie).find((value) => String(value).startsWith('nexora_rt='));
  return raw.split(';')[0];
};

describe('refresh sessions', () => {
  test('login sets an httpOnly refresh cookie and a 15-minute access token', async () => {
    const { email, password } = await createAdmin({ email: 'cookie@test.com' });
    const res = await request(app).post('/api/login').send({ email, password });
    expect(res.status).toBe(200);
    const cookie = [].concat(res.headers['set-cookie']).join(';');
    expect(cookie).toMatch(/nexora_rt=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);
    const decoded = jwt.decode(res.body.result.token);
    expect(decoded.sid).toEqual(expect.any(String));
    expect(decoded.exp - decoded.iat).toBe(15 * 60);
    expect(res.body.result.token).not.toMatch(/loggedSessions/);
  });

  test('the refresh cookie issues a new access token, and a reused refresh token ends the session', async () => {
    const { email, password } = await createAdmin({ email: 'refresh@test.com' });
    const agent = request.agent(app);
    const login = await agent.post('/api/login').send({ email, password });
    const firstCookie = cookiePair(login.headers['set-cookie']);
    const firstToken = login.body.result.token;

    const refreshed = await agent.post('/api/auth/refresh');
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.result.token).toEqual(expect.any(String));
    expect(jwt.decode(refreshed.body.result.token).sid).toBe(jwt.decode(firstToken).sid);

    // Rotate once more so the original secret is no longer inside the grace window
    expect((await agent.post('/api/auth/refresh')).status).toBe(200);

    const reused = await request(app).post('/api/auth/refresh').set('Cookie', firstCookie);
    expect(reused.status).toBe(401);

    const afterTheft = await agent.get('/api/client/list');
    expect(afterTheft.status).toBe(401);
    expect((await request(app).get('/api/client/list').set('Authorization', `Bearer ${firstToken}`)).status).toBe(401);
  });

  test('lists this device and can sign every session out', async () => {
    const { auth } = await loginAs(app, { email: 'devices@test.com' });
    const listed = await auth(request(app).get('/api/auth/sessions'));
    expect(listed.status).toBe(200);
    expect(listed.body.result.some((session) => session.current)).toBe(true);

    const ended = await auth(request(app).post('/api/auth/logout-all'));
    expect(ended.status).toBe(200);
    expect((await auth(request(app).get('/api/client/list'))).status).toBe(401);
  });
});
