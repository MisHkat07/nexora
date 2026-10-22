const fs = require('fs');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { globSync } = require('glob');

const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs, createClient, createInvoice } = require('./helpers/factories');
let app, auth, admin, client;
// Required after the models are registered (the PDF module looks them up on load)
let generatePdf, closeBrowser, imageSource;
beforeAll(async () => {
  app = await createTestApp();
  ({ generatePdf, closeBrowser, imageSource } = require('@/controllers/pdfController'));
  // PDFs read company and money-format settings
  const defaults = globSync('./src/setup/defaultSettings/**/*.json').flatMap((file) =>
    JSON.parse(fs.readFileSync(file, 'utf-8'))
  );
  await mongoose.model('Setting').insertMany(defaults);
  ({ auth, admin } = await loginAs(app));
  client = await createClient({ name: 'Acme <b>Ltd</b>' });
}, 60000);
afterAll(async () => {
  await closeBrowser();
  await closeTestApp();
});

const isPdf = (buffer) => buffer.subarray(0, 5).toString() === '%PDF-';

describe('#07 PDF rendering with headless Chrome', () => {
  test('renders an invoice', async () => {
    const invoice = await createInvoice(admin, client);
    const populated = await mongoose.model('Invoice').findById(invoice._id);
    const pdf = await generatePdf('Invoice', populated);
    expect(isPdf(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  }, 60000);

  test('renders a quote and a payment', async () => {
    const invoice = await createInvoice(admin, client);
    const quote = await mongoose.model('Quote').create({
      createdBy: admin._id,
      client: client._id,
      number: 1,
      year: 2026,
      date: new Date(),
      expiredDate: new Date(),
      items: [{ itemName: 'Item', quantity: 1, price: 10, total: 10 }],
      total: 10,
      subTotal: 10,
    });
    const payment = await mongoose.model('Payment').create({
      createdBy: admin._id,
      client: client._id,
      invoice: invoice._id,
      number: 1,
      amount: 10,
    });
    const [quotePdf, paymentPdf] = await Promise.all([
      generatePdf('Quote', await mongoose.model('Quote').findById(quote._id)),
      generatePdf('Payment', await mongoose.model('Payment').findById(payment._id)),
    ]);
    expect(isPdf(quotePdf)).toBe(true);
    expect(isPdf(paymentPdf)).toBe(true);
  }, 60000);

  test('several downloads at once all succeed', async () => {
    const invoice = await createInvoice(admin, client);
    const populated = await mongoose.model('Invoice').findById(invoice._id);
    const pdfs = await Promise.all(Array.from({ length: 5 }, () => generatePdf('Invoice', populated)));
    expect(pdfs.every(isPdf)).toBe(true);
  }, 60000);

  test('the download endpoint streams the PDF without writing to disk', async () => {
    const invoice = await createInvoice(admin, client);
    const { body } = await auth(request(app).get(`/api/invoice/download-link/${invoice._id}`));
    const res = await request(app)
      .get('/' + body.result.url)
      .buffer(true)
      .parse((response, callback) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe(`attachment; filename="invoice-${invoice._id}.pdf"`);
    expect(isPdf(res.body)).toBe(true);
    expect(fs.existsSync(path.resolve(`src/public/download/invoice/invoice-${invoice._id}.pdf`))).toBe(false);
  }, 60000);
});

describe('logo embedding', () => {
  const logoPath = 'public/uploads/setting/test-logo.png';
  afterAll(() => fs.rmSync(path.resolve('src', logoPath), { force: true }));

  test('a local upload becomes a data URI', () => {
    fs.mkdirSync(path.resolve('src/public/uploads/setting'), { recursive: true });
    fs.writeFileSync(path.resolve('src', logoPath), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(imageSource(logoPath)).toMatch(/^data:image\/png;base64,/);
  });

  test('paths outside public/ and non-images are refused', () => {
    expect(imageSource('../package.json')).toBe('');
    expect(imageSource('public/../../.env')).toBe('');
    expect(imageSource('public/uploads/setting/missing.png')).toBe('');
  });

  test('remote URLs are passed through', () => {
    expect(imageSource('https://cdn.example.com/logo.png')).toBe('https://cdn.example.com/logo.png');
  });
});
