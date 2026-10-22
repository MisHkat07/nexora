const request = require('supertest');
const mongoose = require('mongoose');
const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs, createClient, createInvoice } = require('./helpers/factories');

let app, auth, admin, client;
beforeAll(async () => {
  app = await createTestApp();
  ({ auth, admin } = await loginAs(app));
  client = await createClient();
});
afterAll(closeTestApp);

const documentBody = (overrides = {}) => ({
  client: String(client._id),
  number: 7,
  year: 2026,
  status: 'draft',
  notes: '',
  date: '2026-01-10',
  expiredDate: '2026-02-10',
  taxRate: 10,
  items: [
    { itemName: 'Design', description: '', quantity: 2, price: 150, total: 1 },
    { itemName: 'Hosting', description: '', quantity: 1, price: 20, total: 1 },
  ],
  ...overrides,
});

describe.each(['invoice', 'quote'])('%s', (entity) => {
  const Model = () => mongoose.model(entity === 'invoice' ? 'Invoice' : 'Quote');

  test('create computes totals on the server, ignoring client-sent totals', async () => {
    const res = await auth(request(app).post(`/api/${entity}/create`)).send(documentBody());
    expect(res.status).toBe(200);
    const doc = res.body.result;
    expect(doc.items.map((item) => item.total)).toEqual([300, 20]);
    expect(doc.subTotal).toBe(320);
    expect(doc.taxTotal).toBe(32);
    expect(doc.total).toBe(352);
    expect(String(doc.createdBy?._id || doc.createdBy)).toBe(String(admin._id));
  });

  test('create rejects protected and unknown fields', async () => {
    const res = await auth(request(app).post(`/api/${entity}/create`)).send(
      documentBody({ removed: true })
    );
    expect(res.status).toBe(400);
  });

  test('create rejects a missing client', async () => {
    const body = documentBody();
    delete body.client;
    const res = await auth(request(app).post(`/api/${entity}/create`)).send(body);
    expect(res.status).toBe(400);
  });

  test('update recomputes totals', async () => {
    const created = await auth(request(app).post(`/api/${entity}/create`)).send(documentBody());
    const res = await auth(request(app).patch(`/api/${entity}/update/${created.body.result._id}`)).send(
      documentBody({ taxRate: 0, items: [{ itemName: 'Audit', quantity: 3, price: 10, total: 0 }] })
    );
    expect(res.status).toBe(200);
    expect(res.body.result.total).toBe(30);
  });

  test('list paginates and filters by client', async () => {
    const other = await createClient({ name: 'Paginated Co' });
    for (let i = 0; i < 3; i++) {
      await auth(request(app).post(`/api/${entity}/create`)).send(
        documentBody({ client: String(other._id), number: 100 + i })
      );
    }
    const res = await auth(
      request(app).get(`/api/${entity}/list?page=1&items=2&filter=client&equal=${other._id}`)
    );
    expect(res.status).toBe(200);
    expect(res.body.result).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ page: 1, pages: 2, count: 3 });
  });

  test('list rejects an invalid client id filter', async () => {
    const res = await auth(request(app).get(`/api/${entity}/list?filter=client&equal=nope`));
    expect(res.status).toBe(400);
  });

  test('delete hides the document from read and list', async () => {
    const created = await auth(request(app).post(`/api/${entity}/create`)).send(documentBody());
    const id = created.body.result._id;
    expect((await auth(request(app).delete(`/api/${entity}/delete/${id}`))).status).toBe(200);
    expect((await auth(request(app).get(`/api/${entity}/read/${id}`))).status).toBe(404);
    expect(await Model().countDocuments({ _id: id, removed: true })).toBe(1);
  });
});

describe('invoice deletion', () => {
  test('also removes its payments', async () => {
    const invoice = await createInvoice(admin, client);
    await auth(request(app).post('/api/payment/create')).send({
      invoice: String(invoice._id),
      number: 1,
      date: new Date().toISOString(),
      amount: 10,
    });
    await auth(request(app).delete(`/api/invoice/delete/${invoice._id}`));
    expect(await mongoose.model('Payment').countDocuments({ invoice: invoice._id, removed: false })).toBe(0);
  });
});
