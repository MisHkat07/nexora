const request = require('supertest');
const mongoose = require('mongoose');

process.env.SIGNUP_ENABLED = 'true';
// Lets each test use its own IP (X-Forwarded-For) under the per-IP signup limit
process.env.TRUST_PROXY = '1';
process.env.RESEND_API = 're_test_key';
process.env.EMAIL_FROM = 'Nexora <hello@nexora.test>';
process.env.APP_URL = 'https://app.nexora.test';

const mockSend = jest.fn(async () => ({ data: { id: 'msg' }, error: null }));
jest.mock('resend', () => ({ Resend: jest.fn(() => ({ emails: { send: mockSend } })) }));
jest.mock('@/controllers/pdfController', () => ({
  generatePdf: jest.fn(async () => Buffer.from('%PDF-1.4 test')),
}));

const { createTestApp, closeTestApp } = require('./helpers/app');
const { createAdmin } = require('./helpers/factories');

let app;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(closeTestApp);
beforeEach(() => mockSend.mockClear());

let ip = 0;
// Signup is rate limited per IP; give each test its own
const register = (body) =>
  request(app)
    .post('/api/register')
    .set('X-Forwarded-For', `198.51.100.${++ip}`)
    .send({ companyName: 'Globex Ltd', name: 'Hank', password: 'long-password', country: 'Bangladesh', ...body });

const emailedLink = () => {
  const [, userId, token] = mockSend.mock.calls.at(-1)[0].text.match(/\/verify-email\/([0-9a-f]{24})\/([0-9a-f]{64})/);
  return { userId, token };
};

describe('#17 self-serve signup', () => {
  test('creates an organization with its owner, defaults and a logged-in session', async () => {
    const res = await register({ email: 'Hank@Globex.com' });
    expect(res.status).toBe(201);
    expect(res.body.result).toMatchObject({ email: 'hank@globex.com', role: 'owner', emailVerified: false });

    const admin = await mongoose.model('Admin').findOne({ email: 'hank@globex.com' });
    const org = await mongoose.model('Organization').findById(admin.organizationId);
    expect(org.name).toBe('Globex Ltd');
    expect(String(org.owner)).toBe(String(admin._id));

    const settings = await mongoose.model('Setting').find({ organizationId: org._id });
    const byKey = Object.fromEntries(settings.map((s) => [s.settingKey, s.settingValue]));
    expect(byKey).toMatchObject({ company_name: 'Globex Ltd', company_email: 'hank@globex.com', company_country: 'Bangladesh' });
    expect(await mongoose.model('Taxes').countDocuments({ organizationId: org._id })).toBe(1);
    expect(await mongoose.model('PaymentMode').countDocuments({ organizationId: org._id })).toBe(1);

    // The returned session works and sees only the new organization
    const clients = await request(app).get('/api/client/listAll').set('Authorization', `Bearer ${res.body.result.token}`);
    expect([200, 203]).toContain(clients.status);
    expect(clients.body.result).toEqual([]);
  });

  test('sends a confirmation link to APP_URL, and the link verifies the address once', async () => {
    const res = await register({ email: 'verify@globex.com' });
    const { to, subject } = mockSend.mock.calls[0][0];
    expect(to).toBe('verify@globex.com');
    expect(subject).toBe('Confirm your email address');
    const { userId, token } = emailedLink();

    const ok = await request(app).post('/api/verify-email').send({ userId, token });
    expect(ok.status).toBe(200);
    const login = await request(app).post('/api/login').send({ email: 'verify@globex.com', password: 'long-password' });
    expect(login.body.result.emailVerified).toBe(true);

    const again = await request(app).post('/api/verify-email').send({ userId, token });
    expect(again.body.message).toMatch(/already confirmed/);
    expect(res.status).toBe(201);
  });

  test('a wrong or expired confirmation token is rejected', async () => {
    await register({ email: 'expired@globex.com' });
    const { userId, token } = emailedLink();
    expect((await request(app).post('/api/verify-email').send({ userId, token: 'f'.repeat(64) })).status).toBe(403);

    await mongoose.model('AdminPassword').updateOne({ user: userId }, { emailTokenExpires: new Date(Date.now() - 1000) });
    expect((await request(app).post('/api/verify-email').send({ userId, token })).status).toBe(403);
  });

  test('unverified accounts can work but cannot email customers until confirmed', async () => {
    const res = await register({ email: 'spam@globex.com' });
    const auth = (req) => req.set('Authorization', `Bearer ${res.body.result.token}`);
    const client = await auth(request(app).post('/api/client/create')).send({ name: 'C', email: 'c@client.com' });
    expect(client.status).toBe(200);

    const admin = await mongoose.model('Admin').findOne({ email: 'spam@globex.com' });
    const invoice = await mongoose.model('Invoice').create({
      organizationId: admin.organizationId, createdBy: admin._id, client: client.body.result._id,
      number: 1, year: 2026, date: new Date(), expiredDate: new Date(),
      items: [{ itemName: 'X', quantity: 1, price: 1, total: 1 }], total: 1,
    });
    mockSend.mockClear();
    const mail = await auth(request(app).post('/api/invoice/mail')).send({ id: String(invoice._id) });
    expect(mail.status).toBe(403);
    expect(mail.body.message).toMatch(/Confirm your email address/);
    expect(mockSend).not.toHaveBeenCalled();

    const resend = await auth(request(app).post('/api/resend-verification').set('X-Forwarded-For', '203.0.113.99'));
    expect(resend.status).toBe(200);
    expect(mockSend.mock.calls[0][0].to).toBe('spam@globex.com');
  });

  test('an email that already has an account is refused, even when two signups race', async () => {
    await createAdmin({ email: 'taken@globex.com' });
    const res = await register({ email: 'taken@globex.com' });
    expect(res.status).toBe(409);

    const [r1, r2] = await Promise.all([register({ email: 'race@globex.com' }), register({ email: 'race@globex.com' })]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    expect(await mongoose.model('Admin').countDocuments({ email: 'race@globex.com' })).toBe(1);
    // The losing signup left no half-created organization behind
    expect(await mongoose.model('Organization').countDocuments({ name: 'Globex Ltd', owner: { $exists: false } })).toBe(0);
  });

  test('input is validated', async () => {
    expect((await register({ email: 'short@globex.com', password: 'short' })).status).toBe(400);
    expect((await register({ email: 'not-an-email' })).status).toBe(400);
    expect((await register({ email: 'x@globex.com', companyName: '' })).status).toBe(400);
  });

  test('public config tells the login page signup is on', async () => {
    const res = await request(app).get('/api/public-config');
    expect(res.body.result).toEqual({ signupEnabled: true });
  });
});
