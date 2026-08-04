# Deploying EM Leads to AWS

This is for whoever is doing the actual deployment. It assumes a single EC2 instance —
that's what this app's data layer (SQLite, local file uploads) actually supports today. If
you need multi-instance/auto-scaling, see **Scaling beyond one instance** at the bottom
before you start — it changes the architecture, not just the deploy steps.

## What this app is

- **Backend**: Node/Express, in `server/`. Talks to a single SQLite file (`server/data.sqlite`)
  and stores uploaded invoices on local disk (`server/uploads/`).
- **Frontend**: React/Vite, in `app/`. Builds to static files (`app/dist`) — no Node server
  needed to serve it, just any static file host or nginx.
- **No external dependencies required to run**: no managed database, no Redis, no message
  queue. That's what makes single-instance deployment simple, and also why it doesn't scale
  past one instance without changes (see bottom).

## 1. Provision the EC2 instance

- Ubuntu 22.04 LTS, `t3.small` is plenty for a team this size (7 agents, low thousands of
  leads). Bump to `t3.medium` only if you see the process actually under memory pressure.
- Security group: allow inbound 80/443 (public), 22 (SSH, ideally restricted to your office
  IP or via SSM Session Manager instead of an open port).
- Attach an EBS volume sized for growth — the SQLite file, uploads, and backups all live on
  local disk. 20GB is generous for years of a small team's data; resize later if needed.
- Elastic IP so the address doesn't change on instance stop/start, and point your DNS
  (`crm.yourcompany.com`) at it.

## 2. Install the runtime

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2
```

## 3. Get the code onto the box

Whatever your normal deploy flow is (git pull, rsync, CodeDeploy, etc.) — just get the repo
onto the instance, e.g. `/var/www/em-crm`.

```bash
cd /var/www/em-crm/server && npm install --omit=dev
cd /var/www/em-crm/app && npm install && npm run build   # produces app/dist
```

## 4. Configure environment variables

```bash
cd /var/www/em-crm/server
cp .env.example .env
```

Edit `.env`. At minimum, set:

| Variable | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Enables the JWT_SECRET hard-fail and CORS warning below |
| `JWT_SECRET` | output of `openssl rand -hex 32` | Required — the app **will not start** without this once NODE_ENV=production |
| `CORS_ORIGIN` | `https://crm.yourcompany.com` | Your real frontend URL — without this the API accepts requests from any origin |
| `TRUST_PROXY` | `1` | You're behind nginx (below) — this makes login rate-limiting see the real client IP instead of nginx's |

Everything else in `.env.example` is optional / has a safe default — read the comments in
that file for what each one does.

**Do not set Sarv/Twilio/Exotel credentials here.** See "Telephony credentials" below — the
app already has a UI for that, and it's the better place.

## 5. Frontend build-time config

The frontend needs to know the API's URL **at build time** (Vite bakes it into the built
files — it can't be changed by editing `.env` on the server after the fact):

```bash
cd /var/www/em-crm/app
echo "VITE_API_URL=https://crm.yourcompany.com" > .env
npm run build
```

If you ever change the domain, you have to `npm run build` again.

## 6. Run the backend under PM2

```bash
cd /var/www/em-crm/server
sudo mkdir -p /var/log/em-crm
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # run the command it prints — makes PM2 survive a reboot
```

Confirm it's up: `curl http://localhost:8787/api/leads/import/sample` should return a CSV,
not an error.

## 7. nginx (reverse proxy + serves the frontend + TLS)

A ready-to-edit config is at `deploy/nginx.conf.example` — copy it in, fix the domain and
paths, then:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/em-crm
sudo ln -s /etc/nginx/sites-available/em-crm /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d crm.yourcompany.com   # sets up TLS + auto-renewal, edits the config for you
```

## 8. Telephony (Sarv) credentials

**Don't put these in a file or send them in chat/Slack.** Once the app is deployed:

1. Log in as an Admin.
2. Go to **Admin → Integrations**.
3. Set Provider to **Sarv**, enter the User ID and Token there, Save.

This is stored in the database, not a file — no code change, no redeploy, and it's easy to
rotate the token later the same way. The `.env` `SARV_USER_ID`/`SARV_TOKEN` vars exist only
as a fallback if nothing's set in the app yet; prefer the UI.

## 9. Backups

The app already writes a daily SQLite backup to `server/backups/` (or wherever `BACKUP_DIR`
points) and keeps the last 14. **That alone is not a real backup** — it's on the same disk
as the database it's backing up, so a disk failure loses both. Sync it offsite, e.g. a nightly
cron syncing to S3:

```bash
# /etc/cron.d/em-crm-backup-sync
0 3 * * * root aws s3 sync /var/www/em-crm/server/backups s3://your-backup-bucket/em-crm/ --only-show-errors
```
(Needs an IAM role/instance profile with `s3:PutObject` on that bucket — attach it to the
EC2 instance, don't put AWS keys in a file on disk.)

Also worth an S3 lifecycle rule on that bucket (e.g. expire after 90 days) so it doesn't grow
forever.

## 10. Verifying the deploy

```bash
npm test --prefix server                 # 23 automated tests should all pass
curl -I https://crm.yourcompany.com       # frontend loads
curl https://crm.yourcompany.com/api/leads/import/sample   # API reachable through nginx
```
Then log in through the browser with a seed account and confirm the Dashboard loads.

## 11. Updating the deploy later

```bash
cd /var/www/em-crm && git pull
cd server && npm install --omit=dev && pm2 restart em-crm-api
cd ../app && npm install && npm run build   # nginx serves the new build immediately, no restart needed
```

---

## Scaling beyond one instance

This app's data layer is a single SQLite file plus local-disk file uploads — neither of
those work if you run more than one backend instance (SQLite is one file, not a shared
database; a second instance wouldn't see uploads saved on the first instance's disk). If you
outgrow one EC2 instance, the actual work is:

- Move leads/users/settings from SQLite to a real database (Postgres on RDS is the natural
  fit — `server/src/db.js` is the only file that would need rewriting, the rest of the app
  talks to it through plain function calls, not raw SQL scattered everywhere).
- Move uploaded files from local disk to S3.
- Then a second EC2 instance (or ECS/Fargate) behind an ALB is straightforward.

This is a real project, not a config change — flag it early if you're expecting to need it
soon, since it's much easier to plan for than retrofit.
