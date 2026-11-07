const mongoose = require('mongoose');

/*
  Durable work (emails, recurring invoices, reminders). Not tenant-scoped: the worker
  claims jobs across organizations and switches tenant while it runs one.
  A lock stops two workers from taking the same job.
*/
const jobSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['queued', 'active', 'completed', 'failed'], default: 'queued', index: true },
  runAt: { type: Date, default: Date.now, index: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  lastError: String,
  lockedAt: Date,
  created: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Job', jobSchema);
