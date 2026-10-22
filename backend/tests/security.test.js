const fs = require('fs');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');

// PDF rendering is covered separately; here we only care about who may download
jest.mock('@/controllers/pdfController', () => ({
  generatePdf: jest.fn(async (modelName, { targetLocation }, result, callback) => {
    require('fs').mkdirSync(require('path').dirname(targetLocation), { recursive: true });
    require('fs').writeFileSync(targetLocation, '%PDF-1.4 test');
    callback();
  }),
}));

const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs, createClient, createInvoice } = require('./helpers/factories');

let app, auth, admin, invoice;
beforeAll(async () => {
  app = await createTestApp();
  ({ auth, admin } = await loginAs(app));
  const client = await createClient();
  invoice = await createInvoice(admin, client);
});
afterAll(async () => {
  fs.rmSync(path.resolve('src/public/download/invoice', `invoice-${invoice._id}.pdf`), { force: true });
  await closeTestApp();
});

describe('#01 PDF downloads', () => {
  const pdfPath = () => `/download/invoice/invoice-${invoice._id}.pdf`;

  test('anonymous download is rejected', async () => {
    const res = await request(app).get(pdfPath());
    expect(res.status).toBe(401);
  });

  test('only invoice, quote and payment can be downloaded', async () => {
    const res = await request(app).get(`/download/admin/admin-${admin._id}.pdf?token=x`);
    expect(res.status).toBe(404);
  });

  test('malformed file names are rejected', async () => {
    const res = await request(app).get('/download/invoice/invoice-..%2F..%2Fapp.pdf?token=x');
    expect(res.status).toBe(404);
  });

  test('an authenticated user gets a short-lived signed link that works', async () => {
    const linkRes = await auth(request(app).get(`/api/invoice/download-link/${invoice._id}`));
    expect(linkRes.status).toBe(200);
    const { url } = linkRes.body.result;
    expect(url).toMatch(new RegExp(`^download/invoice/invoice-${invoice._id}\\.pdf\\?token=`));

    const res = await request(app).get('/' + url);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  test('a link signed for one document does not open another', async () => {
    const other = await createInvoice(admin, await createClient(), { number: 2 });
    const linkRes = await auth(request(app).get(`/api/invoice/download-link/${invoice._id}`));
    const token = new URL('http://x/' + linkRes.body.result.url).searchParams.get('token');
    const res = await request(app).get(`/download/invoice/invoice-${other._id}.pdf?token=${token}`);
    expect(res.status).toBe(401);
  });

  test('a regular session token cannot be used as a download token', async () => {
    const { token } = await loginAs(app, { email: 'second@test.com' });
    const res = await request(app).get(`${pdfPath()}?token=${token}`);
    expect(res.status).toBe(401);
  });
});

describe('#02 CORS', () => {
  test('allows configured origins', async () => {
    const res = await request(app).options('/api/login').set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  test('does not allow other origins', async () => {
    const res = await request(app).options('/api/login').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('#03 security headers and rate limiting', () => {
  test('sets helmet headers', async () => {
    const res = await request(app).get('/api/client/list');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('limits repeated login attempts', async () => {
    let last;
    for (let i = 0; i < 11; i++) {
      last = await request(app)
        .post('/api/login')
        .send({ email: 'nobody@test.com', password: 'wrong' });
    }
    expect(last.status).toBe(429);
  });
});

describe('#04 CRUD input hardening', () => {
  test('clients cannot set protected fields on create', async () => {
    const res = await auth(request(app).post('/api/client/create')).send({
      name: 'Sneaky',
      removed: true,
      createdBy: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(200);
    const saved = await mongoose.model('Client').findById(res.body.result._id);
    expect(saved.removed).toBe(false);
    expect(String(saved.createdBy)).toBe(String(admin._id));
  });

  test('clients cannot set protected fields on update', async () => {
    const client = await createClient({ name: 'Original' });
    const res = await auth(request(app).patch(`/api/client/update/${client._id}`)).send({
      name: 'Renamed',
      createdBy: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(200);
    const saved = await mongoose.model('Client').findById(client._id);
    expect(saved.name).toBe('Renamed');
    expect(saved.createdBy).toBeUndefined();
  });

  test('unknown fields are rejected', async () => {
    const res = await auth(request(app).post('/api/client/create')).send({ name: 'X', isAdmin: true });
    expect(res.status).toBe(400);
  });

  test('operator injection in list filters is rejected', async () => {
    const res = await auth(request(app).get('/api/client/list?filter=name&equal[$ne]=x'));
    expect(res.status).toBe(400);
  });

  test('filtering on fields that are not allowed is rejected', async () => {
    const res = await auth(request(app).get('/api/client/filter?filter=createdBy&equal=x'));
    expect(res.status).toBe(400);
  });

  test('search input is treated as text, not a regex', async () => {
    await createClient({ name: 'a.b' });
    await createClient({ name: 'axb' });
    const res = await auth(request(app).get('/api/client/search?q=a.b&fields=name'));
    expect(res.status).toBe(200);
    expect(res.body.result.map((c) => c.name)).toEqual(['a.b']);
  });

  test('an invalid regex does not crash search', async () => {
    const res = await auth(request(app).get('/api/client/search?q=(&fields=name'));
    expect([200, 202]).toContain(res.status);
  });

  test('searching on fields that are not allowed is rejected', async () => {
    const res = await auth(request(app).get('/api/client/list?q=x&fields=createdBy'));
    expect(res.status).toBe(400);
  });

  test('page size is capped', async () => {
    const res = await auth(request(app).get('/api/client/list?items=100000'));
    expect(res.status).toBe(200);
    expect(res.body.result.length).toBeLessThanOrEqual(100);
  });

  test('an invalid id returns 400, not 500', async () => {
    const res = await auth(request(app).get('/api/client/read/not-an-id'));
    expect(res.status).toBe(400);
  });
});

describe('#05 error responses', () => {
  test('a malformed token returns 401 without internals', async () => {
    const res = await request(app).get('/api/client/list').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeUndefined();
  });

  test('server errors do not expose the error object', async () => {
    const res = await auth(request(app).get('/api/invoice/read/not-an-id'));
    expect(res.body.error).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/stack|CastError/);
  });
});

describe('#12 observability', () => {
  test('health and readiness probes respond without auth', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    const ready = await request(app).get('/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe('ready');
  });

  test('every response carries a request id, and a safe incoming one is reused', async () => {
    const res = await request(app).get('/api/client/list').set('X-Request-Id', 'abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
    const generated = await request(app).get('/api/client/list');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
