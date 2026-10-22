const mongoose = require('mongoose');
const { createTestApp, closeTestApp } = require('./helpers/app');
const { defaultOrganization } = require('./helpers/factories');

let listBySettingKey;
beforeAll(async () => {
  await createTestApp();
  ({ listBySettingKey } = require('@/middlewares/settings'));
  const { _id: organizationId } = await defaultOrganization();
  await mongoose.model('Setting').insertMany([
    { settingCategory: 'app_settings', settingKey: 'company_name', settingValue: 'Acme' },
    { settingCategory: 'app_settings', settingKey: 'currency_symbol', settingValue: '$' },
    { settingCategory: 'app_settings', settingKey: 'other', settingValue: 'x' },
  ].map((setting) => ({ ...setting, organizationId })));
});
afterAll(closeTestApp);

describe('settings helpers', () => {
  test('listBySettingKey returns only the requested keys', async () => {
    const result = await listBySettingKey({ settingKeyArray: ['company_name', 'currency_symbol'] });
    expect(result.map((s) => s.settingKey).sort()).toEqual(['company_name', 'currency_symbol']);
  });

  test('listBySettingKey returns nothing for an empty list', async () => {
    expect(await listBySettingKey({ settingKeyArray: [] })).toEqual([]);
  });
});
