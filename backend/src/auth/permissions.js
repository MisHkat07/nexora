/*
  Role-based access control.

  A permission is "<entity>:<action>", e.g. "invoice:create". Actions:
    read     view, list, search, filter, summarize, download PDFs
    create, update, delete
    mail     email the document to the customer
    convert  turn a quote into an invoice
    manage   (team) invite users, change roles and other users' passwords

  The server enforces these on every route; the frontend receives the same list at login
  to hide what the user can't do.
*/

const ROLES = ['owner', 'admin', 'accountant', 'sales', 'viewer'];

const ALL = '*';

const crud = (entity) => ['read', 'create', 'update', 'delete'].map((action) => `${entity}:${action}`);
const readOnly = (...entities) => entities.map((entity) => `${entity}:read`);

const ROLE_PERMISSIONS = {
  // Owner and admin can do everything (the owner is also the organization's billing contact)
  owner: [ALL],
  admin: [ALL],
  // Finance: invoices, payments, taxes and payment modes; can add and edit customers
  accountant: [
    'client:read',
    'client:create',
    'client:update',
    ...crud('invoice'),
    'invoice:mail',
    ...crud('payment'),
    'payment:mail',
    ...crud('paymentmode'),
    ...crud('taxes'),
    ...readOnly('quote', 'setting', 'team'),
  ],
  // Sales: customers and quotes (including converting and sending them); sees invoices and payments
  sales: [
    'client:read',
    'client:create',
    'client:update',
    ...crud('quote'),
    'quote:mail',
    'quote:convert',
    ...readOnly('invoice', 'payment', 'paymentmode', 'taxes', 'setting', 'team'),
  ],
  // Read-only access to everything
  viewer: readOnly('client', 'invoice', 'quote', 'payment', 'paymentmode', 'taxes', 'setting', 'team'),
};

/** The permissions a role has, as sent to the frontend (["*"] means everything). */
const permissionsFor = (role) => ROLE_PERMISSIONS[role] || [];

/** Whether a role has a permission. Unknown roles have none. */
const can = (role, permission) => {
  const granted = permissionsFor(role);
  return granted.includes(ALL) || granted.includes(permission);
};

module.exports = { ROLES, ROLE_PERMISSIONS, permissionsFor, can };
