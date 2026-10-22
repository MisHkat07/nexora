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

const Invoice = () => mongoose.model('Invoice');
const Payment = () => mongoose.model('Payment');

const pay = (invoice, amount, extra = {}) =>
  auth(request(app).post('/api/payment/create')).send({
    invoice: String(invoice._id),
    client: String(client._id),
    number: 1,
    date: new Date().toISOString(),
    amount,
    ...extra,
  });

describe('#06 payments', () => {
  test('a partial then full payment moves the invoice unpaid → partially → paid', async () => {
    const invoice = await createInvoice(admin, client); // total 100

    const first = await pay(invoice, 40);
    expect(first.status).toBe(200);
    let saved = await Invoice().findById(invoice._id);
    expect(saved.credit).toBe(40);
    expect(saved.paymentStatus).toBe('partially');
    expect(saved.payment.map(String)).toEqual([String(first.body.result._id)]);

    expect((await pay(invoice, 60)).status).toBe(200);
    saved = await Invoice().findById(invoice._id);
    expect(saved.credit).toBe(100);
    expect(saved.paymentStatus).toBe('paid');
  });

  test('the client and currency come from the invoice', async () => {
    const invoice = await createInvoice(admin, client);
    const other = await createClient({ name: 'Other' });
    const res = await pay(invoice, 10, { client: String(other._id) });
    const saved = await Payment().findById(res.body.result._id).setOptions({ autopopulate: false });
    expect(String(saved.client)).toBe(String(client._id));
    expect(saved.currency).toBe('USD');
  });

  test('overpaying is rejected and nothing is saved', async () => {
    const invoice = await createInvoice(admin, client);
    const res = await pay(invoice, 150);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Max Amount/);
    expect(await Payment().countDocuments({ invoice: invoice._id })).toBe(0);
    expect((await Invoice().findById(invoice._id)).credit).toBe(0);
  });

  test('zero and negative amounts are rejected', async () => {
    const invoice = await createInvoice(admin, client);
    expect((await pay(invoice, 0)).status).toBe(400);
    expect((await pay(invoice, -5)).status).toBe(400);
  });

  test('concurrent payments can never exceed the invoice total', async () => {
    const invoice = await createInvoice(admin, client);
    const results = await Promise.all([pay(invoice, 70), pay(invoice, 70), pay(invoice, 70)]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    const saved = await Invoice().findById(invoice._id);
    expect(saved.credit).toBe(70);
    expect(await Payment().countDocuments({ invoice: invoice._id, removed: false })).toBe(1);
  });

  test('updating an amount adjusts the invoice balance', async () => {
    const invoice = await createInvoice(admin, client);
    const created = await pay(invoice, 30);
    const res = await auth(request(app).patch(`/api/payment/update/${created.body.result._id}`)).send({
      number: 1,
      date: new Date().toISOString(),
      amount: 100,
    });
    expect(res.status).toBe(200);
    const saved = await Invoice().findById(invoice._id);
    expect(saved.credit).toBe(100);
    expect(saved.paymentStatus).toBe('paid');
  });

  test('updating to more than the balance is rejected and nothing changes', async () => {
    const invoice = await createInvoice(admin, client);
    const created = await pay(invoice, 30);
    const res = await auth(request(app).patch(`/api/payment/update/${created.body.result._id}`)).send({
      number: 1,
      date: new Date().toISOString(),
      amount: 130,
    });
    expect(res.status).toBe(400);
    expect((await Invoice().findById(invoice._id)).credit).toBe(30);
    expect((await Payment().findById(created.body.result._id)).amount).toBe(30);
  });

  test('deleting a payment restores the invoice balance', async () => {
    const invoice = await createInvoice(admin, client);
    const created = await pay(invoice, 100);
    const res = await auth(request(app).delete(`/api/payment/delete/${created.body.result._id}`));
    expect(res.status).toBe(200);
    const saved = await Invoice().findById(invoice._id);
    expect(saved.credit).toBe(0);
    expect(saved.paymentStatus).toBe('unpaid');
    expect(saved.payment).toHaveLength(0);
  });

  test('deleting twice returns 404 and does not double-refund', async () => {
    const invoice = await createInvoice(admin, client);
    const created = await pay(invoice, 50);
    await auth(request(app).delete(`/api/payment/delete/${created.body.result._id}`));
    const again = await auth(request(app).delete(`/api/payment/delete/${created.body.result._id}`));
    expect(again.status).toBe(404);
    expect((await Invoice().findById(invoice._id)).credit).toBe(0);
  });
});
