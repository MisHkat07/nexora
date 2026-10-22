const crypto = require('crypto');
const mongoose = require('mongoose');
const request = require('supertest');

/*
  Test data. Everything belongs to an organization: by default one shared organization per
  test file (`defaultOrganization()`); pass `organizationId` to create data for another one.
*/

let defaultOrg;
async function defaultOrganization() {
  if (!defaultOrg || !(await mongoose.model('Organization').exists({ _id: defaultOrg._id }))) {
    defaultOrg = await createOrganization({ name: 'Test Co' });
  }
  return defaultOrg;
}

async function createOrganization({ name = 'Other Co' } = {}) {
  return mongoose.model('Organization').create({
    name,
    slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${crypto.randomBytes(4).toString('hex')}`,
  });
}

const orgId = async (organizationId) => organizationId || (await defaultOrganization())._id;

async function createAdmin({ email = 'owner@test.com', password = 'secret123', organizationId } = {}) {
  const Admin = mongoose.model('Admin');
  const AdminPassword = mongoose.model('AdminPassword');

  const admin = await new Admin({
    email,
    name: 'Test',
    surname: 'Owner',
    enabled: true,
    organizationId: await orgId(organizationId),
  }).save();
  const passwordDoc = new AdminPassword();
  const salt = crypto.randomUUID();
  passwordDoc.set({
    user: admin._id,
    salt,
    password: passwordDoc.generateHash(salt, password),
    emailVerified: true,
  });
  await passwordDoc.save();
  return { admin, email, password };
}

/** Creates an admin, logs in, and returns an authorised supertest agent helper. */
async function loginAs(app, credentials) {
  const { admin, email, password } = await createAdmin(credentials);
  const res = await request(app).post('/api/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
  const token = res.body.result.token;
  const auth = (req) => req.set('Authorization', `Bearer ${token}`);
  return { admin, token, auth };
}

async function createClient(overrides = {}) {
  return mongoose.model('Client').create({
    name: 'Acme Ltd',
    email: 'billing@acme.test',
    ...overrides,
    organizationId: await orgId(overrides.organizationId),
  });
}

async function createInvoice(admin, client, overrides = {}) {
  const items = overrides.items || [{ itemName: 'Consulting', quantity: 2, price: 50, total: 100 }];
  const subTotal = items.reduce((sum, item) => sum + item.total, 0);
  return mongoose.model('Invoice').create({
    createdBy: admin._id,
    client: client._id,
    number: 1,
    year: 2026,
    date: new Date(),
    expiredDate: new Date(Date.now() + 7 * 864e5),
    items,
    subTotal,
    total: subTotal,
    currency: 'USD',
    status: 'sent',
    ...overrides,
    // Same organization as the admin unless told otherwise
    organizationId: overrides.organizationId || admin.organizationId,
  });
}

module.exports = { createAdmin, loginAs, createClient, createInvoice, createOrganization, defaultOrganization };
