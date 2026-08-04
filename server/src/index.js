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
  listLeads, getLead, insertLead, patchLead, findLeadByPhone, getVisibleOwnerNames,
  listUsers, getUser, getUserByName, getUserByEmail, insertUser, patchUser, deleteUser, DEFAULT_PASSWORD,
  getSetting, setSetting, insertAuditLog, listAuditLog,
  listDealerStates, listDealerCities, listDealers, replaceDealers, countDealers,
  listInventory, getInventoryItem, insertInventoryItem, patchInventoryItem, deleteInventoryItem,
  listAccessories, insertAccessory, deleteAccessory,
  PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS,
} from './db.js';
import { placeCall } from './telephony.js';
import { istParts, isWithinAllocationWindow, allocateLeadToNextUser, allocatePoolLeads, startAllocationScheduler } from './allocation.js';
import { startBackupScheduler } from './backup.js';

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

// Used for CSV imports (leads, dealers) — parsed in memory, never written to disk.
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const PORT = process.env.PORT || 8787;

function sanitizeUser(user) {
  if (!user) return user;
  const { password, tokenVersion, ...safe } = user;
  return { ...safe, active: !!safe.active, hierarchyEnabled: !!safe.hierarchyEnabled, inPool: !!safe.inPool, mustChangePassword: !!safe.mustChangePassword };
}

function csvEscape(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCsv(headers, rows) {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
}

// Merges a repeat submission (same phone number already on file) into the existing lead
// instead of creating a duplicate row: updates whichever fields came in with a new value,
// bumps taskDate to now, flags reTriggered, and logs what changed — but never touches
// createdOn, owner, or stage, so an agent's existing work on the lead isn't disturbed.
function upsertLead(rawLead) {
  const existing = findLeadByPhone(rawLead.phone);
  if (!existing) return { lead: insertLead(rawLead), isDuplicate: false };

  const changes = [];
  const patch = { reTriggered: true, taskDate: Date.now() };
  for (const field of ['name', 'email', 'city', 'pin', 'source', 'campaign']) {
    const incoming = rawLead[field];
    if (incoming && incoming !== '—' && incoming !== existing[field]) {
      changes.push(`${field}: '${existing[field] || '—'}' → '${incoming}'`);
      patch[field] = incoming;
    }
  }
  if (rawLead.meta && Object.keys(rawLead.meta).length) {
    patch.meta = { ...existing.meta, ...rawLead.meta };
  }
  const updated = patchLead(existing.id, patch, {
    ts: Date.now(),
    kind: 'note',
    text: `Repeat submission via ${rawLead.source || 'unknown source'}` + (changes.length ? ` — ${changes.join('; ')}` : ''),
  });
  return { lead: updated, isDuplicate: true };
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
    // tokenVersion is bumped for everyone at the 11:59 PM reset, which invalidates all
    // outstanding tokens even though JWTs are otherwise stateless.
    const user = getUser(decoded.sub);
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Session expired, please log in again' });
    }
    req.authUser = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

// Dynamic, Admin-editable role x permission matrix (see Permissions page). Admin always
// passes regardless of what's stored, so a misconfigured matrix can never lock Admin out.
function requirePermission(key) {
  return (req, res, next) => {
    if (req.authUser?.role === 'Admin') return next();
    const matrix = getSetting('rolePermissions') || DEFAULT_ROLE_PERMISSIONS;
    const rolePerms = matrix[req.authUser?.role] || {};
    if (!rolePerms[key]) return res.status(403).json({ error: 'You do not have permission to do this' });
    next();
  };
}

// Public endpoint protection: if an Admin has set a webhook secret under Integrations,
// every POST must carry it; if none is set, the endpoint stays open (today's behavior).
function checkWebhookSecret(req, res, next) {
  const configured = getSetting('webhookSecret');
  if (!configured) return next();
  if (req.headers['x-webhook-secret'] !== configured) {
    return res.status(401).json({ error: 'Invalid or missing webhook secret' });
  }
  next();
}

// ---- auth ----

// Eligibility for lead allocation: the FIRST activity of the day (login OR an already-valid
// session resuming via /api/auth/me — most users never re-type their password once a tab
// stays open) decides Active/Inactive: before 11:00 AM IST = Active. Later same-day activity
// doesn't re-evaluate this, so an already-Active user doesn't flip back by refreshing at 3pm.
//
// This MUST run on both /login and /me. Evaluating it only on /login was the actual bug
// behind "leads keep going to whoever explicitly typed their password, not everyone who's
// working today" — a user whose token is still valid from a previous session never hits
// /login again, so their active flag was never being refreshed for the new day at all.
function evaluateDailyEligibility(user) {
  const { dateString, hour } = istParts();
  if (user.lastLoginDate !== dateString) {
    return patchUser(user.id, { active: hour < 11, lastLoginDate: dateString });
  }
  return user;
}

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  let user = getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password || '', user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  user = evaluateDailyEligibility(user);

  const token = jwt.sign({ sub: user.id, role: user.role, tokenVersion: user.tokenVersion }, EFFECTIVE_JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: sanitizeUser(user) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  let user = getUser(req.authUser.sub);
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  user = evaluateDailyEligibility(user);
  res.json(sanitizeUser(user));
});

