# Pilot checklist — STOP FEATURES after acceptance

Unchecked items require actual operator verification; this document is not evidence of external setup.

## Before pilot

- [ ] Production URL works over HTTPS; secure cookies confirmed.
- [ ] Managed PostgreSQL reachable; migrations applied; /api/health is OK.
- [ ] Backups enabled, retention recorded and restore tested.
- [ ] Real email provider and verified sender connected; reset/invitation delivery tested.
- [ ] Owner registration/login/logout and employee invitation/login work.
- [ ] Customer creation/search and tenant-scoped QR work.
- [ ] EARN and REDEEM work; retry does not duplicate operations.
- [ ] Reload, logout/login and app restart preserve balances/history.
- [ ] Owner can disable/restore staff access; foreign business requests fail.
- [ ] Mobile tested at 320/390 and on the actual cashier device; tablet/desktop checked.
- [ ] Monitoring and a human support/security contact assigned.
- [ ] Technical privacy inventory reviewed; required notices/consents reviewed for the jurisdiction.
- [ ] No demo/seed/QA data exists inside the real business.

## Pilot day

- [ ] Create the real business through onboarding; choose currency and rate.
- [ ] Invite the first employee; verify that employee can access only the assigned business.
- [ ] Add the first customers with only necessary contact information.
- [ ] Record a clearly identified test purchase and redemption according to the business's pilot process.
- [ ] Check balance, employee attribution and dashboard with the owner.

## During pilot

Track customers, returning customers, issued/redeemed QL Points, purchases and failures/errors. Keep a short feedback log: task attempted, outcome, time taken and user comments. The dashboard tracks rewarded purchases, not complete accounting or every retail sale.

After acceptance: STOP FEATURE DEVELOPMENT. Next version is determined by real business feedback and measured results. No NFT, staking, marketplace, new coin or unrelated modules.
