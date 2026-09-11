# QazLoyal v0.4.1 — Security & Netlify Patch

## What is QazLoyal

QazLoyal is a LoyaltyTech platform for small and medium businesses. Customers earn digital QL Points for purchases; businesses track redemption, retention and repeat purchases. QL Points are loyalty rewards, not an investment or a promise of financial returns.

## Pilot Ready Status

v0.4.1 hardens the application for a first controlled business pilot. See [FINAL_V041_REPORT.md](FINAL_V041_REPORT.md) for actual validation results and external setup still required. Hosting, a managed PostgreSQL database, a real email account/sending domain and backups are not provisioned by this repository.

**STOP FEATURES:** after v0.4 acceptance, run the real business pilot, collect feedback and measured results. Do not begin v0.5 based on assumed demand.

## Architecture

Next.js App Router + React + TypeScript; Node.js 22; Prisma 6 with PostgreSQL. Server services enforce authorization. Public registration creates a BUSINESS_OWNER. One owned business per owner; active employee memberships may span explicitly invited businesses. No MetaMask is required for ordinary loyalty use.

## PostgreSQL

PostgreSQL is the only production database. Runtime uses DATABASE_URL. Keep connection counts within the provider's budget; set connection_limit, connect_timeout and pool_timeout in the Prisma URL as appropriate. A provider's transaction-pool endpoint may be used for application traffic when it supports Prisma interactive transactions. Use its direct PostgreSQL endpoint for migrations and backups. Do not use statement pooling. Never substitute SQLite to pass tests.

## Authentication

Passwords use bcrypt cost 12, 12–72 characters and at most 72 UTF-8 bytes. Opaque 256-bit session tokens are stored as HMAC digests and expire in 7 days. Production cookies are HttpOnly, Secure, SameSite=Strict, Path=/. Login replaces the current browser session token. Persistent per-IP and normalized account/action rate limits apply. No global-auth bucket remains. See docs/DEPLOYMENT.md for values and trusted proxy setup.

Forgot password returns the same message for existing and unknown accounts. Reset tokens expire after 30 minutes, are stored only as SHA-256 hashes and are single use. Requesting a new token replaces the previous one. Successful reset atomically changes the password, increments authVersion, removes all reset tokens and deletes every session for that user. A login already in flight with the old password version cannot create a new session after reset.

## Employee Roles

Owner opens Employees, invites an email, lists team/pending invitations, revokes invitations and disables/restores membership. Invitations expire after 48 hours; hashed tokens are single use. Links use URL fragments so raw tokens are not sent to access logs. The client removes the fragment after loading; reopen the email link after refreshing the page.

An existing account must provide its existing password; an invitation cannot overwrite it. A signed-in different account cannot accept the link. Existing business owners must use a separate employee account email. No role or businessId is accepted from the invitation client. Disabled memberships cannot self-reactivate. Server authorization excludes disabled members on each new request, including inside loyalty transactions.

Employees can search/open their customers, use QR identifiers, EARN/REDEEM and see scoped history/dashboard. They cannot change owner settings or manage staff. Owner history shows the processing employee's email. Disabling access preserves historical attribution.

## Loyalty Ledger

EARN/REDEEM and balance/statistics updates share a Serializable PostgreSQL transaction. Integer minor currency units, integer points and basis points avoid floating point. 5% = 500 BPS: 10 000 KZT earns 500 QL Points. A zero-point reward is an explicit no-op. Insufficient redemption fails without ledger mutation.

A unique (businessId, idempotencyKey) plus request hash prevents duplicates and rejects changed payloads. Retry uncertain responses using the same key. Completed requests replay their original result even after rate changes. Future EARN uses the current rate; old transactions never recalculate. Database constraints reject negative balances and an append-only trigger rejects ledger UPDATE/DELETE. The application exposes EARN/REDEEM only; other stored transaction types are not new v0.4 features.

## QR

Each business/customer membership has a random public UUID. QR encodes the app's /scan URL, public code and business UUID; it includes no credentials, personal customer fields or session tokens. UUIDs are identifiers, not authorization. Authentication and business membership are required for lookup; foreign QR codes return 404. Manual lookup is available; an in-app camera is not added.

## Security

Mutations require the configured exact Origin, JSON and a bounded 16 KB body. Zod schemas reject extra properties. Authorization is enforced on the server. API errors are sanitized; logs use an allowlist and generated request IDs. No passwords, action/session tokens, raw URLs, secrets or DB credentials are logged in production. Configure platform access logs to exclude credentials/request bodies. See [SECURITY.md](SECURITY.md) and [docs/PRIVACY.md](docs/PRIVACY.md).

## Environment Variables

Copy frontend/.env.example to frontend/.env for local work. Real secrets must never be committed or zipped.