// Self-service password change — clears mustChangePassword, which is set on every new
// account and every Admin password reset to force this on next login.
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = getUser(req.authUser.sub);
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  if (!bcrypt.compareSync(currentPassword || '', user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  const updated = patchUser(user.id, { password: bcrypt.hashSync(newPassword, 10), mustChangePassword: false });
  res.json(sanitizeUser(updated));
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
      secondaryPhone: body.secondaryPhone || body.secondary_phone || '',
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
      taskDate: now,
      reTriggered: false,
      attempts: 0,
      activity: [{ ts: now, kind: 'note', text: `Lead captured via ${source}` }],
      testRide: null,
      sale: null,
      buyingFor: body.buyingFor || '',
      cyclistWeight: body.cyclistWeight || '',
      cyclistHeight: body.cyclistHeight || '',
      budget: body.budget || '',
      // Freeform bag for source-specific attributes (EBike model, budget, gclid, company, etc.)
      // that don't map to a first-class column. Shown read-only on the lead detail page.
      meta: body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta) ? body.meta : {},
    },
  };
}

// List all leads. Hierarchy-scoped: if the requester has hierarchyEnabled on (see Users),
// only leads owned by them or their reporting tree come back; everyone else still sees
// every lead, matching the app's behavior before hierarchy existed.
app.get('/api/leads', requireAuth, (req, res) => {
  const visible = getVisibleOwnerNames(req.authUser.sub);
  const leads = listLeads();
  res.json(visible ? leads.filter((l) => visible.has(l.owner)) : leads);
});

