const mongoose = require('mongoose');

const HttpError = require('@/handlers/httpError');
const { currentTenant } = require('@/tenancy/context');
const { applyPaymentDelta } = require('@/controllers/appControllers/paymentController/invoiceBalance');

const STAGES = ['Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

const draftFromText = (text) => {
  const source = String(text || '');
  const named = source.match(/\bfor\s+([A-Za-z][\w .'-]{1,80})/i);
  const qty = Number((source.match(/(\d+(?:\.\d+)?)\s*(hours?|units?|days?|items?)/i) || [])[1] || 1);
  const price = Number((source.match(/(?:at|@)\s*\$?\s*(\d+(?:\.\d+)?)/i) || [])[1] || 0);
  const itemName = (source.match(/\b(consulting|design|support|hosting|service|product)\b/i) || [])[1] || 'Service';
  return {
    clientName: (named?.[1] || 'Customer').trim(),
    items: [{ itemName, quantity: qty, price, total: Math.round(qty * price * 100) / 100 }],
  };
};

const askOpenAI = async (prompt) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
};

const dashboard = async (req, res) => {
  const Invoice = mongoose.model('Invoice');
  const Deal = mongoose.model('Deal');
  const Expense = mongoose.model('Expense');
  const invoices = await Invoice.find({ removed: false }).select('total discount credit paymentStatus taxTotal created').lean();
  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  const thisMonth = invoices.filter((row) => row.created >= month);
  const unpaid = invoices
    .filter((row) => row.paymentStatus !== 'paid')
    .reduce((sum, row) => sum + Math.max((row.total || 0) - (row.discount || 0) - (row.credit || 0), 0), 0);
  const collected = invoices.reduce((sum, row) => sum + (row.credit || 0), 0);
  const expenses = await Expense.find({ removed: false }).select('amount').lean();
  const expenseTotal = expenses.reduce((sum, row) => sum + (row.amount || 0), 0);
  const deals = await Deal.find({ removed: false, stage: { $nin: ['Lost'] } }).select('value stage').lean();
  return res.status(200).json({
    success: true,
    result: {
      invoices: invoices.length,
      invoicesThisMonth: thisMonth.length,
      revenueThisMonth: thisMonth.reduce((sum, row) => sum + (row.total || 0), 0),
      unpaid,
      collected,
      expenses: expenseTotal,
      profit: collected - expenseTotal,
      pipeline: deals.reduce((sum, row) => sum + (row.value || 0), 0),
      stages: STAGES.map((stage) => ({
        stage,
        count: deals.filter((row) => row.stage === stage).length,
      })),
    },
    message: '',
  });
};

const reports = async (req, res) => {
  const now = new Date();
  const invoices = await mongoose
    .model('Invoice')
    .find({ removed: false, paymentStatus: { $ne: 'paid' } })
    .select('total discount credit expiredDate taxTotal')
    .lean();
  const buckets = { current: 0, days30: 0, days60: 0, days90: 0 };
  let tax = 0;
  for (const invoice of invoices) {
    const due = Math.max((invoice.total || 0) - (invoice.discount || 0) - (invoice.credit || 0), 0);
    const days = invoice.expiredDate ? (now - new Date(invoice.expiredDate)) / 864e5 : 0;
    if (days <= 0) buckets.current += due;
    else if (days <= 30) buckets.days30 += due;
    else if (days <= 60) buckets.days60 += due;
    else buckets.days90 += due;
    tax += invoice.taxTotal || 0;
  }
  const paid = await mongoose.model('Invoice').find({ removed: false }).select('credit taxTotal').lean();
  const collected = paid.reduce((sum, row) => sum + (row.credit || 0), 0);
  const taxCollected = paid.reduce((sum, row) => sum + (row.taxTotal || 0), 0);
  const expenseTotal = (await mongoose.model('Expense').find({ removed: false }).select('amount').lean()).reduce(
    (sum, row) => sum + (row.amount || 0),
    0
  );
  return res.status(200).json({
    success: true,
    result: { aging: buckets, profitAndLoss: { income: collected, expenses: expenseTotal, profit: collected - expenseTotal }, tax: taxCollected || tax },
    message: '',
  });
};

const search = async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q.length < 1) return res.status(200).json({ success: true, result: [], message: '' });
  const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [clients, invoices, quotes, leads, products] = await Promise.all([
    mongoose.model('Client').find({ removed: false, name: pattern }).select('name email').limit(5).lean(),
    mongoose.model('Invoice').find({ removed: false }).select('number year total').sort({ created: -1 }).limit(50).lean(),
    mongoose.model('Quote').find({ removed: false }).select('number year total notes').sort({ created: -1 }).limit(50).lean(),
    mongoose.model('Lead').find({ removed: false, name: pattern }).select('name email status').limit(5).lean(),
    mongoose.model('Product').find({ removed: false, name: pattern }).select('name price sku').limit(5).lean(),
  ]);
  const quoteHits = quotes.filter((row) => pattern.test(String(row.number)) || pattern.test(row.notes || '')).slice(0, 5);
  const invoiceHits = invoices.filter((row) => pattern.test(String(row.number))).slice(0, 5);
  const result = [
    ...clients.map((row) => ({ type: 'customer', id: row._id, label: row.name, href: `/customer` })),
    ...invoiceHits.map((row) => ({ type: 'invoice', id: row._id, label: `Invoice ${row.number}/${row.year}`, href: `/invoice/read/${row._id}` })),
    ...quoteHits.map((row) => ({ type: 'quote', id: row._id, label: `Quote ${row.number}/${row.year}`, href: `/quote/read/${row._id}` })),
    ...leads.map((row) => ({ type: 'lead', id: row._id, label: row.name, href: `/pipeline` })),
    ...products.map((row) => ({ type: 'product', id: row._id, label: row.name, href: `/product` })),
  ];
  return res.status(200).json({ success: true, result, message: '' });
};

const convertLead = async (req, res) => {
  const lead = await mongoose.model('Lead').findOne({ _id: req.params.id, removed: false }).exec();
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (lead.status === 'converted' && lead.client) {
    return res.status(200).json({ success: true, result: { client: lead.client }, message: 'Already converted' });
  }
  const client = await mongoose.model('Client').create({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    createdBy: req.admin._id,
  });
  lead.status = 'converted';
  lead.client = client._id;
  await lead.save();
  return res.status(200).json({ success: true, result: { client: client._id }, message: 'Lead converted to a customer' });
};

const applyCredit = async (req, res) => {
  const amount = Number(req.body?.amount);
  const invoiceId = req.body?.invoiceId;
  if (!amount || amount <= 0) throw new HttpError(400, 'Amount must be greater than zero.');
  let note;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const invoice = await mongoose.model('Invoice').findOne({ _id: invoiceId, removed: false }).session(session).setOptions({ autopopulate: false }).exec();
      if (!invoice) throw new HttpError(404, 'Invoice not found');
      [note] = await mongoose.model('CreditNote').create(
        [{ invoice: invoice._id, amount, reason: String(req.body?.reason || '').slice(0, 2000), status: 'applied' }],
        { session }
      );
      await applyPaymentDelta({ invoiceId: invoice._id, delta: amount, session });
    });
  } finally {
    await session.endSession();
  }
  return res.status(201).json({ success: true, result: note, message: 'Credit note applied' });
};

