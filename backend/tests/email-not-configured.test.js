const request = require('supertest');

jest.mock('@/controllers/pdfController', () => ({
  generatePdf: jest.fn(async () => Buffer.from('%PDF-1.4 test')),
}));

const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs, createClient, createInvoice } = require('./helpers/factories');

let app, auth, admin;
beforeAll(async () => {
  delete process.env.RESEND_API;
  delete process.env.EMAIL_FROM;
  app = await createTestApp();
  ({ auth, admin } = await loginAs(app));
});
afterAll(closeTestApp);

test('#54 sending without email configuration explains what is missing', async () => {
  const invoice = await createInvoice(admin, await createClient());
  const res = await auth(request(app).post('/api/invoice/mail')).send({ id: String(invoice._id) });
  expect(res.status).toBe(422);
  expect(res.body.message).toBe('Email is not set up on the server (missing RESEND_API, EMAIL_FROM).');
});
