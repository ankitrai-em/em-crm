// Lead allocation: round-robin distribution of leads to Active users, gated to an
// 11:00 AM - 7:00 PM IST window, with a Lead Pool for anything outside that window.
import { getSetting, setSetting, listActiveUsers, listUnallocatedLeadIds, patchLead, bumpAllTokenVersions, resetAllActive } from './db.js';

const IST_TIMEZONE = 'Asia/Kolkata';
const WINDOW_START_HOUR = 11;
const WINDOW_END_HOUR = 19; // 7:00 PM, exclusive

// All time logic takes an optional `atMs` (defaults to real time) so it can be tested
// deterministically without waiting for the clock or mocking global Date.
export function istParts(atMs = Date.now()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(atMs).map((p) => [p.type, p.value]));
  let hour = parseInt(parts.hour, 10);
  if (hour === 24) hour = 0; // some ICU versions report midnight as "24"
  return { dateString: `${parts.year}-${parts.month}-${parts.day}`, hour, minute: parseInt(parts.minute, 10) };
}

export function isWithinAllocationWindow(atMs = Date.now()) {
  const { hour } = istParts(atMs);
  return hour >= WINDOW_START_HOUR && hour < WINDOW_END_HOUR;
}

export function isBeforeWindowStart(atMs = Date.now()) {
  return istParts(atMs).hour < WINDOW_START_HOUR;
}

// Round robin cursor: remembers the last user a lead was given to, so the sequence
// resumes from there rather than restarting. Users who've since gone Inactive simply
// aren't in the eligible list, so they're skipped without special-casing.
export function pickNextEligibleUser() {
  const eligible = listActiveUsers();
  if (!eligible.length) return null;
  const cursor = getSetting('roundRobinCursor');
  let startIndex = 0;
  if (cursor?.lastUserId) {
    const idx = eligible.findIndex((u) => u.id === cursor.lastUserId);
    startIndex = idx === -1 ? 0 : (idx + 1) % eligible.length;
  }
  const chosen = eligible[startIndex];
  setSetting('roundRobinCursor', { lastUserId: chosen.id });
  return chosen;
}

// Assigns one lead to the next eligible user. Returns the updated lead, or null if
// there were no eligible users (the lead is left as 'Unassigned', i.e. still in the pool).
export function allocateLeadToNextUser(leadId) {
  const user = pickNextEligibleUser();
  if (!user) return null;
  return patchLead(leadId, { owner: user.name }, {
    ts: Date.now(),
    kind: 'note',
    text: `Auto-assigned to ${user.name} via round robin`,
  });
}

// Allocates every currently-unassigned lead (the Lead Pool) in creation order.
// Used both for the 11:00 AM first-allocation-of-the-day and as a manual/admin trigger.
export function allocatePoolLeads() {
  const pending = listUnallocatedLeadIds();
  let count = 0;
  for (const { id } of pending) {
    const result = allocateLeadToNextUser(id);
    if (!result) break; // no eligible users at all; nothing further will succeed either
    count++;
  }
  return count;
}

function runDailyChecks(atMs = Date.now()) {
  const { dateString, hour, minute } = istParts(atMs);

  if (hour >= WINDOW_START_HOUR) {
    const lastRun = getSetting('lastPoolAllocationDate');
    if (lastRun !== dateString) {
      const count = allocatePoolLeads();
      // Only mark today's pool run as "done" once the pool actually drained. If it stalled
      // because no one was Active yet (e.g. the whole team logged in late), leave the flag
      // unset so the next tick retries instead of leaving those leads stuck until tomorrow.
      if (listUnallocatedLeadIds().length === 0) {
        setSetting('lastPoolAllocationDate', dateString);
      }
      if (count > 0) console.log(`[allocation] Pool allocation for ${dateString}: ${count} lead(s) allocated.`);
    }
  }

  if (hour === 23 && minute >= 59) {
    const lastReset = getSetting('lastMidnightResetDate');
    if (lastReset !== dateString) {
      bumpAllTokenVersions();
      resetAllActive();
      setSetting('lastMidnightResetDate', dateString);
      console.log(`[allocation] Midnight reset for ${dateString}: all users logged out, eligibility reset.`);
    }
  }
}

let schedulerStarted = false;
export function startAllocationScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  runDailyChecks();
  setInterval(() => runDailyChecks(), 60 * 1000);
}

// Exposed for tests only.
export const __test__ = { runDailyChecks };
