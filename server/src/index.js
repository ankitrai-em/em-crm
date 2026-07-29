import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { listLeads, getLead, insertLead, patchLead, listUsers, getUser, getUserByName, insertUser, patchUser, deleteUser } from './db.js';
import { placeCall } from './telephony.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8787;

function normalizeIncomingLead(body) {
  const name = body.name || body.full_name || body.fullName || [body.first_name, body.last_name].filter(Boolean).join(' ') || null;
  const phone = body.phone || body.phone_number || body.phoneNumber || body.mobile;
  if (!phone) return { error: 'phone is required' };

  const source = body.source || body.lead_source || 'Webhook';
  const now = Date.now();
  return {
    lead: {
      id: 'L' + nanoid(6).toUpperCase(),
      name,
      phone: String(phone),
      email: body.email || '',
      city: body.city || '—',
      pin: body.pin || body.pincode || body.zip || '—',
      source,
      campaign: body.campaign || body.campaign_name || '—',
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
    },
  };
}

// List all leads
app.get('/api/leads', (_req, res) => {
  res.json(listLeads());
});

app.get('/api/leads/:id', (req, res) => {
  const lead = getLead(req.params.id);
  if (!lead) return res.status(404).json({ error: 'not found' });
  res.json(lead);
});

// Manual lead creation from the app UI (Quick Add / Add Lead modals)
app.post('/api/leads', (req, res) => {
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
app.patch('/api/leads/:id', (req, res) => {
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
app.post('/api/leads/:id/call', async (req, res) => {
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
    const result = await placeCall({ toNumber: lead.phone, agentNumber, leadId: lead.id });
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

// ---- users ----

app.get('/api/users', (_req, res) => {
  res.json(listUsers());
});

app.post('/api/users', (req, res) => {
  const { name, email, phone, role } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const user = insertUser({
    id: 'U' + nanoid(6).toUpperCase(),
    name,
    email: email || '',
    phone: phone || '',
    role: role || 'Agent',
    createdOn: Date.now(),
  });
  res.status(201).json(user);
});

app.patch('/api/users/:id', (req, res) => {
  const updated = patchUser(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

app.delete('/api/users/:id', (req, res) => {
  if (!getUser(req.params.id)) return res.status(404).json({ error: 'not found' });
  deleteUser(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Lead API listening on http://localhost:${PORT}`);
});
