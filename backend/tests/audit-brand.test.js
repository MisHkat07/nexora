const request = require('supertest');
const mongoose = require('mongoose');

const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs, createOrganization } = require('./helpers/factories');
const { withTenant } = require('@/tenancy/context');
const { documentEmail } = require('@/emailTemplate');

let app;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(closeTestApp);

const documentBody = (clientId, overrides = {}) => ({
  client: String(clientId),
  number: 7,
  year: 2026,
  status: 'draft',
  notes: '',
  date: '2026-01-10',
  expiredDate: '2026-02-10',
  taxRate: 10,
  items: [{ itemName: 'Design', description: '', quantity: 2, price: 150, total: 1 }],
  ...overrides,
});

describe('audit log', () => {
  test('editing an invoice total records who changed it and the old and new value', async () => {
    const { auth, admin } = await loginAs(app, { email: 'auditor@test.com' });
    const client = await mongoose.model('Client').create({
      name: 'Audited Co',
      organizationId: admin.organizationId,
    });
    const created = await auth(request(app).post('/api/invoice/create')).send(documentBody(client._id));
    expect(created.status).toBe(200);
    const id = created.body.result._id;

    const updated = await auth(request(app).patch(`/api/invoice/update/${id}`)).send(
      documentBody(client._id, { taxRate: 0, items: [{ itemName: 'Design', quantity: 1, price: 40, total: 0 }] })
    );
    expect(updated.body.result.total).toBe(40);

    const history = await auth(request(app).get(`/api/audit?entity=invoice&entityId=${id}`));
    expect(history.status).toBe(200);
    const change = history.body.result.find((row) => row.action === 'update');
    expect(change.user.email).toBe('auditor@test.com');
    const total = change.diff.find((entry) => entry.field === 'total');
    expect(total.from).toBe(330);
    expect(total.to).toBe(40);
  });

  test('a viewer cannot read the full audit log', async () => {
    const { auth } = await loginAs(app, { email: 'viewer-audit@test.com', role: 'viewer' });
    const res = await auth(request(app).get('/api/audit'));
    expect(res.status).toBe(403);
  });
});

describe('per-organization branding', () => {
  test('two organizations keep different brand colors, and email uses that color and footer', async () => {
    const first = await createOrganization({ name: 'Northwind' });
    const second = await createOrganization({ name: 'Contoso' });
    const Setting = mongoose.model('Setting');

    const setColor = (organizationId, color) =>
      withTenant(organizationId, async () => {
        const existing = await Setting.findOne({ settingKey: 'brand_color' });
        if (existing) {
          existing.settingValue = color;
          await existing.save();
          return;
        }
        await Setting.create({
          settingCategory: 'brand_settings',
          settingKey: 'brand_color',
          settingValue: color,
          valueType: 'string',
        });
      });

    await setColor(first._id, '#112233');
    await setColor(second._id, '#445566');

    const { loadSettings, invalidateSettings } = require('@/middlewares/settings');
    invalidateSettings();
    expect((await withTenant(first._id, () => loadSettings())).brand_color).toBe('#112233');
    expect((await withTenant(second._id, () => loadSettings())).brand_color).toBe('#445566');

    const { html } = documentEmail({
      companyName: 'Northwind',
      clientName: 'Ada',
      title: 'Invoice',
      intro: 'Here is your invoice',
      details: [['Total', '10']],
      message: '',
      downloadUrl: 'https://example.com/file',
      brandColor: '#112233',
      footer: 'Thanks for your business',
    });
    expect(html).toContain('#112233');
    expect(html).toContain('Thanks for your business');
  });
});
