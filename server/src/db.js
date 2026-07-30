import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    INSERT INTO users (id, name, email, phone, role, password, createdOn)
    VALUES (@id, @name, @email, @phone, @role, @password, @createdOn)
  `).run(user);
  return getUser(user.id);
}

const USER_PATCHABLE = ['name', 'email', 'phone', 'role', 'password'];

export function patchUser(id, patch) {
  const existing = getUser(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  const sets = [];
  const params = { id };
  for (const key of USER_PATCHABLE) {
    if (key in merged) {
      sets.push(`${key} = @${key}`);
      params[key] = merged[key] ?? null;
    }
  }
  if (sets.length) db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return getUser(id);
}

export function deleteUser(id) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
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

export function insertLead(lead) {
  db.prepare(`
    INSERT INTO leads (id, name, phone, email, city, pin, source, campaign, createdOn, owner, stage, leadScore, followupAt, taskDate, reTriggered, attempts, activity, testRide, sale, meta, disposition, subDisposition)
    VALUES (@id, @name, @phone, @email, @city, @pin, @source, @campaign, @createdOn, @owner, @stage, @leadScore, @followupAt, @taskDate, @reTriggered, @attempts, @activity, @testRide, @sale, @meta, @disposition, @subDisposition)
  `).run({
    ...lead,
    reTriggered: lead.reTriggered ? 1 : 0,
    activity: JSON.stringify(lead.activity || []),
    testRide: lead.testRide ? JSON.stringify(lead.testRide) : null,
    sale: lead.sale ? JSON.stringify(lead.sale) : null,
    meta: JSON.stringify(lead.meta || {}),
    disposition: lead.disposition || '',
    subDisposition: lead.subDisposition || '',
  });
  return getLead(lead.id);
}

const PATCHABLE = ['name', 'phone', 'email', 'city', 'pin', 'source', 'campaign', 'owner', 'stage', 'leadScore', 'followupAt', 'taskDate', 'reTriggered', 'attempts', 'testRide', 'sale', 'meta', 'disposition', 'subDisposition'];

export function patchLead(id, patch, newActivityEntry) {
  const existing = getLead(id);
  if (!existing) return null;

  const merged = { ...existing, ...patch };
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