// Must come before /api/leads/:id — otherwise Express matches "export" as an :id and
// this route never gets hit.
app.get('/api/leads/export', requireAuth, requirePermission('exportData'), (req, res) => {
  const visible = getVisibleOwnerNames(req.authUser.sub);
  const leads = listLeads().filter((l) => !visible || visible.has(l.owner));
  const csv = toCsv(
    ['ID', 'Name', 'Phone', 'Secondary Phone', 'Email', 'City', 'Pin', 'Source', 'Campaign', 'Owner', 'Stage', 'Lead Score', 'Disposition', 'Sub-Disposition', 'Repeat', 'Created On', 'Task Date', 'Follow-up At'],
    leads.map((l) => [
      l.id, l.name || '', l.phone, l.secondaryPhone || '', l.email || '', l.city || '', l.pin || '',
      l.source || '', l.campaign || '', l.owner || '', l.stage, l.leadScore, l.disposition || '', l.subDisposition || '',
      l.reTriggered ? 'Yes' : 'No', new Date(l.createdOn).toISOString(),
      l.taskDate ? new Date(l.taskDate).toISOString() : '', l.followupAt ? new Date(l.followupAt).toISOString() : '',
    ]),
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="leads-export-${Date.now()}.csv"`);
  res.send(csv);
});

app.get('/api/leads/:id', requireAuth, (req, res) => {
  const lead = getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: 'not found' });
  res.json(lead);
});

// Manual lead creation from the app UI (Quick Add / Add Lead modals). Follows the exact
// same rules as the webhook: phone-based dedupe (a repeat entry merges into the existing
// lead rather than creating a second row), and round-robin / pool allocation rather than
// defaulting to whoever happened to add it — an agent typing in a phone-in lead shouldn't
// keep it for themselves any more than a website form submission would.
app.post('/api/leads', requireAuth, (req, res) => {
  const { lead, error } = normalizeIncomingLead(req.body || {});
  if (error) return res.status(400).json({ error });
  let { lead: result, isDuplicate } = upsertLead(lead);
  if (!isDuplicate && result.owner === 'Unassigned' && isWithinAllocationWindow()) {
    result = allocateLeadToNextUser(result.id) || result;
  }
  res.status(201).json(result);
});

// ---- bulk lead import from CSV ----
// Columns mirror the Leads grid's own fields. Phone is the only required column;
// everything else is optional. Reuses the exact column names from LEAD_IMPORT_HEADERS
// below (not the fuzzy alias-matching in normalizeIncomingLead) since we control the
// template ourselves via the sample-file download.

const LEAD_IMPORT_HEADERS = ['Name', 'Phone', 'Email', 'City', 'Pin', 'Source', 'Campaign', 'Owner'];

function leadRowFromCsv(row, ownerFallback) {
  const phone = (row['Phone'] || '').trim();
  if (!phone) return { error: 'missing phone number' };
  const source = row['Source']?.trim() || 'CSV Import';
  const now = Date.now();
  return {
    lead: {
      id: 'L' + nanoid(6).toUpperCase(),
      name: row['Name']?.trim() || null,
      phone,
      email: row['Email']?.trim() || '',
      city: row['City']?.trim() || '—',
      pin: row['Pin']?.trim() || '—',
      source,
      campaign: row['Campaign']?.trim() || '—',
      createdOn: now,
      owner: row['Owner']?.trim() || ownerFallback,
      stage: 1,
      leadScore: 0,
      followupAt: null,
      taskDate: now,
      reTriggered: false,
      attempts: 0,
      activity: [{ ts: now, kind: 'note', text: `Lead captured via ${source}` }],
      testRide: null,
      sale: null,
      meta: {},
    },
  };
}

// No auth required: it's a blank template with no real data, and a plain <a href download>
// link can't attach an Authorization header anyway.
app.get('/api/leads/import/sample', (_req, res) => {
  const csv = [
    LEAD_IMPORT_HEADERS.join(','),
    'Jane Doe,9876543210,jane@example.com,Pune,411001,Website,Monsoon Offer,',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="lead-import-sample.csv"');
  res.send(csv);
});

app.post('/api/leads/import', requireAuth, csvUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  let records;
  try {
    records = parseCsv(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
  } catch (err) {
    return res.status(400).json({ error: 'Could not parse CSV: ' + err.message });
  }
  const actor = getUser(req.authUser.sub);
  const errors = [];
  let created = 0;
  let merged = 0;
  records.forEach((row, i) => {
    const { lead, error } = leadRowFromCsv(row, actor?.name || 'Unassigned');
    if (error) {
      errors.push({ row: i + 2, reason: error }); // +2: 1-indexed, plus header row
      return;
    }
    const { isDuplicate } = upsertLead(lead);
    if (isDuplicate) merged++;
    else created++;
  });
  res.status(201).json({ created, merged, errors });
});

// Generic intake endpoint for external lead sources (ad platforms, website forms, CRMs).
// Point any POST webhook here; field names are normalized on a best-effort basis.
// Real-time round-robin allocation applies only to genuinely new leads that come in
// unassigned during the 11:00 AM - 7:00 PM IST window; outside that window they sit in
// the Lead Pool until the next allocation run (11:00 AM daily). A repeat submission for a
// phone number already on file merges into the existing lead instead of allocating again.
app.post('/api/leads/webhook', checkWebhookSecret, (req, res) => {
  const { lead, error } = normalizeIncomingLead(req.body || {});
  if (error) return res.status(400).json({ error });
  let { lead: result, isDuplicate } = upsertLead(lead);
  if (!isDuplicate && result.owner === 'Unassigned' && isWithinAllocationWindow()) {
    result = allocateLeadToNextUser(result.id) || result;
  }
  res.status(201).json(result);
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

// Manual reassignment — pulling a lead out of the pool onto a specific agent, moving it
// between agents, or sending it back to the pool ("Unassigned"). Separate from the generic
// PATCH above (which every agent needs for stage/disposition/sale updates on their own
// leads) so this one specific field-change can be gated behind its own permission.
app.patch('/api/leads/:id/reassign', requireAuth, requirePermission('reassignLeads'), (req, res) => {
  const lead = getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: 'not found' });
  const owner = (req.body?.owner || '').trim();
  if (!owner) return res.status(400).json({ error: 'owner is required (use "Unassigned" to send it back to the pool)' });
  if (owner !== 'Unassigned' && !getUserByName(owner)) return res.status(400).json({ error: `No user named "${owner}"` });
  const actor = getUser(req.authUser.sub);
  const updated = patchLead(lead.id, { owner }, {
    ts: Date.now(),
    kind: 'note',
    text: `Reassigned from ${lead.owner} to ${owner} by ${actor?.name || 'Unknown'}`,
  });
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

app.get('/api/integrations/telephony', requireAuth, requirePermission('manageIntegrations'), (_req, res) => {
  res.json(getSetting('telephony') || { provider: 'mock', sarv: {}, twilio: {}, exotel: {} });
});

app.put('/api/integrations/telephony', requireAuth, requirePermission('manageIntegrations'), (req, res) => {
  const { provider, sarv, twilio, exotel } = req.body || {};
  const saved = setSetting('telephony', {
    provider: provider || 'mock',
    sarv: sarv || {},
    twilio: twilio || {},
    exotel: exotel || {},
  });
  res.json(saved);
});

// Webhook secret shown/edited from the same Integrations page. Empty string clears it
// (leaves the webhook open), matching checkWebhookSecret's "unset = open" behavior.
app.get('/api/integrations/webhook', requireAuth, requirePermission('manageIntegrations'), (_req, res) => {
  res.json({ secret: getSetting('webhookSecret') || '' });
});

app.put('/api/integrations/webhook', requireAuth, requirePermission('manageIntegrations'), (req, res) => {
  const secret = (req.body?.secret || '').trim();
  setSetting('webhookSecret', secret || null);
  res.json({ secret });
});

// ---- dispositions / sub-dispositions ----
// Listing is open to any logged-in user (needed for the Log a Call form); editing the
// taxonomy is Admin-only. Stored as one JSON blob: [{ id, label, connected, subDispositions: [{id,label}] }]

app.get('/api/settings/dispositions', requireAuth, (_req, res) => {
  res.json(getSetting('dispositions') || []);
});

app.put('/api/settings/dispositions', requireAuth, requirePermission('manageDispositions'), (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'body must be an array of dispositions' });
  res.json(setSetting('dispositions', req.body));
});

// ---- dealers (test ride locations) ----
// Admin uploads a CSV (same columns as the franchise/dealer export) which fully replaces
// the dealer list. Everyone logged in can browse states/cities/dealers to book a test ride.

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

app.get('/api/dealers/count', requireAuth, requirePermission('manageDealers'), (_req, res) => {
  res.json({ count: countDealers() });
});

// No auth required, same reasoning as the lead-import sample: blank template, no real data,
// and a plain <a href download> link can't attach an Authorization header anyway.
app.get('/api/dealers/import/sample', (_req, res) => {
  const csv = [
    'Name,City,State,PIN Code,Address,Primary Contact Number,Status,Franchise Code',
    'EMotorad Experience Store,Pune,Maharashtra,411001,"123 FC Road, Pune",9876543210,Active,FC001',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="dealer-import-sample.csv"');
  res.send(csv);
});

app.post('/api/dealers/import', requireAuth, requirePermission('manageDealers'), csvUpload.single('file'), (req, res) => {
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

app.post('/api/inventory', requireAuth, requirePermission('manageInventory'), (req, res) => {
  const { modelRange, modelSku, modelColour } = req.body || {};
  if (!modelRange || !modelSku || !modelColour) return res.status(400).json({ error: 'modelRange, modelSku, and modelColour are required' });
  const item = insertInventoryItem({ id: 'I' + nanoid(8).toUpperCase(), modelRange, modelSku, modelColour, createdOn: Date.now() });
  res.status(201).json(item);
});

app.patch('/api/inventory/:id', requireAuth, requirePermission('manageInventory'), (req, res) => {
  const updated = patchInventoryItem(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

app.delete('/api/inventory/:id', requireAuth, requirePermission('manageInventory'), (req, res) => {
  if (!getInventoryItem(req.params.id)) return res.status(404).json({ error: 'not found' });
  deleteInventoryItem(req.params.id);
  res.json({ ok: true });
});

// ---- accessories ----

app.get('/api/accessories', requireAuth, (_req, res) => {
  res.json(listAccessories());
});

app.post('/api/accessories', requireAuth, requirePermission('manageAccessories'), (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  res.status(201).json(insertAccessory({ id: 'C' + nanoid(8).toUpperCase(), name, createdOn: Date.now() }));
});

app.delete('/api/accessories/:id', requireAuth, requirePermission('manageAccessories'), (req, res) => {
  deleteAccessory(req.params.id);
  res.json({ ok: true });
});

// ---- sales audit ----
// Admin reviews every lead with a recorded sale and marks it successful or rejected.

app.get('/api/sales', requireAuth, requirePermission('salesAudit'), (_req, res) => {
  const sales = listLeads()
    .filter((l) => l.sale)
    .map((l) => ({ leadId: l.id, leadName: l.name, leadPhone: l.phone, owner: l.owner, sale: l.sale }));
  res.json(sales);
});

app.get('/api/sales/export', requireAuth, requirePermission('exportData'), (_req, res) => {
  const sales = listLeads().filter((l) => l.sale);
  const csv = toCsv(
    ['Lead ID', 'Lead Name', 'Lead Phone', 'Owner', 'Model Range', 'Model SKU', 'Model Colour', 'Amount', 'Quantity', 'Sale Date', 'Sale Source', 'Source Name', 'Accessories', 'Invoice No', 'Audit Status', 'Audit Note'],
    sales.map((l) => [
      l.id, l.name || '', l.phone, l.owner || '', l.sale.modelRange, l.sale.modelSku, l.sale.modelColour,
      l.sale.amount, l.sale.quantity, l.sale.saleDate ? new Date(l.sale.saleDate).toISOString() : '',
      l.sale.saleSource, l.sale.sourceName || '', (l.sale.accessories || []).join('; '),
      l.sale.invoiceNo || '', l.sale.auditStatus, l.sale.auditNote || '',
    ]),
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="sales-export-${Date.now()}.csv"`);
  res.send(csv);
});

