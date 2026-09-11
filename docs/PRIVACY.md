# Technical privacy inventory

This is a technical inventory, not a legal privacy policy.

Stored data: account email and password hash; business name/description/currency/reward rate; employee membership status and invitation email/timestamps; customer name and optional phone/email; loyalty transaction amount/points/time and processing user; random public customer membership IDs; session digests and expiration; hashed reset/invitation tokens; hashed rate-limit keys.

Email provider receives the intended account email and action-link message. Server event logs contain generated request IDs, event category and relevant internal actor/business/transaction IDs. Do not add passwords, raw tokens, request bodies or credentials to logs. Protect provider logs and application logs with access controls and a defined retention policy.

Do not collect payment card data, identity documents, birth dates, precise location or additional customer attributes without a demonstrated need and review. QR contains a random public identifier/business UUID, not contact information or an access credential.

Restrict access to the business's authorized owner/staff. Disabling an employee retains past transaction attribution. Loyalty ledger is append-only; account/customer data removal and retention requests require an operator procedure that preserves accounting integrity and handles personal information appropriately. This MVP does not claim to implement a complete erasure/export workflow.

Before public commercial launch, obtain jurisdiction-appropriate legal review of privacy notices/personal-data requirements and any necessary consent, retention and data-subject request procedures. Set the real contact details and operational policy before collecting live customer data. No legal compliance certification is asserted.
