# Browser QA

Start the production app from frontend: npm run build, then npm start -- --hostname 127.0.0.1 --port 3107.

In another terminal from the repository root, install the optional QA-only dependency:

    npm install --prefix qa --no-save --package-lock=false playwright
    npx --prefix qa playwright install chromium
    node qa/browser-test.cjs

If Playwright is already supplied externally, set PLAYWRIGHT_MODULE to its absolute package path instead. These tools are not runtime application dependencies. The test writes screenshots and JSON results in this folder and checks only local session demo operations. It does not deploy contracts or access wallets.

home-rendered.html is a DOM snapshot for static analysis, not an offline standalone application. Inspect the running URL for functional testing.

## Persistent v0.3 acceptance

Start the production app against an isolated development database at http://localhost:3107 with NEXT_PUBLIC_APP_URL matching that origin. Run node qa/persistent-browser-test.cjs from the repository root (Playwright dependency setup above applies). The script creates synthetic accounts and reward records. It refuses non-local hostnames. Results/screenshots are written to qa/v03/. Never point the application under test at a pilot database. The older browser-test.cjs covers only /demo and the isolated legacy placeholder.

## Mobile transaction history

Run `node qa/mobile-history-test.cjs` against the production app at http://localhost:3107 (or set QA_BASE_URL). Use the Playwright setup above. The script intercepts only this browser context's API requests with synthetic response fixtures; it tests the real customer and transactions pages, not database/auth behavior. No database or account creation is needed for this script.

Coverage: 320/390 px cards, 768/1440 px tables, no mobile horizontal overflow, long names/email, large and signed values, missing/null fields, keyboard pagination, semantic HTML/ARIA snapshots, single representation in DOM, and mobile text contrast. Results and screenshots: `qa/mobile-history/`. Existing real PostgreSQL acceptance remains `qa/persistent-browser-test.cjs`.

## v0.4 production-like browser acceptance

Use a local HTTPS reverse proxy/certificate and start the built app with production environment validation enabled. Set QA_BASE_URL to the same HTTPS localhost origin. For a self-signed local certificate only, set QA_ALLOW_SELF_SIGNED=true. This changes the test browser, never production cookie settings.

`node qa/pilot-browser-test.cjs` verifies owner onboarding, persistence, staff invitations/access, attribution, direct API tenant isolation, reset/session invalidation, login rate limiting, health and 24 responsive cases. Required QA_OUTBOX_FILE and QA_STATE_FILE must point OUTSIDE the deliverable, e.g. a private work directory. State includes synthetic test credentials and must not be committed or zipped.

For entirely local mail capture, preload qa/local-mail-capture.cjs into the test application via Node --require/NODE_OPTIONS. It accepts only localhost app/DB, a *_dev database, synthetic @example.test recipients and EMAIL_API_KEY=qa-local-capture-no-real-provider-key. Configure EMAIL_PROVIDER=resend and EMAIL_FROM=qazloyal@example.test. The test double captures the adapter's outbound messages locally; it is not a production mail provider and does not prove delivery. Never load it in public deployment. Use forward slashes for Windows NODE_OPTIONS paths.

After a successful run, STOP the application process and start it again against the same DB. Run the script with QA_PHASE=restart and the same private QA_STATE_FILE to verify login and persisted balance/history. Keep the HTTPS proxy running during the application restart. A JSON restart result is written without credentials.

The v0.3-named persistent-browser-test.cjs remains a regression scenario and now follows v0.4 onboarding to the first customer. Use QA_BASE_URL/QA_ALLOW_SELF_SIGNED for it and mobile-history-test.cjs. browser-test.cjs covers public demo routes on local port 3107. Current v0.4 evidence is under qa/v04; baseline contains the untouched v0.3 audit results.


## v0.4.1 current validation

Current artifacts live in qa/v041 (pilot), qa/v041/persistent, qa/v041/mobile-history and qa/v041/demo. Earlier directory names above describe historical suites; this ZIP includes current results only.

Configure valid runtime environment and a local isolated PostgreSQL *_dev database; TEST_DATABASE_URL must end in *_test. Use Node 22. From frontend run npm ci, npm audit, npx prisma validate, npx prisma generate, npm run lint, npm run typecheck, npm test, npm run test:integration, npm run build. The test runner and seed command supply --conditions=react-server for server-only modules; never use that condition for browser builds. Unit tests need no live DB.

For production browser QA, terminate HTTPS locally with a test certificate and forward to a loopback Next server. Set TRUSTED_PROXY=trusted-proxy and have that proxy overwrite X-Real-IP from the socket peer. Set QA_BASE_URL and QA_ALLOW_SELF_SIGNED=true, plus private QA_OUTBOX_FILE/QA_STATE_FILE outside the repository. Preload qa/local-mail-capture.cjs only for the local synthetic-email run. Run pilot-browser-test.cjs, persistent-browser-test.cjs, mobile-history-test.cjs and browser-test.cjs. No real email is sent by the capture adapter.

qa/security-http.cjs additionally requires QA_INTERNAL_URL=http://127.0.0.1:PORT for a controlled loopback backend and TRUSTED_PROXY=trusted-proxy. It simulates independent proxy IP headers, checks 429/Retry-After and health headers. qa/runtime-env-check.cjs starts the built app directly on ports 3460–3462 with missing variables; qa/startup-check.cjs checks standalone startup refusal. Do not point these synthetic account-creation tests at a production database. Re-run deployment smoke checks on the actual provider; local proxy simulation does not prove Netlify edge sanitization.
