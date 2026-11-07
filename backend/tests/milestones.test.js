const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('@/services/documentMail', () => ({
  sendDocumentEmail: jest.fn(async () => ({ to: 'ap@client.test', messageId: 'queued-1' })),
}));

const { sendDocumentEmail } = require('@/services/documentMail');
const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs, createClient, createInvoice } = require('./helpers/factories');

let app, auth, admin, client, enqueue, processDueJobs, runRecurring, runReminders, signPortalToken;

beforeAll(async () => {
  app = await createTestApp();
  ({ enqueue, processDueJobs } = require('@/jobs/queue'));
  ({ runRecurring } = require('@/features/recurring'));
  ({ runReminders } = require('@/features/reminders'));
  ({ signPortalToken } = require('@/features/portal'));
  require('@/jobs/handlers');
  ({ auth, admin } = await loginAs(app));
  client = await createClient({ name: 'Acme Ltd', email: 'ap@client.test' });
});

afterAll(closeTestApp);

beforeEach(async () => {
  sendDocumentEmail.mockClear();
  await mongoose.model('Job').deleteMany({});
  await mongoose.model('Organization').updateOne(
    { _id: admin.organizationId },
    { $set: { plan: 'free' }, $unset: { subscriptionStatus: 1, graceUntil: 1 } }
  );
});

const invoiceBody = (number) => ({
  client: String(client._id),
  number,
  year: 2026,
  status: 'draft',
  date: new Date().toISOString(),
  expiredDate: new Date(Date.now() + 864e5).toISOString(),
  items: [{ itemName: 'Work', quantity: 1, price: 10, total: 10 }],
  taxRate: 0,
});

