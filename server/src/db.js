import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeLeadScore } from './scoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');

export const DEFAULT_PASSWORD = '12345678';

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'Agent',
    password TEXT NOT NULL,
    createdOn INTEGER NOT NULL
  );
`);

const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('password')) {
  db.exec("ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT ''");
  const defaultHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  db.prepare("UPDATE users SET password = ? WHERE password = ''").run(defaultHash);
}
if (!userColumns.includes('active')) {
  db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 0');
}
if (!userColumns.includes('tokenVersion')) {
  db.exec('ALTER TABLE users ADD COLUMN tokenVersion INTEGER NOT NULL DEFAULT 0');
}
if (!userColumns.includes('lastLoginDate')) {
  db.exec("ALTER TABLE users ADD COLUMN lastLoginDate TEXT NOT NULL DEFAULT ''");
}
if (!userColumns.includes('managerId')) {
  db.exec('ALTER TABLE users ADD COLUMN managerId TEXT');
}
if (!userColumns.includes('hierarchyEnabled')) {
  db.exec('ALTER TABLE users ADD COLUMN hierarchyEnabled INTEGER NOT NULL DEFAULT 0');
}
if (!userColumns.includes('inPool')) {
  // Whether this user can receive round-robin leads at all. Defaults to 1 (true) so
  // existing installs keep their current allocation behavior for everyone.
  db.exec('ALTER TABLE users ADD COLUMN inPool INTEGER NOT NULL DEFAULT 1');
}
if (!userColumns.includes('mustChangePassword')) {
  // Only forced going forward (new users, password resets) — defaults to 0 so existing
  // accounts aren't suddenly locked out of the app they're already using.
  db.exec('ALTER TABLE users ADD COLUMN mustChangePassword INTEGER NOT NULL DEFAULT 0');
}

const DEFAULT_AGENTS = ['Aditya Narayan', 'Shreya Raj', 'Preeti Vankhede', 'Deep Malakar', 'Dip Roy', 'Shweta Madel', 'Yash Pawar'];
if (db.prepare('SELECT COUNT(*) as n FROM users').get().n === 0) {
  const insert = db.prepare('INSERT INTO users (id, name, email, phone, role, password, createdOn) VALUES (@id, @name, @email, @phone, @role, @password, @createdOn)');
  const defaultHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  DEFAULT_AGENTS.forEach((name, i) => {
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@emotorad.com`;
    insert.run({
      id: 'U' + String(i + 1).padStart(4, '0'),
      name,
      email,
      phone: '',
      role: name === 'Aditya Narayan' ? 'Admin' : 'Agent',
      password: defaultHash,
      createdOn: Date.now(),
    });
  });
}

// Backfills email on databases created before login existed (seed users originally had
// email: ''), since the fresh-DB seeding above only runs when the users table is empty.
const backfillEmail = db.prepare("UPDATE users SET email = ? WHERE id = ? AND (email IS NULL OR email = '')");
DEFAULT_AGENTS.forEach((name, i) => {
  backfillEmail.run(`${name.toLowerCase().replace(/\s+/g, '.')}@emotorad.com`, 'U' + String(i + 1).padStart(4, '0'));
});

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    city TEXT,
    pin TEXT,
    source TEXT,
    campaign TEXT,
    createdOn INTEGER NOT NULL,
    owner TEXT,
    stage INTEGER NOT NULL DEFAULT 1,
    leadScore INTEGER NOT NULL DEFAULT 0,
    followupAt INTEGER,
    taskDate INTEGER,
    reTriggered INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    activity TEXT NOT NULL DEFAULT '[]',
    testRide TEXT,
    sale TEXT
  );
