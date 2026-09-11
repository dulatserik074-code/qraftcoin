# FINAL_V041_REPORT

## Version

QazLoyal v0.4.1 — Security & Netlify Patch. Проверено 11 сентября 2026 года на Node.js 22.23.2, Next.js 15.5.25, Prisma 6.19.0 и отдельном локальном PostgreSQL 16.15. Основа — стабильный qazloyal-v0.4-pilot-ready.zip. Публичный deployment не выполнялся.

## Fixed

- Auth rate limiting: общий global-auth удалён; PostgreSQL atomic counters по доверенному IP и нормализованному email, HMAC-ключи, HTTP 429 и Retry-After.
- Netlify runtime env validation: server-only typed config проверяется при API/Prisma доступе независимо от npm start. При неполной конфигурации health отвечает безопасным JSON 503, auth — generic 500. Standalone startup отклоняет конфигурацию с exit 1.
- Password reset timing hardening: token/hash создаются для обеих веток, неизвестный email также проходит DB transaction; обычная разница DB-пути сглажена минимумом 350–449 мс. Отправка письма через Next after не задерживает HTTP-ответ.
- Security headers/CSP: self default, запрет framing/plugins, base/form restrictions, без production unsafe-eval; nosniff, no-referrer, Permissions-Policy и HSTS для production HTTPS.

## Rate limiting

| Операция | IP | Дополнительный identifier | Окно |
|---|---:|---:|---|
| Login | 60 | 10/email | 5 минут |
| Register | 20 | — | 15 минут |
| Reset request | 30 | 5/email | 15 минут |
| Reset completion | 30 | 5/token | 15 минут |
| Invitation acceptance | 30 | прежние 5/token | 15 минут |

Приглашения от авторизованного owner сохраняют прежние 30/business за 15 минут. Email trim/lowercase. Входы с правильным паролем также учитываются. Окна фиксированные, счётчик увеличивается атомарно в общей PostgreSQL и работает между serverless instances. Raw IP/email в RateLimit не сохраняются: HMAC-SHA256 с RATE_LIMIT_SECRET, count, expiresAt. Expired records удаляются существующим db:cleanup.

getTrustedClientIp доверяет x-nf-client-connection-ip только при TRUSTED_PROXY=netlify. Для другого провайдера предусмотрен TRUSTED_PROXY=trusted-proxy с X-Real-IP при закрытом origin и обязательной замене header прокси. X-Forwarded-For игнорируется. Некорректный/отсутствующий IP попадает в отдельный unresolved-client bucket; определённые IP от него независимы. IPv4-mapped IPv6 и разные записи одного IPv6 нормализуются.

Ответ блокировки одинаковый: Too many attempts. Please try again later. HTTP 429, Retry-After в секундах; внутренних ключей/счётчиков нет. Reset для известного/неизвестного email возвращает одинаковый текст и одинаковые лимиты.

## Netlify readiness

Минимальный netlify.toml задаёт frontend base, npm run build, .next и Node 22. Документация docs/DEPLOYMENT.md содержит Netlify Free Pilot Deployment: GitHub import, Builds/Functions env scopes, Node runtime, managed PostgreSQL/pooling, отдельный migration job, HTTPS/health/login/EARN/REDEEM/reset/persistence.

Node API catch-all и dynamic customer/legacy routes собираются; session cookies проверены через HTTPS. Один PrismaClient на тёплый production module, development singleton, lazy validated DATABASE_URL. Prisma schema и все 4 миграции неизменны; миграции применены к отдельным чистым QA-базам. Никакого vendor SDK, filesystem DB или миграций при каждом cold start.

Поддержка OpenNext/after сверена с официальной документацией Netlify. Реальный Netlify function bundle и production edge здесь не развёрнуты; live header provenance, email delivery и managed DB capacity проверяются при deployment.

## Security

Production требует PostgreSQL DATABASE_URL, AUTH_SECRET, RATE_LIMIT_SECRET, HTTPS app origin, NODE_ENV и Resend configuration. APP_URL при задании совпадает с NEXT_PUBLIC_APP_URL. Blockchain variables не требуются при BLOCKCHAIN_ENABLED=false. Нет production fallback secrets. server/env.ts, DB и IP/rate modules защищены server-only; CLI unit/integration/seed используют server condition.

По SHA-256 совпали 46 защищённых файлов: contracts, Prisma schema/seed/migrations, business/employee/customer/transaction/loyalty services, input/tokens, UI и legacy/demo библиотеки. Ledger, tenant isolation, idempotency, concurrent redeem, приглашения, QR permissions и mobile layout сохранены.

