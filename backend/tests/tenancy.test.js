const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('@/controllers/pdfController', () => ({
  generatePdf: jest.fn(async () => Buffer.from('%PDF-1.4 test')),
}));

const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs, createClient, createInvoice, createOrganization } = require('./helpers/factories');

/*
  Two companies on one deployment. Everything company A's user does must stay inside A:
  B's records are invisible (404 / not listed) and can't be changed, paid, converted or downloaded.
*/
let app, orgA, orgB, a, b, clientB, invoiceB, quoteB, paymentB;
beforeAll(async () => {
  app = await createTestApp();
  orgA = await createOrganization({ name: 'Company A' });
  orgB = await createOrganization({ name: 'Company B' });
  a = await loginAs(app, { email: 'a@company-a.com', organizationId: orgA._id });
  b = await loginAs(app, { email: 'b@company-b.com', organizationId: orgB._id });

  clientB = await createClient({ name: 'Secret Client of B', organizationId: orgB._id });
  invoiceB = await createInvoice(b.admin, clientB, { number: 900 });
  quoteB = await mongoose.model('Quote').create({
    organizationId: orgB._id,
    createdBy: b.admin._id,
    client: clientB._id,
    number: 901,
    year: 2026,
    date: new Date(),
    expiredDate: new Date(),
    items: [{ itemName: 'X', quantity: 1, price: 10, total: 10 }],
    total: 10,
  });
  paymentB = (
    await b.auth(request(app).post('/api/payment/create')).send({
      invoice: String(invoiceB._id),
      number: 1,
      date: new Date().toISOString(),
      amount: 10,
    })
  ).body.result;
  await createClient({ name: 'Client of A', organizationId: orgA._id });
});
afterAll(closeTestApp);

const asA = (method, url) => a.auth(request(app)[method](url));
const ids = (res) => (res.body.result || []).map((doc) => String(doc._id));

describe('#15 tenant isolation', () => {
  test.each([
    ['client', () => clientB._id],
    ['invoice', () => invoiceB._id],
    ['quote', () => quoteB._id],
    ['payment', () => paymentB._id],
  ])("another organization's %s can't be read, updated or deleted", async (entity, id) => {
    expect((await asA('get', `/api/${entity}/read/${id()}`)).status).toBe(404);
    expect([400, 404]).toContain(
      (await asA('patch', `/api/${entity}/update/${id()}`).send({ name: 'hacked' })).status
    );
    expect((await asA('delete', `/api/${entity}/delete/${id()}`)).status).toBe(404);
  });

  test("lists, search, filter and listAll never include another organization's data", async () => {
    for (const entity of ['client', 'invoice', 'quote', 'payment']) {
      const list = await asA('get', `/api/${entity}/list?items=100`);
      const all = await asA('get', `/api/${entity}/listAll`);
      expect(ids(list)).not.toEqual(expect.arrayContaining([String(clientB._id)]));
      for (const res of [list, all]) {
        for (const doc of res.body.result || []) {
          expect(String(doc.organizationId)).toBe(String(orgA._id));
        }
      }
    }
    const search = await asA('get', '/api/client/search?q=Secret&fields=name');
    expect(search.body.result).toEqual([]);
    const filter = await asA('get', `/api/client/filter?filter=_id&equal=${clientB._id}`);
    expect(filter.body.result).toEqual([]);
    const byClient = await asA('get', `/api/invoice/list?filter=client&equal=${clientB._id}`);
    expect(byClient.body.result).toEqual([]);
  });

  test('dashboard summaries only count the own organization', async () => {
    // At this point company A has no invoices or payments; company B has an invoice of 100 paid 10
    const invoices = await asA('get', '/api/invoice/summary');
    expect(invoices.status).toBe(200);
    expect(invoices.body.result.total || 0).toBe(0);
    const payments = await asA('get', '/api/payment/summary');
    expect(payments.body.result?.total || 0).toBe(0);
  });

  test("another organization's invoice can't be paid, emailed or downloaded", async () => {
    const pay = await asA('post', '/api/payment/create').send({
      invoice: String(invoiceB._id),
      number: 1,
      date: new Date().toISOString(),
      amount: 1,
    });
    expect(pay.status).toBe(404);
    expect((await asA('post', '/api/invoice/mail').send({ id: String(invoiceB._id) })).status).toBe(404);
    expect((await asA('get', `/api/invoice/download-link/${invoiceB._id}`)).status).toBe(404);
    expect((await asA('post', `/api/quote/convert/${quoteB._id}`)).status).toBe(404);
    expect((await mongoose.model('Invoice').findById(invoiceB._id)).credit).toBe(10);
  });

  test("a download link signed for one organization can't open another's document", async () => {
    const { body } = await b.auth(request(app).get(`/api/invoice/download-link/${invoiceB._id}`));
    expect((await request(app).get('/' + body.result.url)).status).toBe(200);

    // A's link for A's own invoice, with B's invoice id swapped in, is rejected
    const invoiceA = await createInvoice(a.admin, await createClient({ organizationId: orgA._id }));
    const linkA = (await asA('get', `/api/invoice/download-link/${invoiceA._id}`)).body.result.url;
    const tokenA = new URL('http://x/' + linkA).searchParams.get('token');
    const res = await request(app).get(`/download/invoice/invoice-${invoiceB._id}.pdf?token=${tokenA}`);
    expect(res.status).toBe(401);
  });

  test('new records are stamped with the creator’s organization, whatever the body says', async () => {
    const res = await asA('post', '/api/client/create').send({ name: 'Mine', organizationId: String(orgB._id) });
    expect(res.status).toBe(200);
    const saved = await mongoose.model('Client').findById(res.body.result._id);
    expect(String(saved.organizationId)).toBe(String(orgA._id));
  });

  test('settings are per organization', async () => {
    await mongoose.model('Setting').insertMany([
      { organizationId: orgA._id, settingCategory: 'company_settings', settingKey: 'company_name', settingValue: 'A Ltd' },
      { organizationId: orgB._id, settingCategory: 'company_settings', settingKey: 'company_name', settingValue: 'B Ltd' },
    ]);
    const res = await asA('get', '/api/setting/listAll');
    const names = res.body.result.filter((s) => s.settingKey === 'company_name').map((s) => s.settingValue);
    expect(names).toEqual(['A Ltd']);

    await asA('patch', '/api/setting/updateBySettingKey/company_name').send({ settingValue: 'A Renamed' });
    const b2 = await mongoose.model('Setting').findOne({ organizationId: orgB._id, settingKey: 'company_name' });
    expect(b2.settingValue).toBe('B Ltd');
  });

  test("an admin can't change the password of another organization's user", async () => {
    const res = await asA('patch', `/api/admin/password-update/${b.admin._id}`).send({ password: 'takeover123' });
    expect(res.status).toBe(404);
    expect((await request(app).post('/api/login').send({ email: 'b@company-b.com', password: 'secret123' })).status).toBe(200);
  });
});

