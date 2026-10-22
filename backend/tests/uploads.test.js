const fs = require('fs');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');

const { createTestApp, closeTestApp } = require('./helpers/app');
const { loginAs } = require('./helpers/factories');

// Smallest valid PNG (1x1 transparent pixel)
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082',
  'hex'
);

let app, auth;
const createdKeys = [];
beforeAll(async () => {
  app = await createTestApp();
  ({ auth } = await loginAs(app));
});
afterAll(async () => {
  for (const key of createdKeys) fs.rmSync(path.resolve('src', key), { force: true });
  await closeTestApp();
});

const uploadPhoto = (buffer, filename, fields = {}) => {
  let req = auth(request(app).patch('/api/admin/profile/update'))
    .field('email', 'owner@test.com')
    .field('name', 'Test');
  for (const [name, value] of Object.entries(fields)) req = req.field(name, value);
  return buffer ? req.attach('file', buffer, filename) : req;
};

describe('#08 uploads', () => {
  test('a PNG is stored under a random name and served back', async () => {
    const res = await uploadPhoto(PNG, 'My Photo.png');
    expect(res.status).toBe(200);
    const key = res.body.result.photo;
    createdKeys.push(key);
    expect(key).toMatch(/^public\/uploads\/admin\/my-photo-[0-9a-f]{12}\.png$/);

    const served = await request(app).get('/' + key);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(served.body, PNG)).toBe(0);
  });

  test('the file type comes from its contents, not its name', async () => {
    const res = await uploadPhoto(PNG, 'avatar.html');
    expect(res.status).toBe(200);
    createdKeys.push(res.body.result.photo);
    expect(res.body.result.photo).toMatch(/\.png$/);
  });

  test('SVG and other non-raster files are rejected', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect((await uploadPhoto(svg, 'logo.svg')).status).toBe(400);
    expect((await uploadPhoto(Buffer.from('<html>hi</html>'), 'photo.png')).status).toBe(400);
  });

  test('files over the size limit are rejected', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]);
    const res = await uploadPhoto(big, 'big.png');
    expect(res.status).toBe(413);
  });

  test('a photo path sent as text is ignored', async () => {
    const before = await mongoose.model('Admin').findOne({ email: 'owner@test.com' });
    const res = await uploadPhoto(null, null, { photo: 'https://evil.example/x.png' });
    expect(res.status).toBe(200);
    expect(res.body.result.photo).toBe(before.photo);
  });

  test('only upload paths can be read from /public', async () => {
    expect((await request(app).get('/public/uploads/admin/..%2F..%2F..%2Fpackage.json')).status).toBe(404);
    expect((await request(app).get('/public/download/invoice/x.pdf')).status).toBe(404);
    expect((await request(app).get('/public/uploads/admin/missing.png')).status).toBe(404);
  });
});