// Stage 7 = Sale Completed (No Docs) -> 9 = ...and Audited (No Docs); 8 = Sale Completed
// (With Docs) -> 10 = ...and Audited (With Docs). Only a successful audit advances the
// stage — a rejected one leaves it where it was, since the sale wasn't actually validated.
const AUDITED_STAGE_BY_SALE_STAGE = { 7: 9, 8: 10 };

app.patch('/api/leads/:id/sale-audit', requireAuth, requirePermission('salesAudit'), (req, res) => {
  const lead = getLead(req.params.id);
  if (!lead || !lead.sale) return res.status(404).json({ error: 'not found' });
  const { auditStatus, auditNote } = req.body || {};
  if (!['successful', 'rejected'].includes(auditStatus)) return res.status(400).json({ error: 'auditStatus must be "successful" or "rejected"' });
  const patch = { sale: { ...lead.sale, auditStatus, auditNote: auditNote || '' } };
  if (auditStatus === 'successful' && AUDITED_STAGE_BY_SALE_STAGE[lead.stage]) {
    patch.stage = AUDITED_STAGE_BY_SALE_STAGE[lead.stage];
  }
  const updated = patchLead(lead.id, patch, {
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

app.post('/api/users', requireAuth, requirePermission('manageUsers'), (req, res) => {
  const { name, email, phone, role, managerId, hierarchyEnabled, inPool } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const user = insertUser({
    id: 'U' + nanoid(6).toUpperCase(),
    name,
    email: email || '',
    phone: phone || '',
    role: role || 'Agent',
    password: bcrypt.hashSync(DEFAULT_PASSWORD, 10),
    createdOn: Date.now(),
    managerId: managerId || null,
    hierarchyEnabled: !!hierarchyEnabled,
    inPool: inPool === false ? 0 : 1,
  });
  logAudit(req, 'user.created', user, { email: user.email, role: user.role });
  res.status(201).json(sanitizeUser(user));
});

app.patch('/api/users/:id', requireAuth, requirePermission('manageUsers'), (req, res) => {
  const { password, active, tokenVersion, lastLoginDate, mustChangePassword, ...rest } = req.body || {};
  const before = getUser(req.params.id);
  const updated = patchUser(req.params.id, rest);
  if (!updated) return res.status(404).json({ error: 'not found' });
  const changed = {};
  for (const key of ['name', 'email', 'phone', 'role', 'managerId', 'hierarchyEnabled', 'inPool']) {
    if (key in rest && before[key] !== updated[key]) changed[key] = { from: before[key], to: updated[key] };
  }
  if (Object.keys(changed).length) logAudit(req, 'user.updated', updated, changed);
  res.json(sanitizeUser(updated));
});

app.post('/api/users/:id/reset-password', requireAuth, requirePermission('manageUsers'), (req, res) => {
  const target = getUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'not found' });
  const newPassword = req.body?.password || DEFAULT_PASSWORD;
  const updated = patchUser(req.params.id, { password: bcrypt.hashSync(newPassword, 10), mustChangePassword: true });
  logAudit(req, 'user.password_reset', target, {});
  res.json(sanitizeUser(updated));
});

// Lead allocation eligibility. Auto-set at login (see /api/auth/login); Admin/Manager
// can override manually at any time, per the lead allocation spec.
app.patch('/api/users/:id/active', requireAuth, requirePermission('toggleUserActive'), (req, res) => {
  const target = getUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'not found' });
  const active = !!req.body?.active;
  const updated = patchUser(req.params.id, { active });
  logAudit(req, 'user.active_toggled', target, { active });
  res.json(sanitizeUser(updated));
});

