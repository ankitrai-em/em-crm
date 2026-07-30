import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { parse as parseCsv } from 'csv-parse/sync';
import { nanoid } from 'nanoid';
import {
  listLeads, getLead, insertLead, patchLead, listUsers, getUser, getUserByName, getUserByEmail, insertUser, patchUser, deleteUser, DEFAULT_PASSWORD,
  getSetting, setSetting, insertAuditLog, listAuditLog,
  listDealerStates, listDealerCities, listDealers, replaceDealers, countDealers,
  listInventory, getInventoryItem, insertInventoryItem, patchInventoryItem, deleteInventoryItem,
  listAccessories, insertAccessory, deleteAccessory,
} from './db.js';
import { placeCall } from './telephony.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(__dirname, '..', 'uploads');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set in server/.env — using an insecure default. Set a real secret before deploying.');
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-insecure-secret-change-me';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => cb(null, `${nanoid(10)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const PORT = process.env.PORT || 8787;

function sanitizeUser(user) {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
}

function logAudit(req, action, target, details) {
  const actor = getUser(req.authUser?.sub);
  insertAuditLog({
    id: 'A' + nanoid(10),
    ts: Date.now(),
    actorId: actor?.id || null,
    actorName: actor?.name || 'Unknown',
    action,
    targetId: target?.id || null,
    targetName: target?.name || null,
    details: details || {},
  });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    req.authUser = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

function requireAdmin(req, res, next) {
  if (req.authUser?.role !== 'Admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

// ---- auth ----

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password || '', user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ sub: user.id, role: user.role }, EFFECTIVE_JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: sanitizeUser(user) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = getUser(req.authUser.sub);
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  res.json(sanitizeUser(user));
});

function normalizeIncomingLead(body) {
  const name = body.name || body.full_name || body.fullName || [body.first_name, body.last_name].filter(Boolean).join(' ') || null;
  const phone = body.phone || body.phone_number || body.phoneNumber || body.mobile || '';
  const email = body.email || '';
  if (!phone && !email) return { error: 'phone or email is required' };

  const source = body.source || body.lead_source || 'Webhook';
  const campaign = body.campaign || body.campaign_name || body.sourceMedium || body.source_medium || '—';
  const now = Date.now();
  return {
    lead: {
      id: 'L' + nanoid(6).toUpperCase(),
      name,
      phone: String(phone),
      email,
      city: body.city || '—',
      pin: body.pin || body.pincode || body.zip || '—',
      source,
      campaign,
      createdOn: now,
      owner: body.owner || 'Unassigned',
      stage: 1,
      leadScore: 0,
      followupAt: null,
      taskDate: now + 86400000,
      reTriggered: false,
      attempts: 0,
      activity: [{ ts: now, kind: 'note', text: `Lead captured via ${source}` }],
      testRide: null,
      sale: null,
      // Freeform bag for source-specific attributes (EBike model, budget, gclid, company, etc.)
      // that don't map to a first-class column. Shown read-only on the lead detail page.
      meta: body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta) ? body.meta : {},
    },
  };
}

// List all leads
app.get('/api/leads', requireAuth, (_req, res) => {
  res.json(listLeads());
});

app.get('/api/leads/:id', requireAuth, (req, res) => {
  const lead = getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: 'not found' });
  res.json(lead);
});

// Manual lead creation from the app UI (Quick Add / Add Lead modals)
app.post('/api/leads', requireAuth, (req, res) => {
  const { lead, error } = normalizeIncomingLead(req.body || {});
  if (error) return res.status(400).json({ error });
  res.status(201).json(insertLead(lead));
});

// Generic intake endpoint for external lead sources (ad platforms, website forms, CRMs).
// Point any POST webhook here; field names are normalized on a best-effort basis.
app.post('/api/leads/webhook', (req, res) => {
  const { lead, error } = normalizeIncomingLead(req.body || {});
  if (error) return res.status(400).json({ error });
  res.status(201).json(insertLead(lead));
});

