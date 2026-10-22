const request = require('supertest');
const mongoose = require('mongoose');

process.env.RESEND_API = 're_test_key';
process.env.EMAIL_FROM = 'Nexora <hello@nexora.test>';
process.env.APP_URL = 'https://app.nexora.test';

const mockSend = jest.fn(async () => ({ data: { id: 'msg' }, error: null }));
jest.mock('resend', () => ({ Resend: jest.fn(() => ({ emails: { send: mockSend } })) }));

const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs, createOrganization } = require('./helpers/factories');

let app, owner, admin;
beforeAll(async () => {
  app = await createTestApp();
  owner = await loginAs(app, { email: 'owner@team.com', role: 'owner' });
  admin = await loginAs(app, { email: 'admin@team.com', role: 'admin' });
});
afterAll(closeTestApp);
beforeEach(() => mockSend.mockClear());

const inviteLink = () => {
  const [, userId, token] = mockSend.mock.calls.at(-1)[0].text.match(/\/accept-invite\/([0-9a-f]{24})\/([0-9a-f]{64})/);
  return { userId, token };
};
const invite = (who, body) => who.auth(request(app).post('/api/team/invite')).send(body);
const accept = (body) => request(app).post('/api/accept-invite').send(body);

describe('#18 team invites', () => {
  test('an invited person joins the organization with the given role and is logged in', async () => {
    const res = await invite(owner, { email: 'Sam@Team.com', name: 'Sam', role: 'accountant' });
    expect(res.status).toBe(201);
    expect(res.body.result.emailSent).toBe(true);
    expect(res.body.result.inviteLink).toBeUndefined();
    const sent = mockSend.mock.calls[0][0];
    expect(sent.to).toBe('sam@team.com');
    expect(sent.subject).toMatch(/invited you to/);

    const { userId, token } = inviteLink();
    const details = await request(app).get(`/api/invite/${userId}/${token}`);
    expect(details.body.result).toMatchObject({ email: 'sam@team.com', role: 'accountant', organizationName: 'Test Co' });

    // Can't log in before accepting
    expect((await request(app).post('/api/login').send({ email: 'sam@team.com', password: 'anything12' })).status).not.toBe(200);

    const joined = await accept({ userId, token, name: 'Sam', surname: 'Lee', password: 'sams-password' });
    expect(joined.status).toBe(200);
    expect(joined.body.result).toMatchObject({ email: 'sam@team.com', role: 'accountant', emailVerified: true });
    const user = await mongoose.model('Admin').findById(userId);
    expect(String(user.organizationId)).toBe(String(owner.admin.organizationId));

    // The link is single-use, and the new password works
    expect((await accept({ userId, token, name: 'X', password: 'other-password' })).status).toBe(403);
    expect((await request(app).post('/api/login').send({ email: 'sam@team.com', password: 'sams-password' })).status).toBe(200);
  });

  test('the team list shows members with their status', async () => {
    await invite(owner, { email: 'pending@team.com', role: 'viewer' });
    const res = await owner.auth(request(app).get('/api/team'));
    const byEmail = Object.fromEntries(res.body.result.map((m) => [m.email, m]));
    expect(byEmail['owner@team.com']).toMatchObject({ role: 'owner', status: 'active' });
    expect(byEmail['pending@team.com']).toMatchObject({ role: 'viewer', status: 'invited' });
    expect(res.body.seats).toBe(res.body.result.length);
  });

  test("other organizations' members are not listed and can't be changed", async () => {
    const other = await createOrganization({ name: 'Elsewhere' });
    const outsider = await loginAs(app, { email: 'outsider@else.com', organizationId: other._id, role: 'viewer' });
    const res = await owner.auth(request(app).get('/api/team'));
    expect(res.body.result.map((m) => m.email)).not.toContain('outsider@else.com');
    const update = await owner.auth(request(app).patch(`/api/team/${outsider.admin._id}`)).send({ role: 'admin' });
    expect(update.status).toBe(404);
  });

  test('an existing email or an owner role is refused', async () => {
    expect((await invite(owner, { email: 'admin@team.com', role: 'viewer' })).status).toBe(409);
    expect((await invite(owner, { email: 'new@team.com', role: 'owner' })).status).toBe(400);
  });

  test('without email, the inviter gets the link to share', async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Domain not verified' } });
    const res = await invite(owner, { email: 'manual@team.com', role: 'sales' });
    expect(res.status).toBe(201);
    expect(res.body.result.emailSent).toBe(false);
    expect(res.body.result.inviteLink).toMatch(/^https:\/\/app\.nexora\.test\/accept-invite\/[0-9a-f]{24}\/[0-9a-f]{64}$/);
  });

  test('roles can be changed and members deactivated, which ends their sessions at once', async () => {
    const member = await loginAs(app, { email: 'member@team.com', role: 'sales' });
    expect((await member.auth(request(app).get('/api/client/listAll'))).status).not.toBe(401);

    const promote = await admin.auth(request(app).patch(`/api/team/${member.admin._id}`)).send({ role: 'accountant' });
    expect(promote.status).toBe(200);
    expect(promote.body.result.role).toBe('accountant');
    expect((await member.auth(request(app).get('/api/client/listAll'))).status).toBe(401);

    const again = await loginAs(app, { email: 'member2@team.com', role: 'sales' });
    await admin.auth(request(app).patch(`/api/team/${again.admin._id}`)).send({ enabled: false });
    expect((await again.auth(request(app).get('/api/client/listAll'))).status).toBe(401);
    expect((await request(app).post('/api/login').send({ email: 'member2@team.com', password: 'secret123' })).status).not.toBe(200);

    await admin.auth(request(app).patch(`/api/team/${again.admin._id}`)).send({ enabled: true });
    expect((await request(app).post('/api/login').send({ email: 'member2@team.com', password: 'secret123' })).status).toBe(200);
  });

  test("the owner can't be changed, and nobody can change their own access", async () => {
    expect((await admin.auth(request(app).patch(`/api/team/${owner.admin._id}`)).send({ role: 'viewer' })).status).toBe(403);
    expect((await admin.auth(request(app).patch(`/api/team/${owner.admin._id}`)).send({ enabled: false })).status).toBe(403);
    expect((await admin.auth(request(app).patch(`/api/team/${admin.admin._id}`)).send({ role: 'viewer' })).status).toBe(403);
  });

  test('pending invitations can be resent or cancelled; cancelling frees the email', async () => {
    const res = await invite(owner, { email: 'cancel@team.com', role: 'viewer' });
    const id = res.body.result.member._id;
    const { userId, token: oldToken } = inviteLink();

    expect((await owner.auth(request(app).post(`/api/team/${id}/resend-invite`))).status).toBe(200);
    // The new email invalidates the old link
    expect((await request(app).get(`/api/invite/${userId}/${oldToken}`)).status).toBe(403);

    expect((await owner.auth(request(app).delete(`/api/team/${id}`))).status).toBe(200);
    expect((await invite(owner, { email: 'cancel@team.com', role: 'viewer' })).status).toBe(201);
    // Active members can't be "cancelled"
    expect((await owner.auth(request(app).delete(`/api/team/${admin.admin._id}`))).status).toBe(400);
  });

  test('only owners and admins manage the team; everyone can see it', async () => {
    const viewer = await loginAs(app, { email: 'viewer@team.com', role: 'viewer' });
    expect((await viewer.auth(request(app).get('/api/team'))).status).toBe(200);
    expect((await invite(viewer, { email: 'x@team.com', role: 'viewer' })).status).toBe(403);
    expect((await viewer.auth(request(app).patch(`/api/team/${admin.admin._id}`)).send({ role: 'viewer' })).status).toBe(403);
  });

  test('an expired or wrong invitation is rejected', async () => {
    await invite(owner, { email: 'late@team.com', role: 'viewer' });
    const { userId, token } = inviteLink();
    expect((await accept({ userId, token: 'f'.repeat(64), name: 'L', password: 'long-password' })).status).toBe(403);
    await mongoose.model('AdminPassword').updateOne({ user: userId }, { inviteTokenExpires: new Date(Date.now() - 1000) });
    expect((await accept({ userId, token, name: 'L', password: 'long-password' })).status).toBe(403);
  });
});
