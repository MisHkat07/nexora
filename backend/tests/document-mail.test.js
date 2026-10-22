const request = require('supertest');
const mongoose = require('mongoose');

process.env.RESEND_API = 're_test_key';
process.env.EMAIL_FROM = 'Acme Billing <billing@acme.test>';
process.env.APP_URL = 'https://app.acme.test';

const mockSend = jest.fn(async () => ({ data: { id: 'msg_123' }, error: null }));
jest.mock('resend', () => ({ Resend: jest.fn(() => ({ emails: { send: mockSend } })) }));
// PDF rendering has its own tests; here we only need bytes to attach
jest.mock('@/controllers/pdfController', () => ({
  generatePdf: jest.fn(async () => Buffer.from('%PDF-1.4 test')),
}));

const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs, createClient, createInvoice } = require('./helpers/factories');

let app, auth, admin, client;
beforeAll(async () => {
  app = await createTestApp();
  ({ auth, admin } = await loginAs(app));
  client = await createClient({ name: 'Acme <Trading>', email: 'ap@client.test' });
  await mongoose.model('Setting').insertMany([
    { settingCategory: 'company_settings', settingKey: 'company_name', settingValue: 'Nexora Demo Co' },
    { settingCategory: 'company_settings', settingKey: 'company_email', settingValue: 'hello@nexora.test' },
    { settingCategory: 'finance_settings', settingKey: 'invoice_prefix', settingValue: 'INV-' },
    { settingCategory: 'money_format_settings', settingKey: 'currency_symbol', settingValue: '$' },
    { settingCategory: 'money_format_settings', settingKey: 'currency_position', settingValue: 'before' },
    { settingCategory: 'money_format_settings', settingKey: 'decimal_sep', settingValue: '.' },
    { settingCategory: 'money_format_settings', settingKey: 'thousand_sep', settingValue: ',' },
    { settingCategory: 'money_format_settings', settingKey: 'cent_precision', settingValue: 2 },
  ]);
});
afterAll(closeTestApp);
beforeEach(() => mockSend.mockClear());

const mail = (entity, body) => auth(request(app).post(`/api/${entity}/mail`)).send(body);

describe('#54 emailing documents', () => {
  test('an invoice is emailed to the customer with the PDF attached and a working link', async () => {
    const invoice = await createInvoice(admin, client, { number: 7, status: 'draft' });
    const res = await mail('invoice', { id: String(invoice._id) });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Email sent to ap@client.test');

    const sent = mockSend.mock.calls[0][0];
    expect(sent).toMatchObject({
      from: 'Acme Billing <billing@acme.test>',
      to: 'ap@client.test',
      replyTo: 'hello@nexora.test',
      subject: 'Invoice INV-7/2026 from Nexora Demo Co',
    });
    expect(sent.attachments).toEqual([
      { filename: 'invoice-INV-7-2026.pdf', content: Buffer.from('%PDF-1.4 test') },
    ]);
    expect(sent.text).toMatch(/Amount due: \$ 100\.00/);

    // The link in the email downloads the PDF without logging in
    const [link] = sent.text.match(/https:\/\/app\.acme\.test\/download\/\S+/);
    const download = await request(app).get(link.replace('https://app.acme.test', ''));
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toBe('application/pdf');
  });

  test('customer data is HTML-escaped in the email', async () => {
    const invoice = await createInvoice(admin, client);
    await mail('invoice', { id: String(invoice._id), message: 'Hi <script>alert(1)</script>' });
    const { html } = mockSend.mock.calls[0][0];
    expect(html).toContain('Acme &lt;Trading&gt;');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  test('a draft invoice becomes "sent" and the send is recorded', async () => {
    const invoice = await createInvoice(admin, client, { status: 'draft' });
    await mail('invoice', { id: String(invoice._id), cc: ['boss@client.test'] });
    const saved = await mongoose.model('Invoice').findById(invoice._id);
    expect(saved.status).toBe('sent');
    expect(saved.emails).toHaveLength(1);
    expect(saved.emails[0]).toMatchObject({ to: 'ap@client.test', cc: ['boss@client.test'], messageId: 'msg_123' });
    expect(String(saved.emails[0].sentBy)).toBe(String(admin._id));
  });

  test('a different recipient can be given', async () => {
    const invoice = await createInvoice(admin, client);
    await mail('invoice', { id: String(invoice._id), to: 'accounts@other.test' });
    expect(mockSend.mock.calls[0][0].to).toBe('accounts@other.test');
  });

  test('a customer without an email gets a clear error and nothing is sent', async () => {
    const noEmail = await createClient({ name: 'No Email Ltd', email: '' });
    const invoice = await createInvoice(admin, noEmail);
    const res = await mail('invoice', { id: String(invoice._id) });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no email address/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('provider errors are reported, not swallowed', async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Domain not verified' } });
    const invoice = await createInvoice(admin, client, { status: 'draft' });
    const res = await mail('invoice', { id: String(invoice._id) });
    expect(res.status).toBe(502);
    expect(res.body.message).toMatch(/Domain not verified/);
    expect((await mongoose.model('Invoice').findById(invoice._id)).status).toBe('draft');
  });

  test('quotes and payment receipts can be emailed too', async () => {
    const quote = await mongoose.model('Quote').create({
      createdBy: admin._id, client: client._id, number: 4, year: 2026, date: new Date(), expiredDate: new Date(),
      items: [{ itemName: 'X', quantity: 1, price: 10, total: 10 }], total: 10,
    });
    expect((await mail('quote', { id: String(quote._id) })).status).toBe(200);
    expect(mockSend.mock.calls[0][0].subject).toMatch(/^Quote /);

    const invoice = await createInvoice(admin, client);
    const payment = await auth(request(app).post('/api/payment/create')).send({
      invoice: String(invoice._id), number: 1, date: new Date().toISOString(), amount: 25,
    });
    expect((await mail('payment', { id: payment.body.result._id })).status).toBe(200);
    const receipt = mockSend.mock.calls[1][0];
    expect(receipt.subject).toMatch(/^Payment receipt /);
    expect(receipt.text).toMatch(/Amount paid: \$ 25\.00/);
  });

  test('invalid input is rejected', async () => {
    expect((await mail('invoice', { id: 'nope' })).status).toBe(400);
    expect((await mail('invoice', { id: String(new mongoose.Types.ObjectId()) })).status).toBe(404);
    const invoice = await createInvoice(admin, client);
    expect((await mail('invoice', { id: String(invoice._id), to: 'not-an-email' })).status).toBe(400);
  });
});
