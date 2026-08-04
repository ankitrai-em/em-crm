## Lead API

Express + SQLite backend for the Lead Management app. Data persists to `server/data.sqlite` (created automatically).

### Run

```bash
cd server
npm install
cp .env.example .env
npm run dev        # http://localhost:8787
```

### Test

```bash
npm test            # runs server/test/*.test.js via Node's built-in test runner
```

### Deploying

See [`DEPLOYMENT.md`](../DEPLOYMENT.md) at the repo root for a full AWS EC2 walkthrough
(env vars, PM2, nginx, TLS, backups). At minimum, production needs `NODE_ENV=production`,
a real `JWT_SECRET`, and `CORS_ORIGIN` set in `.env` — the app deliberately refuses to start
without a `JWT_SECRET` when `NODE_ENV=production`.

### Endpoints

| Method | Path                    | Purpose                                                              |
| ------ | ----------------------- | --------------------------------------------------------------------- |
| GET    | `/api/leads`            | List all leads                                                         |
| GET    | `/api/leads/:id`        | Fetch one lead                                                         |
| POST   | `/api/leads`            | Create a lead from the app UI (Quick Add / Add Lead)                  |
| POST   | `/api/leads/webhook`    | **Generic intake endpoint** — point external lead sources here        |
| PATCH  | `/api/leads/:id`        | Update stage, follow-up, test ride, sale, etc; optionally append an activity note |
| POST   | `/api/leads/:id/call`   | Click-to-call — dials out through the configured telephony provider   |
| GET    | `/api/users`            | List users                                                             |
| POST   | `/api/users`            | Create a user (Name, Email, Phone, Role)                               |
| PATCH  | `/api/users/:id`        | Update a user                                                          |
| DELETE | `/api/users/:id`        | Remove a user                                                          |

### Feeding in real leads

Point any external lead source (Facebook/Instagram Lead Ads, Google Lead Form Extensions, a website contact form, a CRM webhook) at:

```
POST http://<your-server>/api/leads/webhook
Content-Type: application/json

{ "full_name": "Jane Doe", "phone_number": "9876543210", "email": "jane@example.com", "city": "Pune", "source": "Facebook Lead Ads", "campaign": "Monsoon Offer" }
```

Field names are matched on a best-effort basis (`name`/`full_name`/`fullName`, `phone`/`phone_number`/`mobile`, etc.) — only a phone number is required. Adjust `normalizeIncomingLead` in `src/index.js` if your source uses different field names.

### Click-to-call

`TELEPHONY_PROVIDER` in `.env` controls which provider handles `POST /api/leads/:id/call`:

- `mock` (default) — no credentials needed, simulates the call instantly so the rest of the app is fully testable today.
- `sarv` — set `SARV_USER_ID`, `SARV_TOKEN`. Hits Sarv/DeepCall's `clickToCall` API.
- `twilio` — set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_TWIML_URL`.
- `exotel` — set `EXOTEL_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, `EXOTEL_CALLER_ID`, `EXOTEL_AGENT_NUMBER`.

See `src/telephony.js` to add another provider — it's a single `placeCall({ toNumber, agentNumber, leadId })` function per provider.

**The agent number is never hardcoded.** When you click Call on a lead, the server looks up that lead's `owner`, finds the matching user in User Management, and uses that user's phone as the agent leg. The customer leg is always the lead's own phone. If the owner has no phone on file (or the lead is Unassigned), the call is rejected with a message telling you to fix it in User Management — nothing silently calls the wrong number.