Финальный scan исходников/QA и 39 собранных client assets не обнаружил фактические AUTH/RATE secrets, пароль QA-базы, captured reset/invitation tokens, private env files, PEM private keys или public secret declarations. Синтетические fixtures в исходниках тестов не являются production credentials. Приватная база, mail outbox, browser state, TLS private key и test-env остаются вне ZIP.

## Tests

| Проверка | Результат |
|---|---|
| node --version | v22.23.2 |
| Frontend npm ci | PASS, 384 installed packages |
| Frontend npm audit | PASS, 0 vulnerabilities |
| npx prisma validate / generate | PASS |
| PostgreSQL migrations | PASS, 4 неизменённые миграции |
| npm run lint / typecheck | PASS |
| Frontend unit/security | 26/26 PASS, skipped 0 |
| PostgreSQL integration/security | 31/31 PASS, skipped 0 |
| Hardhat regression | 18/18 PASS, contracts не изменены |
| Root Hardhat npm audit | FAIL: 37 dev-tool vulnerabilities: 14 low, 7 moderate, 16 high |
| Real HTTP rate/security | PASS: IP/email/register isolation, spoofed XFF, reset, 429/Retry-After, headers/health |
| Direct Next startup без AUTH_SECRET / DATABASE_URL / RATE_LIMIT_SECRET | PASS: safe health 503, auth 500 без npm start |
| npm start missing AUTH_SECRET | PASS: exit 1 |
| Pilot browser | PASS: owner/employee, isolation, reset, secure cookies, 24 viewport checks |
| Persistent browser | PASS: HTTP tenant isolation, EARN/REDEEM, concurrent idempotency |
| Mobile history browser | PASS: 8 responsive cases, 767/768 switch, keyboard/semantic checks |
| Demo browser | PASS: navigation/rewards, no console/network errors |
| Реальный app/DB restart | PASS: login, 800 QL Points и 4 ledger entries сохранены |
| Реальная DB outage/recovery | PASS: health 200 → 503 → 200 |
| Development seed / cleanup | PASS |
| Protected scope / secret scan | PASS |

75 уникальных unit/integration/contract tests; повторные запуски не увеличивают число. Все финальные журналы и browser JSON/screenshots находятся в qa/v041. Старые QA-журналы не включены как результаты патча. Визуально просмотрены mobile employees и customer/history screenshots.

Первые проверки обнаружили ошибки типов/изоляции env fixture в новых тестах и вмешательство instrumentation в health error response. Исправлены причины, assertions не ослаблены, тесты не отключались. Финальные lint/typecheck/unit, runtime-env, build и browser checks прошли. Журналы начальных test failures сохранены отдельно и помечены именами initial-failure.

## Build

PASS — production Next.js build, включая Node API и dynamic routes. Финальный runtime и browser QA выполнены на сборке с исправленным instrumentation.

## Remaining limitations

- Root legacy Hardhat dev tooling имеет 37 audit findings, включая 16 high. Это отдельное дерево devDependencies, которое Netlify frontend build не устанавливает. Автоматический полный fix предлагает breaking migration на Hardhat 3; в security patch он не выполнен. Root audit не объявляется PASS. Frontend runtime dependency tree: 0 audit findings.
- Netlify hosting, реальные env, внешний managed PostgreSQL, sender/domain, доставляемость email, backups/restore и monitoring требуют настройки и live smoke checks. Free-планы/квоты зависят от провайдера.
- CSP пока допускает unsafe-inline для Next hydration и текущих styles; nonce migration не включена. unsafe-eval в production отсутствует.
- Нельзя запускать публичный pilot с постоянным unresolved-client fallback: такие запросы делят bucket. Корректно настройте trusted proxy; один NAT делит IP budget. Fixed windows допускают burst на границе, распределённая атака может временно исчерпать лимит конкретного email. Платформенная DDoS-защита остаётся внешней.
- Reset padding сглаживает обычные задержки, но не гарантирует одинаковое время при перегрузке DB. Next after поддерживает serverless lifecycle, но не является durable mail queue; контролируйте email_failed. В локальных финальных HTTP samples known: 407–475 мс, unknown: 412–460 мс.
- Browser QA — Chromium с viewport emulation; реальные телефоны, screen readers, независимый security audit и реальный Netlify edge не проверены.

STOP DEVELOPMENT. v0.5 и новые бизнес-функции не добавлены. Следующий этап — deployment и реальный Pilot.