const refundCredit = async (req, res) => {
  const session = await mongoose.startSession();
  let note;
  try {
    await session.withTransaction(async () => {
      note = await mongoose.model('CreditNote').findOne({ _id: req.params.id, removed: false }).session(session).exec();
      if (!note) throw new HttpError(404, 'Credit note not found');
      if (note.status === 'refunded') return;
      await applyPaymentDelta({ invoiceId: note.invoice, delta: -note.amount, session });
      note.status = 'refunded';
      await note.save({ session });
    });
  } finally {
    await session.endSession();
  }
  return res.status(200).json({ success: true, result: note, message: 'Refund recorded' });
};

const moveStock = async (req, res) => {
  const quantity = Number(req.body?.quantity);
  const type = req.body?.type || 'adjust';
  if (!['in', 'out', 'adjust'].includes(type)) throw new HttpError(400, 'Type must be in, out or adjust.');
  if (!Number.isFinite(quantity)) throw new HttpError(400, 'Quantity is required.');
  const delta = type === 'out' ? -Math.abs(quantity) : type === 'in' ? Math.abs(quantity) : quantity;
  let movement;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const product = await mongoose.model('Product').findOneAndUpdate(
        { _id: req.body.product, removed: false },
        { $inc: { quantity: delta } },
        { new: true, session }
      );
      if (!product) throw new HttpError(404, 'Product not found');
      if (product.quantity < 0) throw new HttpError(400, 'Not enough stock.');
      [movement] = await mongoose.model('StockMovement').create(
        [{ product: product._id, warehouse: req.body.warehouse || '', quantity: delta, type, note: req.body.note || '' }],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
  return res.status(201).json({ success: true, result: movement, message: 'Stock updated' });
};

const importClients = async (req, res) => {
  const csv = String(req.body?.csv || '');
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new HttpError(400, 'Paste a CSV with a header row and at least one customer.');
  const headers = lines[0].split(',').map((cell) => cell.trim().toLowerCase());
  const nameAt = headers.indexOf('name');
  if (nameAt < 0) throw new HttpError(400, 'The CSV needs a name column.');
  const emailAt = headers.indexOf('email');
  const phoneAt = headers.indexOf('phone');
  const created = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map((cell) => cell.trim());
    if (!cells[nameAt]) continue;
    created.push(
      await mongoose.model('Client').create({
        name: cells[nameAt],
        email: emailAt >= 0 ? cells[emailAt] : '',
        phone: phoneAt >= 0 ? cells[phoneAt] : '',
        createdBy: req.admin._id,
      })
    );
  }
  return res.status(201).json({ success: true, result: { imported: created.length }, message: `Imported ${created.length} customers` });
};

