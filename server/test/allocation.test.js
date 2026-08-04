// Unit tests for the round-robin allocation engine: time-window boundaries, round-robin
// fairness/persistence, and the missed-night catch-up reset. Uses a throwaway DB file per
// test file (set before importing db.js, since db.js opens the database as a module-level
// side effect) so this never touches a real database.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '.tmp-allocation-test.sqlite');
for (const suffix of ['', '-shm', '-wal']) {
  if (fs.existsSync(DB_PATH + suffix)) fs.unlinkSync(DB_PATH + suffix);
}
process.env.DB_PATH = DB_PATH;

const db = await import('../src/db.js');
const alloc = await import('../src/allocation.js');

// insertUser deliberately doesn't accept `active`/`tokenVersion` (a brand new user always
// starts Inactive with tokenVersion 0 in the real app) — patch them in afterward for tests
// that need to seed a specific state.
function createTestUser({ active, tokenVersion, ...rest }) {
  const created = db.insertUser({ email: '', phone: '', password: 'x', createdOn: Date.now(), ...rest });
  if (active !== undefined || tokenVersion !== undefined) {
    const patch = {};
    if (active !== undefined) patch.active = active;
    if (tokenVersion !== undefined) patch.tokenVersion = tokenVersion;
    return db.patchUser(created.id, patch);
  }
  return created;
}

after(() => {
  for (const suffix of ['', '-shm', '-wal']) {
    if (fs.existsSync(DB_PATH + suffix)) fs.unlinkSync(DB_PATH + suffix);
  }
});

test('istParts: 10:59 IST is before the window, 11:00 is the start, 18:59 is inside, 19:00 is outside', () => {
  // 2026-08-04 is a fixed date; IST is UTC+5:30 with no DST, so these UTC instants map to
  // exact IST clock times regardless of when/where this test runs.
  const mkIST = (h, m) => Date.UTC(2026, 7, 4, h - 5, m - 30); // subtract the +5:30 offset
  assert.equal(alloc.istParts(mkIST(10, 59)).hour, 10);
  assert.equal(alloc.isWithinAllocationWindow(mkIST(10, 59)), false);
  assert.equal(alloc.isWithinAllocationWindow(mkIST(11, 0)), true);
  assert.equal(alloc.isWithinAllocationWindow(mkIST(18, 59)), true);
  assert.equal(alloc.isWithinAllocationWindow(mkIST(19, 0)), false);
  assert.equal(alloc.isBeforeWindowStart(mkIST(10, 59)), true);
  assert.equal(alloc.isBeforeWindowStart(mkIST(11, 0)), false);
});

test('round-robin: cycles through all active/inPool users evenly and persists the cursor', () => {
  const ids = [];
  for (let i = 0; i < 4; i++) {
    const u = createTestUser({ id: 'RRU' + i, name: 'RR User ' + i, role: 'Agent', createdOn: Date.now() + i, active: true, inPool: true });
    ids.push(u.id);
  }
  const picks = [];
  for (let i = 0; i < 8; i++) picks.push(alloc.pickNextEligibleUser().id);
  // 4 users, 8 picks -> each picked exactly twice, and the sequence should be a clean
  // round-robin (no user picked twice in a row, full cycle repeats).
  const counts = {};
  for (const id of picks) counts[id] = (counts[id] || 0) + 1;
  for (const id of ids) assert.equal(counts[id], 2, `${id} should be picked exactly twice`);
  assert.deepEqual(picks.slice(0, 4), picks.slice(4, 8), 'the second lap should repeat the same order as the first');
});

test('round-robin: a user with inPool=false is never picked, even if Active', () => {
  createTestUser({ id: 'RRPOOL1', name: 'Pool Excluded', role: 'Manager', createdOn: Date.now(), active: true, inPool: false });
  const picks = new Set();
  for (let i = 0; i < 20; i++) {
    const u = alloc.pickNextEligibleUser();
    if (u) picks.add(u.id);
  }
  assert.ok(!picks.has('RRPOOL1'), 'inPool=false user should never be selected');
});

test('catch-up reset: a stale lastMidnightResetDate triggers an immediate reset attributed to yesterday, not today', () => {
  const u = createTestUser({ id: 'CATCHUP1', name: 'Catchup User', role: 'Agent', createdOn: Date.now(), active: true, tokenVersion: 5 });
  db.setSetting('lastMidnightResetDate', '2020-01-01'); // absurdly stale
  alloc.__test__.runDailyChecks(Date.now());
  const after1 = db.getUser(u.id);
  assert.equal(after1.active, 0, 'stale Active flag should be reset to false');
  assert.equal(after1.tokenVersion, 6, 'tokenVersion should be bumped to invalidate old tokens');

  const yesterday = alloc.istParts(Date.now() - 24 * 60 * 60 * 1000).dateString;
  assert.equal(db.getSetting('lastMidnightResetDate'), yesterday, 'should be attributed to yesterday so tonight\'s real reset still fires on schedule');

  // Running it again immediately must NOT re-trigger (idempotent).
  db.patchUser(u.id, { active: true, tokenVersion: 10 });
  alloc.__test__.runDailyChecks(Date.now());
  const after2 = db.getUser(u.id);
  assert.equal(after2.tokenVersion, 10, 'a second immediate run should not catch up again');
  assert.equal(after2.active, 1);
});
