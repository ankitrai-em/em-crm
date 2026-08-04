// Unit tests for hierarchy-based lead visibility (the logic behind the IDOR fix on
// GET/PATCH /api/leads/:id — index.js's requireLeadVisible just wraps this).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '.tmp-db-test.sqlite');
for (const suffix of ['', '-shm', '-wal']) {
  if (fs.existsSync(DB_PATH + suffix)) fs.unlinkSync(DB_PATH + suffix);
}
process.env.DB_PATH = DB_PATH;

const db = await import('../src/db.js');

after(() => {
  for (const suffix of ['', '-shm', '-wal']) {
    if (fs.existsSync(DB_PATH + suffix)) fs.unlinkSync(DB_PATH + suffix);
  }
});

function makeUser(overrides) {
  return db.insertUser({ email: '', phone: '', password: 'x', createdOn: Date.now(), role: 'Agent', ...overrides });
}

test('getVisibleOwnerNames: hierarchyEnabled off returns null (no filter, sees everything)', () => {
  const u = makeUser({ id: 'HU1', name: 'No Hierarchy User', hierarchyEnabled: false });
  assert.equal(db.getVisibleOwnerNames(u.id), null);
});

test('getVisibleOwnerNames: hierarchyEnabled on with no reports sees only their own name', () => {
  const u = makeUser({ id: 'HU2', name: 'Solo Agent', hierarchyEnabled: true });
  const visible = db.getVisibleOwnerNames(u.id);
  assert.deepEqual([...visible], ['Solo Agent']);
});

test('getVisibleOwnerNames: a manager sees themself plus direct reports', () => {
  const mgr = makeUser({ id: 'HU3', name: 'Direct Manager', role: 'Manager', hierarchyEnabled: true });
  makeUser({ id: 'HU4', name: 'Report A', managerId: mgr.id });
  makeUser({ id: 'HU5', name: 'Report B', managerId: mgr.id });
  makeUser({ id: 'HU6', name: 'Unrelated Agent' }); // no managerId set
  const visible = db.getVisibleOwnerNames(mgr.id);
  assert.deepEqual([...visible].sort(), ['Direct Manager', 'Report A', 'Report B']);
});

test('getVisibleOwnerNames: a manager-of-managers sees the whole tree, not just direct reports', () => {
  const topMgr = makeUser({ id: 'HU7', name: 'Top Manager', role: 'Manager', hierarchyEnabled: true });
  const midMgr = makeUser({ id: 'HU8', name: 'Mid Manager', role: 'Manager', managerId: topMgr.id });
  makeUser({ id: 'HU9', name: 'Bottom Agent', managerId: midMgr.id });
  const visible = db.getVisibleOwnerNames(topMgr.id);
  assert.deepEqual([...visible].sort(), ['Bottom Agent', 'Mid Manager', 'Top Manager']);
});

test('getVisibleOwnerNames: a cycle in managerId chains does not infinite-loop', () => {
  const a = makeUser({ id: 'HUA', name: 'Cycle A', role: 'Manager', hierarchyEnabled: true });
  const b = makeUser({ id: 'HUB', name: 'Cycle B', role: 'Manager', managerId: a.id });
  db.patchUser(a.id, { managerId: b.id }); // A reports to B, B reports to A
  const visible = db.getVisibleOwnerNames(a.id);
  assert.deepEqual([...visible].sort(), ['Cycle A', 'Cycle B']);
});

test('upsert-by-phone dedupe: findLeadByPhone finds an existing lead by exact phone match', () => {
  const now = Date.now();
  db.insertLead({
    id: 'DEDUPE1', name: 'First Submit', phone: '9998887770', email: '', city: '—', pin: '—',
    source: 'Website', campaign: '—', createdOn: now, owner: 'Unassigned', stage: 1, leadScore: 0,
    followupAt: null, taskDate: now, reTriggered: false, attempts: 0, activity: [], testRide: null, sale: null, meta: {},
  });
  const found = db.findLeadByPhone('9998887770');
  assert.equal(found.name, 'First Submit');
  assert.equal(db.findLeadByPhone('0000000000'), null);
});