`);

const leadColumns = db.prepare('PRAGMA table_info(leads)').all().map((c) => c.name);
if (!leadColumns.includes('meta')) {
  db.exec("ALTER TABLE leads ADD COLUMN meta TEXT NOT NULL DEFAULT '{}'");
}
if (!leadColumns.includes('disposition')) {
  db.exec("ALTER TABLE leads ADD COLUMN disposition TEXT NOT NULL DEFAULT ''");
  db.exec("ALTER TABLE leads ADD COLUMN subDisposition TEXT NOT NULL DEFAULT ''");
}
if (!leadColumns.includes('secondaryPhone')) {
  db.exec("ALTER TABLE leads ADD COLUMN secondaryPhone TEXT NOT NULL DEFAULT ''");
}
if (!leadColumns.includes('buyingFor')) {
  // Customer profile: who the bike is for, and rider fit/budget info to help pitch the right model.
  db.exec("ALTER TABLE leads ADD COLUMN buyingFor TEXT NOT NULL DEFAULT ''");
  db.exec("ALTER TABLE leads ADD COLUMN cyclistWeight TEXT NOT NULL DEFAULT ''");
  db.exec("ALTER TABLE leads ADD COLUMN cyclistHeight TEXT NOT NULL DEFAULT ''");
  db.exec("ALTER TABLE leads ADD COLUMN budget TEXT NOT NULL DEFAULT ''");
}

// Seeds 100 random demo leads on a genuinely fresh database only (same one-time-only
// guard pattern as the seed agents above) — never touches an install that already has
// real lead data.
const SEED_FIRST_NAMES = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rohan', 'Neha', 'Karan', 'Divya', 'Arjun', 'Pooja', 'Sanjay', 'Kavita', 'Manoj', 'Ritu', 'Ajay', 'Swati', 'Nikhil', 'Meera'];
const SEED_LAST_NAMES = ['Sharma', 'Verma', 'Gupta', 'Iyer', 'Reddy', 'Nair', 'Joshi', 'Mehta', 'Kapoor', 'Bose', 'Chatterjee', 'Rao', 'Desai', 'Patil', 'Singh'];
const SEED_CITIES = [
  ['Pune', '411001'], ['Mumbai', '400001'], ['Bengaluru', '560001'], ['Hyderabad', '500001'],
  ['Chennai', '600001'], ['Delhi', '110001'], ['Ahmedabad', '380001'], ['Jaipur', '302001'],
  ['Nagpur', '440001'], ['Noida', '201301'], ['Ludhiana', '141001'], ['Ernakulam', '682001'],
];
const SEED_SOURCES = ['Website', 'Facebook Ads', 'Instagram Ads', 'WhatsApp', 'Test Ride Page', 'Inbound Call', 'Referral'];
const SEED_CAMPAIGNS = ['Monsoon Offer', 'Diwali Sale', 'Buy Now Page', 'Republic Day Offer', 'Summer Launch', '—'];

if (db.prepare('SELECT COUNT(*) as n FROM leads').get().n === 0) {
  const seedNow = Date.now();
  for (let i = 0; i < 100; i++) {
    const first = SEED_FIRST_NAMES[i % SEED_FIRST_NAMES.length];
    const last = SEED_LAST_NAMES[(i + Math.floor(i / SEED_FIRST_NAMES.length)) % SEED_LAST_NAMES.length];
    const [city, pin] = SEED_CITIES[i % SEED_CITIES.length];
    const source = SEED_SOURCES[i % SEED_SOURCES.length];
    const campaign = SEED_CAMPAIGNS[i % SEED_CAMPAIGNS.length];
    const owner = DEFAULT_AGENTS[i % DEFAULT_AGENTS.length];
    const createdOn = seedNow - i * 60000; // spread creation times out by a minute each
    insertLead({
      id: 'LSEED' + String(i + 1).padStart(4, '0'),
      name: `${first} ${last}`,
      phone: '70' + String(10000000 + i * 41).padStart(8, '0'),
      secondaryPhone: '',
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      city, pin, source, campaign,
      createdOn,
      owner,
      stage: 1,
      leadScore: 0,
      followupAt: null,
      taskDate: createdOn,
      reTriggered: false,
      attempts: 0,
      activity: [{ ts: createdOn, kind: 'note', text: `Lead captured via ${source}` }],
      testRide: null,
      sale: null,
      meta: {},
      disposition: '',
      subDisposition: '',
      buyingFor: '',
      cyclistWeight: '',
      cyclistHeight: '',
      budget: '',
    });
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    actorId TEXT,
    actorName TEXT,
    action TEXT NOT NULL,
    targetId TEXT,
    targetName TEXT,
    details TEXT NOT NULL DEFAULT '{}'
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS dealers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    pin TEXT,
    address TEXT,
    phone TEXT,
    status TEXT,
    franchiseCode TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    modelRange TEXT NOT NULL,
    modelSku TEXT NOT NULL,
    modelColour TEXT NOT NULL,
    createdOn INTEGER NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS accessories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdOn INTEGER NOT NULL
  );
`);

const DEFAULT_DISPOSITIONS = [
  {
    id: 'not_connected', label: 'Not Connected', connected: false,
    subDispositions: [
      { id: 'switched_off', label: 'Switched Off' },
      { id: 'busy', label: 'Busy' },
      { id: 'ringing_no_response', label: 'Ringing - No Response' },
      { id: 'wrong_number', label: 'Wrong Number' },
    ],
  },
  {
    id: 'connected', label: 'Connected', connected: true,
    subDispositions: [
      { id: 'interested', label: 'Interested' },
      { id: 'callback', label: 'Call Back Later' },
      { id: 'not_interested', label: 'Not Interested' },
    ],
  },
];
if (getSetting('dispositions') === null) {
  setSetting('dispositions', DEFAULT_DISPOSITIONS);
}