const exportClients = async (req, res) => {
  const rows = await mongoose.model('Client').find({ removed: false }).select('name email phone country').lean();
  const csv = ['name,email,phone,country', ...rows.map((row) => [row.name, row.email, row.phone, row.country].map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  return res.status(200).send(csv);
};

const aiDraft = async (req, res) => {
  const text = String(req.body?.text || '');
  if (text.length < 3) throw new HttpError(400, 'Describe the invoice or quote first.');
  let draft = null;
  const remote = await askOpenAI(
    `Turn this into JSON {"clientName","items":[{"itemName","quantity","price"}]} and nothing else:\n${text}`
  );
  if (remote) {
    try {
      draft = JSON.parse(remote.replace(/```json|```/g, '').trim());
    } catch {
      draft = null;
    }
  }
  if (!draft?.items) draft = draftFromText(text);
  return res.status(200).json({ success: true, result: draft, message: '' });
};

const aiReceipt = async (req, res) => {
  const text = String(req.body?.text || '');
  const amount = Number((text.match(/(\d+(?:\.\d{1,2})?)/) || [])[1] || 0);
  const vendor = (text.match(/\b(?:at|from)\s+([A-Za-z][\w .'-]{1,60})/i) || [])[1] || 'Vendor';
  return res.status(200).json({
    success: true,
    result: { vendor: vendor.trim(), amount, category: /meal|lunch|dinner|coffee/i.test(text) ? 'Meals' : 'General', notes: text.slice(0, 500) },
    message: '',
  });
};

const aiAsk = async (req, res) => {
  const question = String(req.body?.question || '').slice(0, 500);
  const invoices = await mongoose.model('Invoice').countDocuments({ removed: false });
  const unpaid = await mongoose.model('Invoice').countDocuments({ removed: false, paymentStatus: { $ne: 'paid' } });
  const clients = await mongoose.model('Client').countDocuments({ removed: false });
  const local = `You have ${clients} customers, ${invoices} invoices, and ${unpaid} that are not fully paid.`;
  const remote = await askOpenAI(`${local}\n\nQuestion: ${question}\nAnswer in one or two sentences.`);
  return res.status(200).json({ success: true, result: { answer: remote || local }, message: '' });
};

const onboarding = async (req, res) => {
  const [clients, invoices, team] = await Promise.all([
    mongoose.model('Client').countDocuments({ removed: false }),
    mongoose.model('Invoice').countDocuments({ removed: false }),
    mongoose.model('Admin').countDocuments({ removed: false }),
  ]);
  const settings = await require('@/middlewares/settings').loadSettings();
  return res.status(200).json({
    success: true,
    result: {
      steps: [
        { key: 'customer', done: clients > 0, label: 'Add a customer' },
        { key: 'invoice', done: invoices > 0, label: 'Create an invoice' },
        { key: 'brand', done: Boolean(settings.company_logo), label: 'Upload your logo' },
        { key: 'team', done: team > 1, label: 'Invite a teammate' },
      ],
    },
    message: '',
  });
};

const sampleData = async (req, res) => {
  const existing = await mongoose.model('Client').findOne({ name: 'Sample Customer', removed: false }).exec();
  if (existing) {
    return res.status(200).json({ success: true, result: { client: existing._id }, message: 'Sample data is already there.' });
  }
  const client = await mongoose.model('Client').create({
    name: 'Sample Customer',
    email: 'sample@customer.test',
    createdBy: req.admin._id,
  });
  await mongoose.model('Invoice').create({
    createdBy: req.admin._id,
    client: client._id,
    number: 1000,
    year: new Date().getFullYear(),
    date: new Date(),
    expiredDate: new Date(Date.now() + 14 * 864e5),
    items: [{ itemName: 'Sample service', quantity: 1, price: 100, total: 100 }],
    subTotal: 100,
    taxTotal: 0,
    total: 100,
    currency: 'USD',
    status: 'draft',
  });
  return res.status(201).json({ success: true, result: { client: client._id }, message: 'Sample customer and invoice added.' });
};

const exportData = async (req, res) => {
  const pick = async (name, fields) => mongoose.model(name).find({ removed: false }).select(fields).lean();
  const result = {
    organizationId: currentTenant(),
    exportedAt: new Date(),
    clients: await pick('Client', 'name email phone'),
    invoices: await pick('Invoice', 'number year total paymentStatus status'),
    quotes: await pick('Quote', 'number year total status'),
    payments: await pick('Payment', 'number amount date'),
    products: await pick('Product', 'name sku price quantity'),
    expenses: await pick('Expense', 'amount category date'),
  };
  return res.status(200).json({ success: true, result, message: '' });
};

const deleteWorkspace = async (req, res) => {
  if (req.admin.role !== 'owner') throw new HttpError(403, 'Only the owner can delete the workspace.');
  const org = await mongoose.model('Organization').findById(currentTenant()).exec();
  if (req.body?.confirm !== org?.name) throw new HttpError(400, 'Type the organization name to confirm deletion.');
  const names = ['Client', 'Invoice', 'Quote', 'Payment', 'Product', 'Lead', 'Deal', 'Expense', 'Contact'];
  for (const name of names) {
    await mongoose.model(name).updateMany({}, { $set: { removed: true } });
  }
  org.status = 'suspended';
  await org.save();
  return res.status(200).json({ success: true, result: null, message: 'Workspace data is marked deleted and the organization is suspended.' });
};

const readAllNotifications = async (req, res) => {
  await mongoose.model('Notification').updateMany({ user: req.admin._id, read: false }, { $set: { read: true } });
  return res.status(200).json({ success: true, result: null, message: 'Notifications marked read' });
};

const savedViews = async (req, res) => {
  const Setting = mongoose.model('Setting');
  const current = await Setting.findOne({ settingKey: 'saved_views' }).exec();
  const views = Array.isArray(current?.settingValue) ? current.settingValue : [];
  if (req.method === 'GET') return res.status(200).json({ success: true, result: views, message: '' });
  const name = String(req.body?.name || '').trim();
  if (name.length < 1) throw new HttpError(400, 'Name the view.');
  const next = [...views, { name: name.slice(0, 80), entity: req.body.entity || 'client', filter: req.body.filter || {} }].slice(-20);
  if (current) {
    current.settingValue = next;
    current.markModified('settingValue');
    await current.save();
  } else {
    await Setting.create({
      settingCategory: 'app_settings',
      settingKey: 'saved_views',
      settingValue: next,
      valueType: 'Array',
    });
  }
  return res.status(201).json({ success: true, result: next, message: 'View saved' });
};

const convertCurrency = async (req, res) => {
  const amount = Number(req.query.amount);
  const from = String(req.query.from || 'USD').toUpperCase();
  const to = String(req.query.to || 'USD').toUpperCase();
  if (!Number.isFinite(amount)) throw new HttpError(400, 'Amount is required.');
  const rates = await mongoose.model('ExchangeRate').find({ removed: false, code: { $in: [from, to] } }).lean();
  // A rate is how many US dollars one unit of that currency is worth.
  const rateOf = (code) => (code === 'USD' ? 1 : rates.find((row) => row.code === code)?.rate);
  const fromRate = rateOf(from);
  const toRate = rateOf(to);
  if (!fromRate || !toRate) throw new HttpError(400, 'Add an exchange rate for that currency first.');
  const value = (amount * fromRate) / toRate;
  return res.status(200).json({ success: true, result: { amount: Math.round(value * 100) / 100, from, to }, message: '' });
};

module.exports = {
  STAGES,
  draftFromText,
  dashboard,
  reports,
  search,
  convertLead,
  applyCredit,
  refundCredit,
  moveStock,
  importClients,
  exportClients,
  aiDraft,
  aiReceipt,
  aiAsk,
  onboarding,
  sampleData,
  exportData,
  deleteWorkspace,
  readAllNotifications,
  convertCurrency,
  savedViews,
};
