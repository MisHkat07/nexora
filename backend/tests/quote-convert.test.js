const request = require('supertest');
const mongoose = require('mongoose');
const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs, createClient } = require('./helpers/factories');

let app, auth, admin, client;
beforeAll(async () => {
  app = await createTestApp();
  ({ auth, admin } = await loginAs(app));
  client = await createClient();
  await mongoose.model('Setting').create({
    organizationId: admin.organizationId,
    settingCategory: 'finance_settings',
    settingKey: 'last_invoice_number',
    settingValue: 41,
  });
});
afterAll(closeTestApp);

const Quote = () => mongoose.model('Quote');
const Invoice = () => mongoose.model('Invoice');

const createQuote = (overrides = {}) =>
  Quote().create({
    createdBy: admin._id,
    organizationId: admin.organizationId,
    client: client._id,
    number: 3,
    year: 2026,
    date: new Date(),
    expiredDate: new Date(),
    items: [
      { itemName: 'Design', description: 'Landing page', quantity: 2, price: 150, total: 300 },
      { itemName: 'Hosting', quantity: 1, price: 20, total: 20 },
    ],
    taxRate: 10,
    subTotal: 320,
    taxTotal: 32,
    total: 352,
    currency: 'USD',
    notes: 'Thanks!',
    status: 'sent',
    ...overrides,
  });

const convert = (id) => auth(request(app).post(`/api/quote/convert/${id}`));

describe('#55 quote → invoice', () => {
  test('creates an invoice with the same items and totals, and marks the quote accepted', async () => {
    const quote = await createQuote();
    const res = await convert(quote._id);
    expect(res.status).toBe(200);

    const invoice = await Invoice().findById(res.body.result._id).setOptions({ autopopulate: false });
    expect(String(invoice.client)).toBe(String(client._id));
    expect(invoice.items.map(({ itemName, quantity, price, total }) => ({ itemName, quantity, price, total }))).toEqual([
      { itemName: 'Design', quantity: 2, price: 150, total: 300 },
      { itemName: 'Hosting', quantity: 1, price: 20, total: 20 },
    ]);
    expect(invoice).toMatchObject({
      subTotal: 320,
      taxTotal: 32,
      total: 352,
      taxRate: 10,
      currency: 'USD',
      notes: 'Thanks!',
      status: 'draft',
      paymentStatus: 'unpaid',
      number: 42,
    });
    expect(String(invoice.converted.quote)).toBe(String(quote._id));
    expect(invoice.converted.from).toBe('quote');
    expect(invoice.expiredDate > invoice.date).toBe(true);

    const savedQuote = await Quote().findById(quote._id);
    expect(savedQuote.converted).toBe(true);
    expect(savedQuote.status).toBe('accepted');
  });

  test('converting twice returns the same invoice instead of a duplicate', async () => {
    const quote = await createQuote();
    const first = await convert(quote._id);
    const second = await convert(quote._id);
    expect(second.status).toBe(200);
    expect(second.body.result._id).toBe(first.body.result._id);
    expect(await Invoice().countDocuments({ 'converted.quote': quote._id })).toBe(1);
  });

  test('concurrent conversions create exactly one invoice', async () => {
    const quote = await createQuote();
    const results = await Promise.all([convert(quote._id), convert(quote._id), convert(quote._id)]);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(new Set(results.map((r) => r.body.result._id)).size).toBe(1);
    expect(await Invoice().countDocuments({ 'converted.quote': quote._id })).toBe(1);
  });

  test('every conversion gets its own invoice number', async () => {
    const [a, b] = await Promise.all([createQuote(), createQuote()]);
    const [ra, rb] = await Promise.all([convert(a._id), convert(b._id)]);
    expect(ra.body.result.number).not.toBe(rb.body.result.number);
  });

  test('declined quotes cannot be converted', async () => {
    const quote = await createQuote({ status: 'declined' });
    const res = await convert(quote._id);
    expect(res.status).toBe(400);
    expect(await Invoice().countDocuments({ 'converted.quote': quote._id })).toBe(0);
  });

  test('a missing quote returns 404 and GET is no longer accepted', async () => {
    expect((await convert(new mongoose.Types.ObjectId())).status).toBe(404);
    const quote = await createQuote();
    expect((await auth(request(app).get(`/api/quote/convert/${quote._id}`))).status).toBe(404);
  });
});
