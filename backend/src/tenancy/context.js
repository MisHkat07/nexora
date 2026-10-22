const { AsyncLocalStorage } = require('async_hooks');

/*
  Which organization (tenant) the current code is working for.

  Every HTTP request gets a context; the auth middleware fills in the user's organization.
  The tenant plugin reads it to scope every query. Inside a request, a query with no
  organization throws (fail closed). Code outside requests (startup, scripts, tests) runs
  without a context and must pass organizationId explicitly when it creates documents.
*/
const storage = new AsyncLocalStorage();

/** Express middleware: opens an empty context for the request. */
const requestContext = (req, res, next) => storage.run({ organizationId: null, bypass: false }, next);

/** Called by the auth middleware once the user is known. */
const setCurrentTenant = (organizationId) => {
  const store = storage.getStore();
  if (!store) throw new Error('setCurrentTenant called outside a request context');
  store.organizationId = String(organizationId);
};

const currentTenant = () => storage.getStore()?.organizationId || null;

// Mongoose queries are lazy: run them now, inside the context, not when the caller awaits
const execute = (fn) => {
  const result = fn();
  return result && typeof result.exec === 'function' ? result.exec() : result;
};

/** Runs fn as the given organization (e.g. a signed download link, a background job). */
const withTenant = (organizationId, fn) =>
  storage.run({ organizationId: String(organizationId), bypass: false }, () => execute(fn));

/**
 * Runs fn with tenant scoping switched off. Only for lookups that must work across
 * organizations before the tenant is known: finding a user at login or from a token.
 */
const withoutTenant = (fn) => storage.run({ organizationId: null, bypass: true }, () => execute(fn));

/** How the plugin should scope a query right now. */
const scopeFor = (what) => {
  const store = storage.getStore();
  if (!store || store.bypass) return { scoped: false };
  if (!store.organizationId) {
    throw new Error(`Tenant context missing: refusing to run ${what} without an organization`);
  }
  return { scoped: true, organizationId: store.organizationId };
};

module.exports = {
  requestContext,
  setCurrentTenant,
  currentTenant,
  withTenant,
  withoutTenant,
  scopeFor,
};
