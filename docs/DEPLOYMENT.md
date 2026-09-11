# Deployment

This is a portable Node.js 22 + PostgreSQL application. No hosting account, domain, managed database, email delivery or external backups are provisioned by the source archive.

1. Create managed PostgreSQL in the chosen region. Restrict network access, enable encrypted connections according to the provider and create a least-privilege application role. Use a separate migration role where supported. Application role must not be allowed to disable triggers or alter schema.
2. Enable provider backups and rehearse restore (BACKUP.md). Record the actual settings and owner.
3. Configure server environment from frontend/.env.example: DATABASE_URL, strong AUTH_SECRET and RATE_LIMIT_SECRET, appropriate TRUSTED_PROXY, NODE_ENV=production, HTTPS NEXT_PUBLIC_APP_URL, EMAIL_PROVIDER=resend, EMAIL_FROM, EMAIL_API_KEY, BLOCKCHAIN_ENABLED=false. Do not enable seed. Verify the sender/domain with your email provider. Never expose server keys as NEXT_PUBLIC variables.
4. Use the direct database endpoint for a single release migration job: in frontend run npm ci, then npx prisma migrate deploy. Do not use db push or reset on production. If using a runtime pool URL, supply the direct URL through the job's DATABASE_URL; do not print it in commands/logs.
5. Build in frontend with npm run build. Environment validation may also run in build workers, so provide valid build configuration. No real mail is sent by the build. Public variables must match deployment because Next.js can inline them. Never use the test mail preload in a deployment.
6. Start with npm start, behind your platform's HTTPS termination/reverse proxy. Route only through TLS publicly; secure cookies cannot be disabled. Preserve request Origin. Use process supervision and graceful rollout. Keep the database external to the application filesystem. The local QA TLS proxy is only a test helper, not a production TLS implementation.
7. Check GET /api/health: expect HTTP 200, status/database ok, version 0.4.1, timestamp. Verify deliberate database unavailability yields 503 in staging, and that monitoring alerts. Choose a DB connection budget and sensible timeouts (e.g. connect_timeout=5, pool_timeout=5); adjust pool size per instance and managed DB capacity.
8. In staging register an owner, create first business/customer, set 5%, EARN on 10 000 KZT, verify 500 QL after reload/logout/login, then REDEEM 100 to 400. Check attribution and dashboard.
9. Send a real invitation to a consenting test employee. Accept, login, search/QR, EARN/REDEEM. Disable access and verify requests fail; restore. Verify another business cannot read or mutate records through API.
10. Send a real password reset. Check delivery, expiration/reuse rejection, old password failure and session invalidation. The local captured-mail test does not prove public email deliverability.
11. Restart the app against the same DB and check all data persists. Test 320/390/768/1440 px, and the actual cashier phone before the pilot.
12. Review structured logs, restrict log access and retention, configure health/error alerts. Schedule db:cleanup for expired transient auth records; it does not touch ledger entries. Avoid logging query strings, request bodies, cookies or provider credentials. Action links use fragments and Referrer-Policy=no-referrer.
13. Complete PILOT_CHECKLIST.md. Create the real business through onboarding; never seed the real pilot database. Keep staging, QA and pilot databases separate.

## Pooling and releases

Use transaction pooling compatible with Prisma interactive transactions, not statement pooling. Confirm provider-specific prepared statement/pgbouncer settings. Run migrations through a direct connection. Bound the total connections across instances. Existing foreign keys, unique keys, nonnegative checks and append-only trigger must remain enabled. New v0.4 migration is additive; do not rewrite applied migrations.

For rollback: stop writes and inspect the failure. Prefer rolling forward with a reviewed fix. If restoring, restore to a new isolated DB and verify before changing the app connection. Do not blindly roll back schema or delete ledger rows. Rehearse this in staging.

## Optional deployment platforms

Any host supporting Node.js 22 and external PostgreSQL can run the project. Serverless platforms require provider-appropriate pooling and a separate migration job. No provider-specific credentials or binding is embedded. A real hosting choice and its configuration remain an operator action.

