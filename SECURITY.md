# Security

## Reporting

Before a real pilot, the operator must designate a private security/support contact and share it with the business. This repository does not invent a working mailbox. Use the designated private channel or, if the eventual repository host has private vulnerability reporting enabled, its private report feature. Do not publish exploit details or real customer data publicly before a fix is coordinated. Include affected version, minimal reproduction using synthetic data and impact; never send passwords, tokens or database credentials.

## Implemented safeguards

- PostgreSQL + Prisma with server-side tenant checks and active staff membership.
- Serializable EARN/REDEEM, integer money/BPS, unique idempotency keys, nonnegative checks and append-only ledger trigger.
- Bcrypt passwords, hashed session tokens, production Secure/HttpOnly/SameSite cookies, rotation on login and all-session invalidation on password reset.
- Hashed expiring single-use password reset and invitation tokens; invitation email/account binding; owner-only team controls.
- Exact Origin/JSON/size validation, strict input schemas and persistent auth rate limiting.
- Production env validation; safe health output; sanitized API errors and allowlisted structured events.
- Random public QR identifiers still require authorized business access.

These safeguards are tested locally and are not a claim of independent security certification. Hosting, database access, secret rotation, backups, email sender setup and incident response must be configured by the operator. Use a least-privilege runtime DB role so an application credential cannot alter schema or disable ledger triggers. Rotate AUTH_SECRET to invalidate session-token digests if required after an incident; rotate compromised provider/database credentials through the operator procedure.

QFC/QFT is an experimental optional blockchain module, separate from QL Points. No mainnet or investment guarantee is implied. Preserve its existing contract/bytecode validation. Do not use real signing keys in source or test archives.

## Scope freeze

After v0.4 pilot acceptance, fix confirmed defects and gather business feedback. Do not expand features before the pilot demonstrates a need.
