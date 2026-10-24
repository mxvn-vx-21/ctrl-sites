# CTRL

Cloudflare Pages site (`public/`) + Pages Functions backend (`functions/`) + D1 database. Auth: Google, GitHub, passwordless email via Resend. No other dependencies (wrangler is dev-only).

## Setup

1. `npm i`
2. `npx wrangler d1 create ctrl` → put the returned `database_id` in `wrangler.toml`.
3. `npm run db:migrate` (remote) / `npm run db:migrate:local`. Re-run this after every update: new migrations (`0002_launchpad.sql` adds projects + bio) only apply when you run it.
4. Cloudflare dashboard → Pages project → Settings → Bind D1 `DB` (already declared in `wrangler.toml`).
5. Secrets (Pages → Settings → Variables and Secrets, or `npx wrangler pages secret put NAME`):

| Name | Purpose |
|---|---|
| `SESSION_SECRET` | HMAC key for OAuth state cookie. `openssl rand -base64 48` |
| `RESEND_API_KEY` | Resend API key (sending access) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth |

Non-secret vars live in `wrangler.toml`: `APP_URL` (production origin) and `AUTH_FROM_EMAIL` (`CTRL <noreply@ctrl.monster>`).

6. **Resend:** add and verify the `ctrl.monster` domain (SPF + DKIM DNS records). Sending from noreply@ctrl.monster fails until it is verified.
7. **Google:** OAuth client (Web). Authorized redirect URI: `https://ctrl.monster/api/auth/google/callback`.
8. **GitHub:** OAuth App. Callback URL: `https://ctrl.monster/api/auth/github/callback`.
9. Deploy: `npm run deploy`, or connect the repo (build output dir `public`, no build command).

Providers without credentials are reported by `GET /api/auth/providers`, and the UI shows "isn't available yet" instead of failing.

## API

| Route | |
|---|---|
| `POST /api/auth/email/request` `{email, mode: "login"\|"signup"}` | Sends a single-use link (15 min). Same response whether or not the account exists. |
| `POST /api/auth/email/verify` `{token}` | Consumes the token atomically, creates the user (email verified) if new, starts a session. Errors: `invalid`, `expired`, `used`. |
| `GET /api/auth/{google,github}/start` / `callback` | OAuth code flow, signed state cookie, PKCE (Google). Verified provider email required; links to an existing account with the same verified email. |
| `GET /api/auth/session`, `POST /api/auth/logout` | Current user / end session. |
| `GET /api/auth/providers` | Which methods are configured. |

## Launchpad
- Each user claims one permanent handle (3–30 chars: a–z, 0–9, hyphens) and gets a public page at `https://ctrl.monster/{handle}`, server-rendered by `functions/[handle].js`. Unclaimed handles show an "available" page; reserved words (login, api, admin…) can't be claimed.
- Projects: up to 10 per user (name, tagline, http(s) link, optional description). Public feed shows the latest 30.

| Route | |
|---|---|
| `GET /api/launchpad/handle/check?name=` | Availability |
| `POST /api/launchpad/handle` `{name}` | Claim (once; unique in D1) |
| `PUT /api/launchpad/profile` `{name,bio}` | Edit profile |
| `GET /api/launchpad/me` | Your user + projects |
| `POST /api/launchpad/projects`, `PUT`/`DELETE /api/launchpad/projects/:id` | Manage projects |
| `GET /api/launchpad/feed` | Latest launches |

Not built: voting, comments, rankings, custom domains/subdomains, moderation or report tools.

## Deploy (static sites)
Users upload a `.html` file or a `.zip` of a built site at `/#/deploy` and get `https://{name}.ctrl.monster`.
- Zips: a single top-level folder is stripped automatically, or give a directory (e.g. `dist`). `index.html` is required. Dotfiles (`.env`, `.git`), path traversal, executables and server scripts are rejected/dropped.
- Limits: 10 MB upload, 30 MB unpacked, 8 MB per file, 500 files, 5 sites per user, last 3 deployments kept (rollback available).
- Files live in R2 (`ctrl-sites`), metadata in D1. A separate Worker (`serve/`) serves `*.ctrl.monster` because Pages custom domains can't be wildcards. User sites run on subdomains so their scripts can't read CTRL's session cookie (host-only cookie).
- Not built: build commands (npm install/build). That needs an isolated runner (Cloudflare Containers or an external CI) and is phase 2. Rejected in the UI as "coming soon".

Setup:
1. `npx wrangler r2 bucket create ctrl-sites`
2. Re-run `npm run db:migrate` (adds sites, deployments, reports).
3. Redeploy Pages (R2 binding `SITES` is in `wrangler.toml`).
4. Fill the D1 `database_id` in `serve/wrangler.toml`, then `cd serve && npx wrangler deploy`.
5. DNS: add a proxied wildcard record `*` for `ctrl.monster` (e.g. AAAA `100::`, proxied). Universal SSL covers `*.ctrl.monster` (one level only).
6. Optional secret `ADMIN_EMAILS` (comma-separated): lets those accounts `POST /api/admin/sites/{slug}` `{"disabled":true}` to take a site down and `GET /api/admin/reports` to read reports from `POST /api/report`.

Caveat: unzipping runs inside a Pages Function. On the Workers Free plan the CPU limit is very low, so larger zips may fail; the Paid plan removes that problem.

## Security notes
- Email-link and session tokens are random 256-bit values; only SHA-256 hashes are stored. Cookie `bb_session`: HttpOnly, Secure, SameSite=Lax, 30 days, sliding renewal.
- Email links open `/#/verify?token=…` and need a button press (POST), so mail scanners that prefetch links can't consume them. The token sits in the URL fragment and isn't sent to servers.
- POST endpoints require a same-origin `Origin` header. Rate limits (D1): 5 emails/15 min per address, 20/hour per IP, 30 verifies/hour per IP.
- Strict headers/CSP in `public/_headers`. No secrets in client code.
- Schema is ready for creator profiles (`users.username`, `oauth_accounts`).

## Status
Tested locally (wrangler pages dev + mock Resend): site create/deploy (zip + html), serving via the Worker, rollback, delete, bad-zip/path/exe rejection, reports and admin guard; Launchpad handle claim/check, profile, project create/delete, feed, public page rendering (HTML-escaped), auth guards and origin checks; email request → link → verify → session → logout, token reuse/invalid, origin check, rate limit, OAuth start redirect and forged-callback rejection.
**Not tested:** real Resend delivery, real Google/GitHub round trips, production Pages deployment, `_redirects` pretty URLs (`/login` → `/#/login`), UI in a browser.
Deployed: no.