References: [Next instrumentation startup hook](https://nextjs.org/docs/pages/api-reference/file-conventions/instrumentation), [Resend authentication](https://resend.com/docs/api-reference/introduction).

Production start runs scripts/start.mjs: native Node.js 22 type stripping loads the shared env validator before spawning Next.js. This preflight exits nonzero on missing configuration, rather than relying solely on Next instrumentation error handling. The server-only env module also validates requests and Prisma access independently of this wrapper, including serverless runtimes.


# Netlify Free Pilot Deployment

1. Push this repository to GitHub; exclude secrets, local databases, node_modules and .next.
2. Import the repository into Netlify. The minimal root netlify.toml selects frontend as base, npm run build and .next. Let Netlify install its current OpenNext adapter automatically; do not use static export or a custom SPA rewrite.
3. Configure Node.js 22 for builds (NODE_VERSION=22). Set AWS_LAMBDA_JS_RUNTIME=nodejs22.x in Netlify UI for Functions. Confirm both versions in deployment logs; Netlify's default for newly created projects may differ.
4. Set production variables in the appropriate production deploy context, with Builds AND Functions scopes where applicable: NODE_ENV=production, DATABASE_URL, AUTH_SECRET, RATE_LIMIT_SECRET, NEXT_PUBLIC_APP_URL=https://your-site.example, EMAIL_PROVIDER=resend, EMAIL_FROM, EMAIL_API_KEY, BLOCKCHAIN_ENABLED=false, TRUSTED_PROXY=netlify. Optional APP_URL must match NEXT_PUBLIC_APP_URL. Generate independent random secrets of at least 32 characters. Public APP URL is also needed at build time. Secrets belong in the UI/CLI secret store, never netlify.toml or NEXT_PUBLIC_* variables.
5. Connect external managed PostgreSQL using ordinary DATABASE_URL. Neon is one possible pilot provider; no vendor SDK is needed. Check current free-plan quotas and backup/retention terms. Use a small runtime connection pool (for example connection_limit=2 plus connect_timeout=5 and pool_timeout=5), sized against maximum function instances and database capacity. Interactive transactions require compatible transaction pooling, not statement pooling.
6. Apply production migrations once per release from a trusted operator/CI job: in frontend run npm ci, then npx prisma migrate deploy with the direct database connection supplied through that job's DATABASE_URL. Never run migrate dev, db push or seed against production. Do not apply migrations on every function cold start.
7. Deploy the Next.js app. Confirm the Node SSR/API function and generated Prisma engine are included. Runtime uses one PrismaClient per warm module; development uses a hot-reload singleton. The repository remains usable on other Node.js/PostgreSQL hosts.
8. Verify public HTTPS, Secure/HttpOnly/SameSite=Strict session cookies, CSP and other response headers. Redirect HTTP at the platform edge.
9. Verify /api/health returns 200 and version 0.4.1 without configuration details. In staging check missing AUTH_SECRET/DATABASE_URL gives a safe failure even with direct Next/serverless execution, and DB outage gives 503.
10. Register a synthetic test owner through /register and finish onboarding.
11. Login/logout and verify cookie rotation and access restrictions.
12. Test EARN: 10 000 KZT at 5% gives 500 QL Points; refresh and inspect history.
13. Test REDEEM: redeem 100 to reach 400; replay the request and confirm idempotency.
14. Test password reset using the real configured provider, including actual delivery, expired/reused link rejection, old password failure and invalidated sessions. Next.js after schedules delivery after the generic HTTP response and Netlify OpenNext supports this lifecycle; it is not a durable queue. Monitor email_failed and retry through the reset flow if delivery fails.
15. Test persistence across logout/login and redeploy. Check employee invitation/disable/restore, foreign tenant denial, QR and /demo. Configure backups, restore drill, monitoring and expiration cleanup before real customers.

## Trusted client IP and limits (v0.4.1)

TRUSTED_PROXY=netlify trusts only x-nf-client-connection-ip supplied by Netlify's edge. Do not enable this mode on a publicly accessible generic Node server. X-Forwarded-For is never used. For another provider, TRUSTED_PROXY=trusted-proxy trusts only X-Real-IP and requires an origin inaccessible to clients plus a proxy that replaces the header with its socket peer address. Test attempted header spoofing at the deployed edge before opening the pilot.

TRUSTED_PROXY=none, a missing trusted header or an invalid address uses unresolved-client, a conservative shared fallback bucket that cannot affect identified clients. This fallback is for missing metadata, not an acceptable normal public deployment configuration: if all requests fall back, they share limits. Never derive fallback identity from attacker-controlled cookies or User-Agent. IPv4-mapped IPv6 and equivalent IPv6 spellings normalize to the same address.

Atomic PostgreSQL upserts make counters consistent across serverless instances. Fixed windows: login 60/IP and 10/email per 5 minutes; register 20/IP per 15 minutes; reset request 30/IP and 5/email per 15 minutes; reset completion 30/IP and 5/token per 15 minutes; invitation acceptance 30/IP and existing 5/token per 15 minutes. Existing authenticated invitation creation remains 30/business per 15 minutes. Email normalization trims and lowercases. Blocked requests return 429, generic text and Retry-After seconds. Successful login attempts also count. Accounts behind one NAT share an IP budget; a distributed attack can temporarily exhaust one account's budget. Neither a single identified client nor a single account blocks unrelated identities.

Only HMAC-SHA256 identifiers using RATE_LIMIT_SECRET, count and expiresAt persist. No raw IP/email is stored in RateLimit or logged by the limiter. Schedule npm run db:cleanup (for example hourly) to delete expired records. Fixed windows allow a burst across the boundary; this small-pilot policy is not a substitute for platform DDoS protection. Do not reset counters on every cold start.

## Runtime validation and CSP

server/env.ts is protected by server-only and returns typed validated configuration. API entry and lazy Prisma access validate without npm start; health uses the same validation. Startup preflight/instrumentation remain additional checks. No production secret fallback is allowed; only non-production RATE_LIMIT_SECRET can reuse AUTH_SECRET. Blockchain configuration is conditional on BLOCKCHAIN_ENABLED=true.

Production CSP has self-only default, no unsafe-eval, no framing, no plugins, and restricted base/form actions. Inline scripts/styles remain allowed for current Next hydration and inline styling; adopting nonces would require broader rendering changes and is deferred. QR images use data: images. HSTS is emitted only for production HTTPS configuration, without preload/includeSubDomains. Browser wallet extensions manage their own network connections; test any future external browser resource before adding its exact origin to CSP.

Local QA verifies production Next.js, PostgreSQL and HTTPS. It does not prove an actual Netlify deployment, external DB limits, real email delivery, provider backup restore or phone hardware. Complete the checks above on the deployed site.

References checked for this patch: [Netlify Next.js/OpenNext support, including after](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [Node build versions](https://docs.netlify.com/build/configure-builds/manage-dependencies/), [Functions runtime configuration](https://docs.netlify.com/build/functions/configuration/), [Next.js environment variables](https://nextjs.org/docs/pages/guides/environment-variables).


