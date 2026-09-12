# QazLoyal v0.4.1 environment

The complete application template is `frontend/.env.example`. Place real values in Netlify settings, never in Git. The template intentionally cannot start until secrets and actual hostnames are supplied.

| Category | Variables | Requirement |
| --- | --- | --- |
| Launch | NODE_ENV, NEXT_PUBLIC_APP_URL | production and actual HTTPS origin |
| Database | DATABASE_URL | Neon pooled URL in runtime; direct URL in migration process |
| Session and rate limits | AUTH_SECRET, RATE_LIMIT_SECRET | Independent random secrets, generated with 48 bytes each |
| Email | EMAIL_PROVIDER, EMAIL_FROM, EMAIL_API_KEY | Current validator requires Resend in production |
| Deployment safety | TRUSTED_PROXY, BLOCKCHAIN_ENABLED, ALLOW_DEV_SEED | netlify, false, false |
| Optional alias | APP_URL | If supplied, must match NEXT_PUBLIC_APP_URL |
| Optional legacy | NEXT_PUBLIC_LEGACY_QFC_ADDRESS, NEXT_PUBLIC_QFC_ADDRESS, NEXT_PUBLIC_QFT_ADDRESS, NEXT_PUBLIC_QRAFT_PAYMENT_ADDRESS, NEXT_PUBLIC_REQUIRED_CHAIN_ID, NEXT_PUBLIC_NETWORK_NAME, NEXT_PUBLIC_BLOCK_EXPLORER_URL, NEXT_PUBLIC_LEGACY_PAYMENT_CODE_HASH | Public legacy configuration; leave disabled |
| Local tests/seed only | TEST_DATABASE_URL, SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, SEED_EMPLOYEE_EMAIL, SEED_EMPLOYEE_PASSWORD | Never install in production |

NEXT_RUNTIME is supplied by Next.js, not a user secret. NODE_VERSION=22 is set in netlify.toml. Legacy root Hardhat tooling additionally reads SEPOLIA_RPC_URL, PRIVATE_KEY and TREASURY_ADDRESS; these are not needed by the pilot and must not be added to Netlify.

No database, session or email secret uses NEXT_PUBLIC_. Server configuration is protected by the server-only import. Registration/login do not send email, but the current global environment validator still requires email configuration. Do not substitute a fake production API key. The Resend onboarding sender is restricted to the provider account owner's recipient address until an owned sending domain is verified.

Migration procedure: supply the Neon direct URL as DATABASE_URL in a private process, then run `npx prisma migrate deploy` from frontend. Never run db:migrate, db:seed, db push or reset on production. Runtime DATABASE_URL remains pooled. No schema/history changes were required for this deployment.

Netlify uses base frontend, npm run build and .next with automatic OpenNext integration. These match the actual Next.js 15 application and its postinstall Prisma generation. No static export or manually pinned legacy adapter is required. Production runtime must still be verified after publication.

Official references checked 2026-09-12:
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- https://docs.netlify.com/build/configure-builds/monorepos/