describe('milestones', () => {
  test('a queued email is sent by the worker and marked sent', async () => {
    const invoice = await createInvoice(admin, client, { number: 41 });
    await enqueue('send-document-email', {
      organizationId: String(admin.organizationId),
      entity: 'invoice',
      body: { id: String(invoice._id) },
      userId: String(admin._id),
      senderVerified: true,
    });
    expect(await processDueJobs()).toBe(1);
    expect(sendDocumentEmail).toHaveBeenCalledTimes(1);
    expect((await mongoose.model('Invoice').findById(invoice._id)).mailStatus).toBe('sent');
  });

  test('a Stripe webhook records one payment and a replay does not record another', async () => {
    const invoice = await createInvoice(admin, client, { number: 42, total: 100, subTotal: 100 });
    const event = {
      id: 'evt_milestone_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          amount_total: 10000,
          metadata: { invoiceId: String(invoice._id), organizationId: String(admin.organizationId) },
        },
      },
    };
    const first = await request(app).post('/api/webhooks/stripe').send(event);
    const second = await request(app).post('/api/webhooks/stripe').send(event);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const payments = await mongoose.model('Payment').find({ invoice: invoice._id });
    expect(payments).toHaveLength(1);
    expect((await mongoose.model('Invoice').findById(invoice._id)).paymentStatus).toBe('paid');
  });

  test('a recurring profile creates one invoice per period', async () => {
    const source = await createInvoice(admin, client, { number: 43 });
    const created = await auth(request(app).post('/api/invoice/recurring')).send({
      invoiceId: String(source._id),
      frequency: 'monthly',
    });
    expect(created.status).toBe(201);
    await mongoose.model('RecurringProfile').updateOne({ _id: created.body.result._id }, { nextRunAt: new Date(Date.now() - 1000) });
    await runRecurring();
    await mongoose.model('RecurringProfile').updateOne({ _id: created.body.result._id }, { nextRunAt: new Date(Date.now() - 1000) });
    await runRecurring();
    const copies = await mongoose.model('Invoice').find({ recurringProfile: created.body.result._id });
    expect(copies).toHaveLength(1);
  });

  test('each reminder is sent once', async () => {
    const invoice = await createInvoice(admin, client, {
      number: 44,
      expiredDate: new Date(Date.now() - 8 * 864e5),
      paymentStatus: 'unpaid',
    });
    await runReminders();
    await runReminders();
    const saved = await mongoose.model('Invoice').findById(invoice._id);
    expect(saved.remindersSent.sort()).toEqual(['before_3', 'due', 'overdue_7']);
    expect(saved.isOverdue).toBe(true);
  });

  test('a credit note reduces what is owed and a refund puts it back', async () => {
    const invoice = await createInvoice(admin, client, { number: 45, total: 100, subTotal: 100 });
    const applied = await auth(request(app).post('/api/creditnote/apply')).send({
      invoiceId: String(invoice._id),
      amount: 40,
      reason: 'Goodwill',
    });
    expect(applied.status).toBe(201);
    expect((await mongoose.model('Invoice').findById(invoice._id)).credit).toBe(40);
    const refunded = await auth(request(app).post(`/api/creditnote/${applied.body.result._id}/refund`)).send({});
    expect(refunded.status).toBe(200);
    const updated = await mongoose.model('Invoice').findById(invoice._id);
    expect(updated.credit).toBe(0);
    expect(updated.paymentStatus).toBe('unpaid');
  });

  test('a client can view and accept a quote from the portal', async () => {
    const quote = await mongoose.model('Quote').create({
      createdBy: admin._id,
      organizationId: admin.organizationId,
      client: client._id,
      number: 9,
      year: 2026,
      date: new Date(),
      expiredDate: new Date(Date.now() + 864e5),
      items: [{ itemName: 'Design', quantity: 1, price: 80, total: 80 }],
      total: 80,
      currency: 'USD',
      status: 'sent',
    });
    const token = signPortalToken({ organizationId: admin.organizationId, entity: 'quote', id: quote._id });
    const viewed = await request(app).get(`/api/portal/${token}`);
    expect(viewed.status).toBe(200);
    expect(viewed.body.result.total).toBe(80);
    const accepted = await request(app).post(`/api/portal/${token}/accept`).send({ name: 'Ada Lovelace' });
    expect(accepted.status).toBe(200);
    expect(accepted.body.result.status).toBe('accepted');
    expect(accepted.body.result.invoiceId).toBeTruthy();
    expect((await mongoose.model('Quote').findById(quote._id)).converted).toBe(true);
  });

  test('a lead becomes a customer', async () => {
    const lead = await auth(request(app).post('/api/lead/create')).send({ name: 'Jamie Lead', email: 'jamie@lead.test' });
    expect(lead.status).toBe(200);
    const converted = await auth(request(app).post(`/api/lead/${lead.body.result._id}/convert`)).send({});
    expect(converted.status).toBe(200);
    const found = await mongoose.model('Client').findById(converted.body.result.client);
    expect(found.name).toBe('Jamie Lead');
    const search = await auth(request(app).get('/api/search')).query({ q: 'Jamie' });
    expect(search.body.result.some((row) => row.type === 'lead' || row.type === 'customer')).toBe(true);
  });

  test('the free plan stops at its monthly invoice cap and a lapsed subscription is read-only', async () => {
    await mongoose.model('Organization').updateOne(
      { _id: admin.organizationId },
      { $set: { plan: 'free', subscriptionStatus: 'active' } }
    );
    await Promise.all(Array.from({ length: 20 }, (_, index) => createInvoice(admin, client, { number: 200 + index })));
    const blocked = await auth(request(app).post('/api/invoice/create')).send(invoiceBody(999));
    expect(blocked.status).toBe(402);

    const upgraded = await auth(request(app).post('/api/billing/checkout')).send({ plan: 'starter' });
    expect(upgraded.status).toBe(200);
    expect(upgraded.body.result.plan).toBe('starter');

    await mongoose.model('Organization').updateOne(
      { _id: admin.organizationId },
      { $set: { subscriptionStatus: 'past_due', graceUntil: new Date(Date.now() - 864e5) } }
    );
    const write = await auth(request(app).post('/api/client/create')).send({ name: 'Blocked Co' });
    expect(write.status).toBe(402);
    const read = await auth(request(app).get('/api/client/list'));
    expect(read.status).toBe(200);
  });

  test('stock, currency, import and a local draft all work without extra services', async () => {
    const product = await auth(request(app).post('/api/product/create')).send({ name: 'Widget', price: 12, type: 'product' });
    expect(product.status).toBe(200);
    const moved = await auth(request(app).post('/api/stock/move')).send({
      product: product.body.result._id,
      quantity: 5,
      type: 'in',
    });
    expect(moved.status).toBe(201);
    expect((await mongoose.model('Product').findById(product.body.result._id)).quantity).toBe(5);

    await auth(request(app).post('/api/exchangerate/create')).send({ code: 'EUR', rate: 1.08 });
    const converted = await auth(request(app).get('/api/currency/convert')).query({ amount: 10, from: 'EUR', to: 'USD' });
    expect(converted.body.result.amount).toBe(10.8);

    const imported = await auth(request(app).post('/api/import/clients')).send({ csv: 'name,email\nNorthwind,ap@north.test' });
    expect(imported.body.result.imported).toBe(1);

    const draft = await auth(request(app).post('/api/ai/draft')).send({ text: 'Invoice for Globex 2 hours at 100' });
    expect(draft.body.result.clientName).toMatch(/Globex/);
    expect(draft.body.result.items[0]).toMatchObject({ quantity: 2, price: 100 });

    const board = await auth(request(app).get('/api/dashboard'));
    expect(board.status).toBe(200);
    expect(board.body.result).toHaveProperty('unpaid');
    const finance = await auth(request(app).get('/api/reports/finance'));
    expect(finance.status).toBe(200);
    const steps = await auth(request(app).get('/api/onboarding'));
    expect(steps.body.result.steps.length).toBeGreaterThan(0);
    const view = await auth(request(app).post('/api/views')).send({ name: 'Open leads', entity: 'lead', filter: { status: 'new' } });
    expect(view.status).toBe(201);
    expect(view.body.result[0].name).toBe('Open leads');
  });
});
