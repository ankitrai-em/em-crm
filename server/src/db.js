import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

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

function rowToLead(row) {
  if (!row) return null;
  return {
    ...row,
    reTriggered: !!row.reTriggered,
    activity: JSON.parse(row.activity || '[]'),
    testRide: row.testRide ? JSON.parse(row.testRide) : null,
    sale: row.sale ? JSON.parse(row.sale) : null,
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
    INSERT INTO leads (id, name, phone, email, city, pin, source, campaign, createdOn, owner, stage, leadScore, followupAt, taskDate, reTriggered, attempts, activity, testRide, sale)
    VALUES (@id, @name, @phone, @email, @city, @pin, @source, @campaign, @createdOn, @owner, @stage, @leadScore, @followupAt, @taskDate, @reTriggered, @attempts, @activity, @testRide, @sale)
  `).run({
    ...lead,
    reTriggered: lead.reTriggered ? 1 : 0,
    activity: JSON.stringify(lead.activity || []),
    testRide: lead.testRide ? JSON.stringify(lead.testRide) : null,
    sale: lead.sale ? JSON.stringify(lead.sale) : null,
  });
  return getLead(lead.id);
}

const PATCHABLE = ['name', 'phone', 'email', 'city', 'pin', 'source', 'campaign', 'owner', 'stage', 'leadScore', 'followupAt', 'taskDate', 'reTriggered', 'attempts', 'testRide', 'sale'];

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
      params[key] = value ?? null;
    }
  }
  sets.push('activity = @activity');
  params.activity = JSON.stringify(activity);

  db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return getLead(id);
}
