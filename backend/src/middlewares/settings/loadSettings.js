const mongoose = require('mongoose');

const { currentTenant } = require('@/tenancy/context');
const { defaultSettings } = require('@/tenancy/createOrganization');
const listAllSettings = require('./listAllSettings');

const TTL_MS = 60 * 1000;
const cache = new Map();
const ensured = new Set();

/** Drops one organization's cached settings, or every organization's when called with no id. */
const invalidateSettings = (organizationId) => {
  if (organizationId) cache.delete(String(organizationId));
  else cache.clear();
};

/**
 * Inserts any default setting the organization doesn't have yet (new keys shipped after it signed up).
 * Safe to call on every settings read: each organization is checked once per process.
 */
const ensureDefaults = async () => {
  const orgId = currentTenant();
  if (!orgId || ensured.has(orgId)) return;
  const Model = mongoose.model('Setting');
  const existing = await Model.find({ removed: false }).select('settingKey').lean();
  const have = new Set(existing.map((row) => row.settingKey));
  const missing = defaultSettings().filter((setting) => !have.has(setting.settingKey));
  if (missing.length) await Model.insertMany(missing);
  ensured.add(orgId);
};

const loadSettings = async () => {
  await ensureDefaults();
  const orgId = currentTenant() || 'none';
  const hit = cache.get(orgId);
  if (hit && hit.expires > Date.now()) return hit.value;

  const allSettings = {};
  const datas = await listAllSettings();
  datas.forEach(({ settingKey, settingValue }) => {
    allSettings[settingKey] = settingValue;
  });
  if (orgId !== 'none') cache.set(orgId, { value: allSettings, expires: Date.now() + TTL_MS });
  return allSettings;
};

module.exports = loadSettings;
module.exports.invalidateSettings = invalidateSettings;
module.exports.ensureDefaults = ensureDefaults;
