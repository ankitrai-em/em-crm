// Daily SQLite backup: uses better-sqlite3's own .backup() (an online/hot backup, safe to
// run against a live database) rather than copying the file directly, which could grab it
// mid-write. Keeps the last KEEP_COUNT backups and prunes older ones.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : path.join(__dirname, '..', 'backups');
const KEEP_COUNT = 14;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function runBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const dest = path.join(BACKUP_DIR, `data-${timestamp()}.sqlite`);
  await db.backup(dest);

  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('data-') && f.endsWith('.sqlite'))
    .sort();
  const stale = files.slice(0, Math.max(0, files.length - KEEP_COUNT));
  for (const f of stale) fs.unlinkSync(path.join(BACKUP_DIR, f));

  console.log(`[backup] wrote ${dest}${stale.length ? `, pruned ${stale.length} old backup(s)` : ''}`);
  return dest;
}

let schedulerStarted = false;
export function startBackupScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  runBackup().catch((err) => console.error('[backup] failed:', err.message));
  // Once a day is enough; a plain interval (not IST-aligned) is fine for a backup cadence.
  setInterval(() => runBackup().catch((err) => console.error('[backup] failed:', err.message)), 24 * 60 * 60 * 1000);
}

export { runBackup, BACKUP_DIR };
