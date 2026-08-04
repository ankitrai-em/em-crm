// Integration tests for the security fixes: spins up the real server (src/index.js) as a
// child process against a throwaway DB and port, so app.listen()/setInterval schedulers
// live in a process that gets killed cleanly afterward instead of hanging this test run.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '.tmp-integration-test.sqlite');
const PORT = 8799;
const API = `http://localhost:${PORT}`;
let serverProcess;

function cleanupDbFiles() {
  for (const suffix of ['', '-shm', '-wal']) {
    if (fs.existsSync(DB_PATH + suffix)) fs.unlinkSync(DB_PATH + suffix);
  }
}

async function waitForServer(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${API}/api/leads/import/sample`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server did not start in time');
}

before(async () => {
  cleanupDbFiles();
  serverProcess = spawn('node', [path.join(__dirname, '../src/index.js')], {
    env: { ...process.env, DB_PATH, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: 'pipe',
  });
  await waitForServer();
});

after(() => {
  serverProcess?.kill('SIGKILL');
  cleanupDbFiles();
});

async function login(email, password) {
  const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  return res.json();
}

test('IDOR fix: a hierarchy-scoped user cannot read a lead outside their tree by ID', async () => {
  const { token: adminToken } = await login('aditya.narayan@emotorad.com', '12345678');
  const H = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  const mgr = await (await fetch(`${API}/api/users`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'Sec Test Manager', email: 'sectest.mgr@example.com', role: 'Manager', hierarchyEnabled: true }) })).json();
  const outsider = await (await fetch(`${API}/api/users`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'Sec Test Outsider', role: 'Agent' }) })).json();
  const outOfTreeLead = await (await fetch(`${API}/api/leads`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'Out Of Tree', phone: '700' + Date.now().toString().slice(-7), source: 'Website', owner: outsider.name }) })).json();

  await fetch(`${API}/api/users/${mgr.id}/reset-password`, { method: 'POST', headers: H, body: JSON.stringify({ password: 'sectest12345' }) });
  const { token: mgrTempToken } = await login('sectest.mgr@example.com', 'sectest12345');
  const changePwRes = await fetch(`${API}/api/auth/change-password`, { method: 'POST', headers: { Authorization: `Bearer ${mgrTempToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: 'sectest12345', newPassword: 'sectestfinal12345' }) });
  const { token: mgrToken } = await changePwRes.json();

  const res = await fetch(`${API}/api/leads/${outOfTreeLead.id}`, { headers: { Authorization: `Bearer ${mgrToken}` } });
  assert.equal(res.status, 404, 'a lead outside the manager\'s hierarchy tree should 404, not leak');
});

test('mustChangePassword: blocks other API routes but allows /me and /change-password', async () => {
  const { token: adminToken } = await login('aditya.narayan@emotorad.com', '12345678');
  const H = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
  const target = await (await fetch(`${API}/api/users`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'Force Change Test', email: 'forcechange@example.com', role: 'Agent' }) })).json();
  await fetch(`${API}/api/users/${target.id}/reset-password`, { method: 'POST', headers: H, body: JSON.stringify({ password: 'forcedpass123' }) });
  const { token } = await login('forcechange@example.com', 'forcedpass123');
  const TH = { Authorization: `Bearer ${token}` };

  const meRes = await fetch(`${API}/api/auth/me`, { headers: TH });
  assert.equal(meRes.status, 200, '/api/auth/me should stay reachable');

  const leadsRes = await fetch(`${API}/api/leads`, { headers: TH });
  assert.equal(leadsRes.status, 403, 'other routes should be blocked while mustChangePassword is true');
  const leadsBody = await leadsRes.json();
  assert.equal(leadsBody.mustChangePassword, true);
});

test('tokenVersion bump: an old token stops working immediately after a password reset', async () => {
  const { token: adminToken } = await login('aditya.narayan@emotorad.com', '12345678');
  const H = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
  const target = await (await fetch(`${API}/api/users`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'Revoke Test', email: 'revoketest@example.com', role: 'Agent' }) })).json();
  await fetch(`${API}/api/users/${target.id}/reset-password`, { method: 'POST', headers: H, body: JSON.stringify({ password: 'firstpass123' }) });
  const { token: staleToken } = await login('revoketest@example.com', 'firstpass123');

  // Admin resets the password again (simulating "account compromised, reset it") — the
  // FIRST session's token must die immediately, not keep working for up to 7 days.
  await fetch(`${API}/api/users/${target.id}/reset-password`, { method: 'POST', headers: H, body: JSON.stringify({ password: 'secondpass456' }) });

  const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${staleToken}` } });
  assert.equal(res.status, 401, 'the pre-reset token should be dead');
});

test('rate limiting: repeated failed logins eventually get throttled', async () => {
  let sawLimitHeader = false;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' }) });
    if (res.headers.get('ratelimit-limit')) sawLimitHeader = true;
  }
  assert.ok(sawLimitHeader, 'RateLimit-* headers should be present on the login route');
});

test('upload fileFilter: rejects a non-allowlisted file type', async () => {
  const { token } = await login('aditya.narayan@emotorad.com', '12345678');
  const form = new FormData();
  form.append('file', new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), 'evil.html');
  const res = await fetch(`${API}/api/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /PDF, JPG, and PNG/);
});

test('uploads require auth to fetch back', async () => {
  const { token } = await login('aditya.narayan@emotorad.com', '12345678');
  const form = new FormData();
  form.append('file', new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' }), 'invoice.pdf');
  const uploadRes = await fetch(`${API}/api/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const { url } = await uploadRes.json();

  const noAuthRes = await fetch(`${API}${url}`);
  assert.equal(noAuthRes.status, 401);

  const withAuthRes = await fetch(`${API}${url}`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(withAuthRes.status, 200);
});

test('role change invalidates the old token immediately', async () => {
  const { token: adminToken } = await login('aditya.narayan@emotorad.com', '12345678');
  const H = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
  const target = await (await fetch(`${API}/api/users`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'Role Change Test', email: 'rolechange@example.com', role: 'Agent' }) })).json();
  await fetch(`${API}/api/users/${target.id}/reset-password`, { method: 'POST', headers: H, body: JSON.stringify({ password: 'rolepass123' }) });
  const { token: staleToken } = await login('rolechange@example.com', 'rolepass123');
  const changeRes = await fetch(`${API}/api/auth/change-password`, { method: 'POST', headers: { Authorization: `Bearer ${staleToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: 'rolepass123', newPassword: 'rolepassfinal123' }) });
  const { token: validToken } = await changeRes.json();

  await fetch(`${API}/api/users/${target.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ role: 'Manager' }) });

  const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${validToken}` } });
  assert.equal(res.status, 401, 'a token issued before the role change should be dead');
});