test('an email can only belong to one account, across all organizations', async () => {
  const { createAdmin } = require('./helpers/factories');
  await expect(createAdmin({ email: 'A@Company-A.com', organizationId: orgB._id })).rejects.toThrow(
    /duplicate key/
  );
});

describe('#15 tenant plugin', () => {
  const { withTenant } = require('@/tenancy/context');
  const Client = () => mongoose.model('Client');

  test('inside a request context, queries without an organization are refused', async () => {
    const { requestContext } = require('@/tenancy/context');
    await new Promise((resolve, reject) =>
      requestContext({}, {}, () => Client().find().exec().then(() => reject(new Error('should fail')), resolve))
    ).then((error) => expect(error.message).toMatch(/Tenant context missing/));
  });

  test('aggregations, counts and bulk writes are scoped', async () => {
    const countA = await withTenant(orgA._id, () => Client().countDocuments());
    const aggA = await withTenant(orgA._id, () => Client().aggregate([{ $count: 'n' }]));
    expect(aggA[0].n).toBe(countA);
    expect(countA).toBe(await Client().countDocuments({ organizationId: orgA._id }));

    await withTenant(orgA._id, () =>
      Client().bulkWrite([{ updateMany: { filter: {}, update: { $set: { country: 'Bulkland' } } } }])
    );
    expect(await Client().countDocuments({ organizationId: orgB._id, country: 'Bulkland' })).toBe(0);
  });

  test("a document can't be moved to another organization", async () => {
    const mine = await createClient({ name: 'Stay', organizationId: orgA._id });
    await withTenant(orgA._id, () =>
      Client().updateOne({ _id: mine._id }, { $set: { organizationId: orgB._id, name: 'Moved?' } })
    );
    const saved = await Client().findById(mine._id);
    expect(saved.name).toBe('Moved?');
    expect(String(saved.organizationId)).toBe(String(orgA._id));

    const foreign = new (Client())({ name: 'Foreign', organizationId: orgB._id });
    await expect(withTenant(orgA._id, () => foreign.save())).rejects.toThrow(/another organization/);
  });
});

describe('#16 migrating existing data', () => {
  test('records without an organization are assigned to a default one; running again changes nothing', async () => {
    const { ensureTenancy } = require('@/tenancy/migrate');
    const legacy = await mongoose.model('Client').collection.insertOne({ name: 'Legacy client', removed: false });

    const first = await ensureTenancy({ logger: {} });
    expect(first.migrated.Client).toBe(1);
    const saved = await mongoose.model('Client').findById(legacy.insertedId);
    expect(String(saved.organizationId)).toBe(String(first.organizationId));

    const second = await ensureTenancy({ logger: {} });
    expect(second.migrated).toEqual({});
  });
});
