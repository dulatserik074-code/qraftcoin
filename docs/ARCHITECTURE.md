# v0.4 architecture additions

Current architecture is documented in README.md and FINAL_V04_REPORT.md. v0.4 adds PasswordReset, Invitation, User.authVersion and BusinessStaff.active. Token changes/session invalidation use locked PostgreSQL transactions; the existing Serializable ledger remains unchanged. Server owner/staff guards, email abstraction, env validation, health and structured logs are described in those current documents.

The following section records the v0.3 baseline:

# QazLoyal v0.3 architecture

## Boundaries

The original `/demo` and DemoRewardProvider remain ephemeral and do not import Prisma. The authenticated workspace uses `/api/*`, whose Node.js route delegates to authService, businessService, customerService, loyaltyService, transactionService and analyticsService. Business rules are server-side. The optional legacy blockchain module is unchanged and never participates in normal rewards.

## Identity and authorization

Registration always creates BUSINESS_OWNER; role, ownerId and balance fields are not accepted from the client. A request resolves an opaque HttpOnly session cookie to a database session and current User record. A Business is accessible only to its owner or an explicitly assigned BusinessStaff employee. CUSTOMER roles cannot use business routes. Every customer lookup includes the authenticated business scope; a global customer UUID or QR does not confer access.

Owners have one business in this MVP. BusinessStaff provides employee membership for multiple businesses, provisioned through a trusted administrative process. There is no public staff-provisioning endpoint or role-editing UI.

## Persistent ledger

LoyaltyTransaction is append-only. PostgreSQL rejects UPDATE/DELETE of ledger rows. Membership has unique businessId/customerId, and transactions have unique businessId/idempotencyKey. Serializable Prisma transactions check membership, detect completed replays, calculate points, create the ledger record and update balance/lifetime/purchase counters atomically. Write conflicts and concurrent idempotency uniqueness conflicts retry at most five times; failed writes do not create partial records.

Money is a decimal string at the HTTP boundary and bigint minor units in storage. Supported KZT/USD/EUR use two decimals. Reward BPS is an integer. Points are whole bigint units. JSON serializes bigint as strings. A requestHash represents canonical type/customer/amount/description, so altered payloads cannot reuse an idempotency key. Existing replays return the original calculation even if business rates have since changed.

EARN and REDEEM are implemented. Schema enums reserve BONUS, ADJUSTMENT and EXPIRE for later authorized services. Zero reward calculations produce no entry and do not contribute to purchase statistics. No fixed redemption-to-money exchange rate is implied.

## QR and scanning

BusinessCustomer.publicId is the scoping identifier encoded into a QR URL. The Customer model retains a separate qrCode UUID for future customer-level identity; it is not used as an access credential. `/scan` supports a manually entered ID or the application's QR link and verifies the membership against the current business. Device cameras can open QR links externally. A later camera decoder can feed the same value into this lookup without changing authorization or ledger logic.

## Future reward providers

The v0.2 RewardProvider interface remains for the demo. Production operations now require authenticated server requests, bigint precision and persistent transaction identities. A future settlement adapter belongs behind loyaltyService and must preserve this ledger. A new token must use explicit asset/version metadata and pending/confirmed reconciliation; historical QL Points must never be silently reinterpreted as legacy QFC/QFT.

## Operational limitations

No email verification, password recovery, customer-facing login, staff administration UI, campaign engine, automatic expiration or POS integration. Before a live pilot configure HTTPS, backups, monitoring, account support and privacy procedures. The provided integration database and development seed are not production data.