// Role x permission matrix. Admin implicitly has every permission regardless of what's
// stored here (enforced in index.js) so Admin can never lock itself out by misconfiguring
// this. Defaults below mirror the hardcoded Admin/Admin-or-Manager gates the app already
// had before this became configurable, so behavior doesn't change until someone edits it.
export const PERMISSION_KEYS = [
  { key: 'manageUsers', label: 'Manage users (add/edit/remove, reset passwords)' },
  { key: 'manageIntegrations', label: 'Manage API integrations (telephony, webhook secret)' },
  { key: 'manageDispositions', label: 'Manage disposition taxonomy' },
  { key: 'manageDealers', label: 'Manage dealer list (test ride locations)' },
  { key: 'manageInventory', label: 'Manage inventory' },
  { key: 'manageAccessories', label: 'Manage accessories' },
  { key: 'viewAuditLog', label: 'View audit log' },
  { key: 'salesAudit', label: 'View & audit sales' },
  { key: 'toggleUserActive', label: 'Toggle user Active/Inactive & view allocation status' },
  { key: 'runAllocationOverride', label: 'Manually run pool allocation' },
  { key: 'exportData', label: 'Export leads/sales to CSV' },
  { key: 'managePermissions', label: 'Edit this permissions matrix' },
  { key: 'reassignLeads', label: 'Reassign a lead’s owner (including pulling it back into the pool)' },
];
export const DEFAULT_ROLE_PERMISSIONS = {
  Admin: Object.fromEntries(PERMISSION_KEYS.map((p) => [p.key, true])),
  Manager: { toggleUserActive: true, exportData: true, reassignLeads: true },
  Agent: {},
};
if (getSetting('rolePermissions') === null) {
  setSetting('rolePermissions', DEFAULT_ROLE_PERMISSIONS);
} else {
  // Backfill any permission key added in a later release onto an existing (pre-upgrade)
  // settings blob, without touching anything an Admin already explicitly configured.
  const existingPerms = getSetting('rolePermissions');
  let changed = false;
  for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS)) {
    if (!existingPerms[role]) {
      existingPerms[role] = {};
      changed = true;
    }
    for (const { key } of PERMISSION_KEYS) {
      if (!(key in existingPerms[role])) {
        existingPerms[role][key] = !!DEFAULT_ROLE_PERMISSIONS[role][key];
        changed = true;
      }
    }
  }
  if (changed) setSetting('rolePermissions', existingPerms);
}

export function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
}

export function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run({ key, value: JSON.stringify(value) });
  return getSetting(key);
}

export function listUsers() {
  return db.prepare('SELECT * FROM users ORDER BY createdOn ASC').all();
}

export function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

export function getUserByName(name) {
  if (!name) return null;
  return db.prepare('SELECT * FROM users WHERE name = ?').get(name) || null;
}

export function getUserByEmail(email) {
  if (!email) return null;
  return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) || null;
}

export function insertUser(user) {
  db.prepare(`
    INSERT INTO users (id, name, email, phone, role, password, createdOn, managerId, mustChangePassword)
    VALUES (@id, @name, @email, @phone, @role, @password, @createdOn, @managerId, @mustChangePassword)
  `).run({ managerId: null, mustChangePassword: 1, ...user });
  return getUser(user.id);
}

const USER_PATCHABLE = [
  'name', 'email', 'phone', 'role', 'password', 'active', 'tokenVersion', 'lastLoginDate',
  'managerId', 'hierarchyEnabled', 'inPool', 'mustChangePassword',
];
const USER_BOOLEAN_FIELDS = ['active', 'hierarchyEnabled', 'inPool', 'mustChangePassword'];