// Partial update: stage changes, follow-ups, test rides, sales, manual edits.
// Optionally pass `activityNote` (string) or `activityEntry` (full ActivityEntry) to append to the timeline.
app.patch('/api/leads/:id', requireAuth, (req, res) => {
  const { activityNote, activityEntry, ...patch } = req.body || {};
  const entry = activityEntry || (activityNote ? { ts: Date.now(), kind: 'note', text: activityNote } : undefined);
  const updated = patchLead(req.params.id, patch, entry);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

// Click-to-call: dials out through the configured telephony provider (mock by default,
// see server/src/telephony.js and .env.example for wiring up Sarv/Twilio/Exotel).
// The agent leg is resolved dynamically from the lead's owner -> that user's phone number
// in User Management, so the same lead always rings the right agent's phone.
app.post('/api/leads/:id/call', requireAuth, async (req, res) => {
  const lead = getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: 'not found' });

  const owner = getUserByName(lead.owner);
  const agentNumber = owner?.phone || null;
  if (!agentNumber) {
    return res.status(400).json({
      error: lead.owner && lead.owner !== 'Unassigned'
        ? `${lead.owner} has no phone number on file. Add one in User Management before calling.`
        : 'This lead has no owner assigned. Assign an owner with a phone number in User Management before calling.',
    });
  }

  try {
    const result = await placeCall({ toNumber: lead.phone, agentNumber, leadId: lead.id }, getSetting('telephony'));
    const updated = patchLead(lead.id, {}, {
      ts: Date.now(),
      kind: 'call',
      text: `Click-to-call: connecting ${lead.owner} (${agentNumber}) to ${lead.phone} via ${result.provider} (${result.status}).`,
    });
    res.json({ ...result, lead: updated });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Invoice / document upload. Field name must be "file". Returns the stored filename,
// which the client persists on the lead's sale record and can fetch back from /uploads/:fileName.
app.post('/api/uploads', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  res.status(201).json({ fileName: req.file.filename, originalName: req.file.originalname, url: `/uploads/${req.file.filename}` });
});

// ---- integrations ----
// Admin-only. Currently just telephony (click-to-call); more providers can be added
// as additional keys the same way (getSetting/setSetting are a generic key-value store).

app.get('/api/integrations/telephony', requireAuth, requireAdmin, (_req, res) => {
  res.json(getSetting('telephony') || { provider: 'mock', sarv: {}, twilio: {}, exotel: {} });
});

app.put('/api/integrations/telephony', requireAuth, requireAdmin, (req, res) => {
  const { provider, sarv, twilio, exotel } = req.body || {};
  const saved = setSetting('telephony', {
    provider: provider || 'mock',
    sarv: sarv || {},
    twilio: twilio || {},
    exotel: exotel || {},
  });
  res.json(saved);
});

// ---- dispositions / sub-dispositions ----
// Listing is open to any logged-in user (needed for the Log a Call form); editing the
// taxonomy is Admin-only. Stored as one JSON blob: [{ id, label, connected, subDispositions: [{id,label}] }]

app.get('/api/settings/dispositions', requireAuth, (_req, res) => {
  res.json(getSetting('dispositions') || []);
});

app.put('/api/settings/dispositions', requireAuth, requireAdmin, (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'body must be an array of dispositions' });
  res.json(setSetting('dispositions', req.body));
});

// ---- dealers (test ride locations) ----
// Admin uploads a CSV (same columns as the franchise/dealer export) which fully replaces
// the dealer list. Everyone logged in can browse states/cities/dealers to book a test ride.

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.get('/api/dealers/states', requireAuth, (_req, res) => {
  res.json(listDealerStates());
});

app.get('/api/dealers/cities', requireAuth, (req, res) => {
  if (!req.query.state) return res.status(400).json({ error: 'state is required' });
  res.json(listDealerCities(req.query.state));
});

app.get('/api/dealers', requireAuth, (req, res) => {
  const { state, city } = req.query;
  if (!state || !city) return res.status(400).json({ error: 'state and city are required' });
  res.json(listDealers(state, city));
});

app.get('/api/dealers/count', requireAuth, requireAdmin, (_req, res) => {
  res.json({ count: countDealers() });
});

app.post('/api/dealers/import', requireAuth, requireAdmin, csvUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  let records;
  try {
    // Real-world exports sometimes have an unescaped newline inside a field (e.g. a
    // multi-line address) which breaks strict column-count checking; tolerate that
    // rather than failing the whole import over one bad row.
    records = parseCsv(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
  } catch (err) {
    return res.status(400).json({ error: 'Could not parse CSV: ' + err.message });
  }
  const rows = records
    .map((r, i) => ({
      id: 'D' + String(i + 1).padStart(5, '0'),
      name: r['Name'] || '',
      city: r['City'] || '',
      state: r['State'] || '',
      pin: r['PIN Code'] || '',
      address: r['Address'] || '',
      phone: r['Primary Contact Number'] || '',
      status: r['Status'] || '',
      franchiseCode: r['Franchise Code'] || '',
    }))
    // Guards against the rare malformed row (see above) landing with garbage shifted into these fields.
    .filter((r) => r.name && r.state && r.city);
  if (!rows.length) return res.status(400).json({ error: 'No usable rows found — check the CSV has Name/City/State/PIN Code/Address/Primary Contact Number/Status columns' });
  const count = replaceDealers(rows);
  logAudit(req, 'dealers.imported', null, { rowCount: count });
  res.json({ count });
});