| Variable | Purpose |
|---|---|
| NODE_ENV | development, test or production; Next start uses production |
| DATABASE_URL | PostgreSQL runtime URL; never NEXT_PUBLIC |
| TEST_DATABASE_URL | isolated database whose name ends _test |
| AUTH_SECRET | at least 32 cryptographically random characters |
| RATE_LIMIT_SECRET | independent HMAC key, 32+ random characters; required in production |
| TRUSTED_PROXY | netlify on Netlify; trusted-proxy only behind an origin-restricted proxy; none for local fallback |
| NEXT_PUBLIC_APP_URL | exact app origin; HTTPS required in production |
| APP_URL | optional alias; must match NEXT_PUBLIC_APP_URL |
| EMAIL_PROVIDER | console only in development/test; resend in production |
| EMAIL_FROM | verified sending email for Resend |
| EMAIL_API_KEY | server-only email provider credential |
| BLOCKCHAIN_ENABLED | false for normal pilot |
| ALLOW_DEV_SEED | false except explicit isolated development seed |

The server-only env module validates API requests and Prisma access independently of npm start. Instrumentation reports configuration errors; standalone npm start exits nonzero on invalid env. No production fallback secret or insecure cookie switch exists. Build with the intended public URL and blockchain public settings; NEXT_PUBLIC values may be inlined. The email adapter does not send during build. EmailService is replaceable without changing auth/invitation logic. [Resend API documentation](https://resend.com/docs/api-reference/emails/send-email) describes sender verification and delivery configuration. Real delivery must be tested after connecting your own provider.

When enabling legacy blockchain, configure the existing token/payment addresses, Sepolia chain and trusted runtime bytecode hash as described in docs/legacy-qfc. Optional startup validation does not replace the preserved on-chain payment validation.

## Development Setup

Use Node 22 (`nvm use` where available); both package manifests require >=22 <23. From frontend:

```bash
npm ci
# Configure frontend/.env and start a local PostgreSQL instance.
npx prisma migrate dev
npm run dev
```

Development URL defaults to http://localhost:3000; set NODE_ENV=development and EMAIL_PROVIDER=console for local action links. Do not use live users or customer data in development.

Register, enter business name and currency (KZT default), choose reward rate with a preview, add first customer, issue the first reward, then open Dashboard. No lengthy CRM form is required. Currency is fixed after creation to prevent mixing ledger units. Optional logo upload is not part of this MVP.

Development seed: explicitly set ALLOW_DEV_SEED=true, NODE_ENV=development, an isolated *_dev database, SEED_OWNER_EMAIL/PASSWORD and distinct SEED_EMPLOYEE_EMAIL/PASSWORD. Run npm run db:seed. It creates Qaz Coffee, an employee, 8 customers and 10 synthetic transactions. Existing seed accounts are refused. It never runs automatically. For the actual pilot use normal registration/onboarding, not seed. `npm run db:cleanup` removes expired sessions, rate-limit buckets and reset tokens, never loyalty records; schedule it externally if needed.

## Testing

From frontend, with explicit environment and PostgreSQL:

```bash
node --version
npm ci
npm audit
npx prisma validate
npx prisma generate
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

Integration runner requires TEST_DATABASE_URL ending _test, applies migrate deploy and runs real PostgreSQL tests; it never drops or truncates the database. Use a database dedicated to tests. Root `npx hardhat test` verifies preserved optional contracts. Browser instructions are in [qa/README.md](qa/README.md). Unit/UI fixtures are explicitly distinguished from real database checks in the final report.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). TLS belongs at the host/reverse proxy. Use `npm start` after build with valid production settings. GET /api/health returns status, database, version and timestamp; failure returns 503 with no secrets. Monitor this endpoint and structured error events. Do not publicly deploy test mail capture or seed settings.

## Database Migrations

Development: `npx prisma migrate dev`. Production: `npx prisma migrate deploy` in one release job using a direct PostgreSQL connection, before app rollout. Never use db push as a production strategy. Preserve the ordered migration history, including the historical empty checkpoint. v0.4 adds reset/invitation tables, active membership/auth version and indexes without rebuilding the ledger. Back up and rehearse migration on a restored staging DB first.

## Backup

See [docs/BACKUP.md](docs/BACKUP.md). Enable actual provider backups and verify a restore before admitting a pilot business. This repository does not imply any external backup service is enabled.

## Demo

/demo is an account-free, session-only demo, clearly labelled Demo. Its data stays separate from PostgreSQL business data. It is not the real pilot workspace.

## Legacy Blockchain

QFC/QFT remains an optional experimental Sepolia module. No contracts were redeployed, no addresses changed and payment security checks remain. BLOCKCHAIN_ENABLED=false leaves the full loyalty product usable. No token sale, NFT, staking, marketplace or investment positioning is introduced.

## Pilot Checklist

Use [docs/PILOT_CHECKLIST.md](docs/PILOT_CHECKLIST.md). First configure hosting, managed database, HTTPS, real email and backups; verify the acceptance scenarios with synthetic data in staging, then onboard the real business. After acceptance: STOP FEATURES, collect pilot feedback and measure results.


