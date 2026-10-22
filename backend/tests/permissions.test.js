const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('@/controllers/pdfController', () => ({
  generatePdf: jest.fn(async () => Buffer.from('%PDF-1.4 test')),
}));

const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs, createClient, createInvoice } = require('./helpers/factories');
const { can, permissionsFor, ROLES } = require('@/auth/permissions');

let app, owner, users, client, invoice, quote;
beforeAll(async () => {
  app = await createTestApp();
  owner = await loginAs(app, { email: 'owner@rbac.com', role: 'owner' });
  users = {};
  for (const role of ['admin', 'accountant', 'sales', 'viewer']) {
    users[role] = await loginAs(app, { email: `${role}@rbac.com`, role });
  }
  client = await createClient();
  invoice = await createInvoice(owner.admin, client);
  quote = await mongoose.model('Quote').create({
    organizationId: owner.admin.organizationId,
    createdBy: owner.admin._id,
    client: client._id,
    number: 1,
    year: 2026,
    date: new Date(),
    expiredDate: new Date(),
    items: [{ itemName: 'X', quantity: 1, price: 10, total: 10 }],
    total: 10,
  });
});
afterAll(closeTestApp);

const as = (role, method, url) => (role === 'owner' ? owner : users[role]).auth(request(app)[method](url));

// Routes whose handlers would succeed: a 403 means the role check stopped them
const actions = {
  'client:read': () => ['get', '/api/client/listAll'],
  'client:create': () => ['post', '/api/client/create', { name: 'New' }],
  'client:delete': () => ['delete', `/api/client/delete/${new mongoose.Types.ObjectId()}`],
  'invoice:read': () => ['get', `/api/invoice/read/${invoice._id}`],
  'invoice:delete': () => ['delete', `/api/invoice/delete/${new mongoose.Types.ObjectId()}`],
  'quote:read': () => ['get', `/api/quote/read/${quote._id}`],
  'quote:update': () => ['patch', `/api/quote/update/${new mongoose.Types.ObjectId()}`, {}],
  'quote:convert': () => ['post', `/api/quote/convert/${new mongoose.Types.ObjectId()}`],
  'payment:create': () => ['post', '/api/payment/create', {}],
  'taxes:create': () => ['post', '/api/taxes/create', {}],
  'setting:read': () => ['get', '/api/setting/listAll'],
  'setting:update': () => ['patch', '/api/setting/updateBySettingKey/company_name', { settingValue: 'X' }],
};

describe('#19 role-based access control', () => {
  test.each(ROLES.flatMap((role) => Object.keys(actions).map((permission) => [role, permission])))(
    '%s → %s',
    async (role, permission) => {
      const [method, url, body] = actions[permission]();
      let req = as(role, method, url);
      if (body) req = req.send(body);
      const res = await req;
      if (can(role, permission)) {
        expect(res.status).not.toBe(403);
      } else {
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/permission/);
      }
    }
  );

  test('the matrix matches the roles described in the roadmap', () => {
    expect(can('owner', 'anything:at-all')).toBe(true);
    expect(can('admin', 'team:manage')).toBe(true);
    expect(can('accountant', 'invoice:delete')).toBe(true);
    expect(can('accountant', 'quote:update')).toBe(false);
    expect(can('sales', 'quote:convert')).toBe(true);
    expect(can('sales', 'invoice:create')).toBe(false);
    expect(can('viewer', 'client:read')).toBe(true);
    expect(can('viewer', 'client:create')).toBe(false);
    expect(['accountant', 'sales', 'viewer'].some((role) => can(role, 'setting:update'))).toBe(false);
    expect(['accountant', 'sales', 'viewer'].some((role) => can(role, 'team:manage'))).toBe(false);
  });

  test('login returns the role and its permissions for the UI', async () => {
    const res = await request(app).post('/api/login').send({ email: 'viewer@rbac.com', password: 'secret123' });
    expect(res.body.result.role).toBe('viewer');
    expect(res.body.result.permissions).toEqual(permissionsFor('viewer'));
  });

  test('a viewer cannot upload a logo (checked before the file is stored)', async () => {
    const res = await as('viewer', 'patch', '/api/setting/upload/company_logo').attach(
      'file',
      Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'),
      'logo.png'
    );
    expect(res.status).toBe(403);
  });

  test("only team managers can change another user's password; everyone can change their own", async () => {
    const other = users.sales.admin._id;
    expect((await as('viewer', 'patch', `/api/admin/password-update/${other}`).send({ password: 'x'.repeat(10) })).status).toBe(403);
    expect((await as('admin', 'patch', `/api/admin/password-update/${other}`).send({ password: 'y'.repeat(10) })).status).toBe(200);
    const self = users.viewer.admin._id;
    expect((await as('viewer', 'patch', `/api/admin/password-update/${self}`).send({ password: 'z'.repeat(10) })).status).toBe(200);
  });

  test('an unknown role is denied everything', () => {
    expect(can('intern', 'client:read')).toBe(false);
  });
});