export function patchUser(id, patch) {
  const existing = getUser(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  const sets = [];
  const params = { id };
  for (const key of USER_PATCHABLE) {
    if (key in merged) {
      sets.push(`${key} = @${key}`);
      let value = merged[key];
      if (USER_BOOLEAN_FIELDS.includes(key)) value = value ? 1 : 0;
      params[key] = value ?? null;
    }
  }
  if (sets.length) db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return getUser(id);
}

export function deleteUser(id) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

// ---- lead allocation (round robin) ----

// Eligible users, in a stable order so the round-robin sequence is deterministic.
// inPool=0 opts a user out of round-robin entirely (e.g. Managers), regardless of Active status.
export function listActiveUsers() {
  return db.prepare('SELECT * FROM users WHERE active = 1 AND inPool = 1 ORDER BY createdOn ASC, id ASC').all();
}

// Hierarchy-based lead visibility: if the requesting user has hierarchyEnabled off, there's
// no restriction (every logged-in user currently sees every lead — kept as the default so
// nothing changes for accounts that don't opt into hierarchy). If it's on, they can only see
// their own leads plus leads owned by anyone in their reporting tree (direct + indirect
// reports, walked via managerId), so a manager-of-managers sees their whole org, not just
// their immediate team.
export function getVisibleOwnerNames(userId) {
  const user = getUser(userId);
  if (!user || !user.hierarchyEnabled) return null;

  const allUsers = listUsers();
  const reportsByManager = new Map();
  for (const u of allUsers) {
    if (!u.managerId) continue;
    if (!reportsByManager.has(u.managerId)) reportsByManager.set(u.managerId, []);
    reportsByManager.get(u.managerId).push(u);
  }

  const names = new Set([user.name]);
  const visited = new Set();
  const queue = [user.id];
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    for (const report of reportsByManager.get(id) || []) {
      if (!visited.has(report.id)) {
        names.add(report.name);
        queue.push(report.id);
      }
    }
  }
  return names;
}

export function bumpAllTokenVersions() {
  db.prepare('UPDATE users SET tokenVersion = tokenVersion + 1').run();
}

export function resetAllActive() {
  db.prepare('UPDATE users SET active = 0').run();
}

export function listUnallocatedLeadIds() {
  return db.prepare("SELECT id, createdOn FROM leads WHERE owner = 'Unassigned' ORDER BY createdOn ASC").all();
}

function rowToLead(row) {
  if (!row) return null;
  return {
    ...row,
    reTriggered: !!row.reTriggered,
    activity: JSON.parse(row.activity || '[]'),
    testRide: row.testRide ? JSON.parse(row.testRide) : null,
    sale: row.sale ? JSON.parse(row.sale) : null,
    meta: row.meta ? JSON.parse(row.meta) : {},
  };
}

export function listLeads() {
  const rows = db.prepare('SELECT * FROM leads ORDER BY createdOn DESC').all();
  return rows.map(rowToLead);
}

export function getLead(id) {
  return rowToLead(db.prepare('SELECT * FROM leads WHERE id = ?').get(id));
}

// First non-empty-phone match, so repeat submissions of the same number can be merged
// into the existing lead instead of creating a duplicate row.
export function findLeadByPhone(phone) {
  if (!phone) return null;
  return rowToLead(db.prepare('SELECT * FROM leads WHERE phone = ? ORDER BY createdOn ASC LIMIT 1').get(phone));
}

export function insertLead(lead) {
  const leadScore = computeLeadScore(lead);
  db.prepare(`
    INSERT INTO leads (id, name, phone, email, city, pin, source, campaign, createdOn, owner, stage, leadScore, followupAt, taskDate, reTriggered, attempts, activity, testRide, sale, meta, disposition, subDisposition, secondaryPhone, buyingFor, cyclistWeight, cyclistHeight, budget)
    VALUES (@id, @name, @phone, @email, @city, @pin, @source, @campaign, @createdOn, @owner, @stage, @leadScore, @followupAt, @taskDate, @reTriggered, @attempts, @activity, @testRide, @sale, @meta, @disposition, @subDisposition, @secondaryPhone, @buyingFor, @cyclistWeight, @cyclistHeight, @budget)
  `).run({
    ...lead,
    leadScore,
    reTriggered: lead.reTriggered ? 1 : 0,
    activity: JSON.stringify(lead.activity || []),
    testRide: lead.testRide ? JSON.stringify(lead.testRide) : null,
    sale: lead.sale ? JSON.stringify(lead.sale) : null,
    meta: JSON.stringify(lead.meta || {}),
    disposition: lead.disposition || '',
    subDisposition: lead.subDisposition || '',
    secondaryPhone: lead.secondaryPhone || '',
    buyingFor: lead.buyingFor || '',
    cyclistWeight: lead.cyclistWeight || '',
    cyclistHeight: lead.cyclistHeight || '',
    budget: lead.budget || '',
  });
  return getLead(lead.id);
}

const PATCHABLE = [
  'name', 'phone', 'email', 'city', 'pin', 'source', 'campaign', 'owner', 'stage', 'leadScore',
  'followupAt', 'taskDate', 'reTriggered', 'attempts', 'testRide', 'sale', 'meta', 'disposition', 'subDisposition',
  'secondaryPhone', 'buyingFor', 'cyclistWeight', 'cyclistHeight', 'budget',
];