// ---- inventory ----
// Listing open to any logged-in user (needed for the Sale form); managing is Admin-only.

app.get('/api/inventory', requireAuth, (_req, res) => {
  res.json(listInventory());
});

app.post('/api/inventory', requireAuth, requireAdmin, (req, res) => {
  const { modelRange, modelSku, modelColour } = req.body || {};
  if (!modelRange || !modelSku || !modelColour) return res.status(400).json({ error: 'modelRange, modelSku, and modelColour are required' });
  const item = insertInventoryItem({ id: 'I' + nanoid(8).toUpperCase(), modelRange, modelSku, modelColour, createdOn: Date.now() });
  res.status(201).json(item);
});

app.patch('/api/inventory/:id', requireAuth, requireAdmin, (req, res) => {
  const updated = patchInventoryItem(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

app.delete('/api/inventory/:id', requireAuth, requireAdmin, (req, res) => {
  if (!getInventoryItem(req.params.id)) return res.status(404).json({ error: 'not found' });
  deleteInventoryItem(req.params.id);
  res.json({ ok: true });
});

// ---- accessories ----

app.get('/api/accessories', requireAuth, (_req, res) => {
  res.json(listAccessories());
});

app.post('/api/accessories', requireAuth, requireAdmin, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  res.status(201).json(insertAccessory({ id: 'C' + nanoid(8).toUpperCase(), name, createdOn: Date.now() }));
});

app.delete('/api/accessories/:id', requireAuth, requireAdmin, (req, res) => {
  deleteAccessory(req.params.id);
  res.json({ ok: true });
});

// ---- sales audit ----
// Admin reviews every lead with a recorded sale and marks it successful or rejected.

app.get('/api/sales', requireAuth, requireAdmin, (_req, res) => {
  const sales = listLeads()
    .filter((l) => l.sale)
    .map((l) => ({ leadId: l.id, leadName: l.name, leadPhone: l.phone, owner: l.owner, sale: l.sale }));
  res.json(sales);
});

app.patch('/api/leads/:id/sale-audit', requireAuth, requireAdmin, (req, res) => {
  const lead = getLead(req.params.id);
  if (!lead || !lead.sale) return res.status(404).json({ error: 'not found' });
  const { auditStatus, auditNote } = req.body || {};
  if (!['successful', 'rejected'].includes(auditStatus)) return res.status(400).json({ error: 'auditStatus must be "successful" or "rejected"' });
  const updated = patchLead(lead.id, { sale: { ...lead.sale, auditStatus, auditNote: auditNote || '' } }, {
    ts: Date.now(),
    kind: 'note',
    text: `Sale audit: marked ${auditStatus}${auditNote ? ' — ' + auditNote : ''}`,
  });
  res.json(updated);
});

// ---- users ----
// Listing is open to any logged-in user (needed for owner filters, call routing);
// creating, editing, deleting, and resetting passwords are Admin-only.

app.get('/api/users', requireAuth, (_req, res) => {
  res.json(listUsers().map(sanitizeUser));
});

app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
  const { name, email, phone, role } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const user = insertUser({
    id: 'U' + nanoid(6).toUpperCase(),
    name,
    email: email || '',
    phone: phone || '',
    role: role || 'Agent',
    password: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    createdOn: Date.now(),
  });
  logAudit(req, 'user.created', user, { email: user.email, role: user.role });
  res.status(201).json(sanitizeUser(user));
});

app.patch('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { password, ...rest } = req.body || {};
  const before = getUser(req.params.id);
  const updated = patchUser(req.params.id, rest);
  if (!updated) return res.status(404).json({ error: 'not found' });
  const changed = {};
  for (const key of ['name', 'email', 'phone', 'role']) {
    if (key in rest && before[key] !== updated[key]) changed[key] = { from: before[key], to: updated[key] };
  }
  if (Object.keys(changed).length) logAudit(req, 'user.updated', updated, changed);
  res.json(sanitizeUser(updated));
});

app.post('/api/users/:id/reset-password', requireAuth, requireAdmin, (req, res) => {
  const target = getUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'not found' });
  const newPassword = req.body?.password || DEFAULT_PASSWORD;
  const updated = patchUser(req.params.id, { password: bcrypt.hashSync(newPassword, 10) });
  logAudit(req, 'user.password_reset', target, {});
  res.json(sanitizeUser(updated));
});

app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const target = getUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'not found' });
  deleteUser(req.params.id);
  logAudit(req, 'user.deleted', target, {});
  res.json({ ok: true });
});

// ---- audit log ----

app.get('/api/audit-log', requireAuth, requireAdmin, (_req, res) => {
  res.json(listAuditLog());
});

app.listen(PORT, () => {
  console.log(`Lead API listening on http://localhost:${PORT}`);
});