app.delete('/api/users/:id', requireAuth, requirePermission('manageUsers'), (req, res) => {
  const target = getUser(req.params.id);
  if (!target) return res.status(404).json({ error: 'not found' });
  deleteUser(req.params.id);
  logAudit(req, 'user.deleted', target, {});
  res.json({ ok: true });
});

// ---- audit log ----

app.get('/api/audit-log', requireAuth, requirePermission('viewAuditLog'), (_req, res) => {
  res.json(listAuditLog());
});

// ---- permissions (role x permission matrix) ----

// Any logged-in user can read the matrix — the frontend uses it to decide what to show
// (e.g. an Export button). Only editing it is gated (see PUT below).
app.get('/api/settings/permissions', requireAuth, (_req, res) => {
  res.json({ permissions: getSetting('rolePermissions') || DEFAULT_ROLE_PERMISSIONS, keys: PERMISSION_KEYS });
});

app.put('/api/settings/permissions', requireAuth, requirePermission('managePermissions'), (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'body must be a { role: { permissionKey: boolean } } object' });
  }
  res.json(setSetting('rolePermissions', req.body));
});

// ---- lead allocation ----

app.get('/api/allocation/status', requireAuth, requirePermission('toggleUserActive'), (_req, res) => {
  const { hour } = istParts();
  res.json({
    poolCount: listLeads().filter((l) => l.owner === 'Unassigned').length,
    activeUserCount: listUsers().filter((u) => u.active).length,
    withinAllocationWindow: isWithinAllocationWindow(),
    istHour: hour,
  });
});

// Manual override: force-run the pool allocation right now (normally happens automatically
// at 11:00 AM IST). Admin-only since it affects every unassigned lead at once.
app.post('/api/allocation/run-pool', requireAuth, requirePermission('runAllocationOverride'), (req, res) => {
  const count = allocatePoolLeads();
  logAudit(req, 'allocation.pool_run_manual', null, { count });
  res.json({ count });
});

startAllocationScheduler();
startBackupScheduler();

app.listen(PORT, () => {
  console.log(`Lead API listening on http://localhost:${PORT}`);
});