export function patchLead(id, patch, newActivityEntry) {
  const existing = getLead(id);
  if (!existing) return null;

  // Recompute automatically so the score always reflects the lead's current state
  // (source/campaign don't usually change, but disposition, test ride, sale, and
  // repeat-contact status do, and those all feed into it too).
  const merged = { ...existing, ...patch, leadScore: computeLeadScore({ ...existing, ...patch }) };
  const activity = newActivityEntry ? [newActivityEntry, ...existing.activity] : existing.activity;

  const sets = [];
  const params = { id };
  for (const key of PATCHABLE) {
    if (key in merged) {
      sets.push(`${key} = @${key}`);
      let value = merged[key];
      if (key === 'reTriggered') value = value ? 1 : 0;
      if ((key === 'testRide' || key === 'sale') && value != null) value = JSON.stringify(value);
      if (key === 'meta') value = JSON.stringify(value || {});
      params[key] = value ?? null;
    }
  }
  sets.push('activity = @activity');
  params.activity = JSON.stringify(activity);

  db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return getLead(id);
}

// ---- audit log ----

export function insertAuditLog(entry) {
  db.prepare(`
    INSERT INTO audit_log (id, ts, actorId, actorName, action, targetId, targetName, details)
    VALUES (@id, @ts, @actorId, @actorName, @action, @targetId, @targetName, @details)
  `).run({ ...entry, details: JSON.stringify(entry.details || {}) });
}

export function listAuditLog() {
  return db.prepare('SELECT * FROM audit_log ORDER BY ts DESC').all().map((row) => ({ ...row, details: JSON.parse(row.details || '{}') }));
}

// ---- dealers (test ride locations, synced from an admin-uploaded CSV) ----

export function listDealerStates() {
  return db.prepare("SELECT DISTINCT state FROM dealers WHERE status = 'Active' AND state IS NOT NULL AND state != '' ORDER BY state ASC").all().map((r) => r.state);
}

export function listDealerCities(state) {
  return db.prepare("SELECT DISTINCT city FROM dealers WHERE status = 'Active' AND state = ? AND city IS NOT NULL AND city != '' ORDER BY city ASC").all(state).map((r) => r.city);
}

export function listDealers(state, city) {
  return db.prepare("SELECT * FROM dealers WHERE status = 'Active' AND state = ? AND city = ? ORDER BY name ASC").all(state, city);
}

export function countDealers() {
  return db.prepare('SELECT COUNT(*) as n FROM dealers').get().n;
}

export function replaceDealers(rows) {
  const insert = db.prepare(`
    INSERT INTO dealers (id, name, city, state, pin, address, phone, status, franchiseCode)
    VALUES (@id, @name, @city, @state, @pin, @address, @phone, @status, @franchiseCode)
  `);
  const tx = db.transaction((rows) => {
    db.prepare('DELETE FROM dealers').run();
    for (const row of rows) insert.run(row);
  });
  tx(rows);
  return countDealers();
}

// ---- inventory ----

export function listInventory() {
  return db.prepare('SELECT * FROM inventory ORDER BY modelRange ASC, modelSku ASC, modelColour ASC').all();
}

export function getInventoryItem(id) {
  return db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) || null;
}

export function insertInventoryItem(item) {
  db.prepare('INSERT INTO inventory (id, modelRange, modelSku, modelColour, createdOn) VALUES (@id, @modelRange, @modelSku, @modelColour, @createdOn)').run(item);
  return getInventoryItem(item.id);
}

export function patchInventoryItem(id, patch) {
  const existing = getInventoryItem(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  db.prepare('UPDATE inventory SET modelRange = @modelRange, modelSku = @modelSku, modelColour = @modelColour WHERE id = @id').run({ id, modelRange: merged.modelRange, modelSku: merged.modelSku, modelColour: merged.modelColour });
  return getInventoryItem(id);
}

export function deleteInventoryItem(id) {
  db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
}

// ---- accessories ----

export function listAccessories() {
  return db.prepare('SELECT * FROM accessories ORDER BY name ASC').all();
}

export function insertAccessory(item) {
  db.prepare('INSERT INTO accessories (id, name, createdOn) VALUES (@id, @name, @createdOn)').run(item);
  return db.prepare('SELECT * FROM accessories WHERE id = ?').get(item.id);
}

export function deleteAccessory(id) {
  db.prepare('DELETE FROM accessories WHERE id = ?').run(id);
}
