# PostgreSQL backup and restore

Backups are not configured by this repository. The pilot operator must enable and verify them on the actual managed PostgreSQL service.

- Enable automated daily backups before pilot data is collected. A starting retention policy is 14 days; adjust with the business and applicable data requirements. Prefer point-in-time recovery when available and define acceptable data loss/recovery time with the owner.
- Use the provider console to locate the database backup/PITR settings, enable the chosen schedule/retention and record a successful completed backup. Exact controls depend on the chosen provider; none has been selected or activated here.
- Restrict backup access, encrypt backups and keep access credentials outside source. Ensure backups include the complete schema, migrations table, constraints/triggers and data. Avoid casual customer-data exports to developer laptops.

## Restore drill

1. Record the backup timestamp and expected recent transactions. Stop writes if responding to a real incident; do not overwrite the only database.
2. Restore the provider snapshot/PITR target into a NEW isolated PostgreSQL database. For operator-managed logical backups use compatible pg_dump/pg_restore tooling and a private connection configuration; never place passwords in shared command history.
3. Keep the restored instance private. Disable outbound email until its contents and environment are reviewed.
4. Check Prisma migration status, row counts, foreign keys, nonnegative balances and the append-only trigger. Do not re-run seed or db push.
5. Start a staging app against the restore and verify login, customer balances, history and a synthetic EARN/REDEEM with a known staging account. Confirm employee permissions and revoked access remain correct.
6. Record the measured restoration duration, restored time range and result. Test a restore before the pilot and periodically thereafter (for example monthly); a successful backup job alone is not proof of recoverability.
7. For a real cutover, have the operator approve the restored dataset, switch the app connection safely and monitor. Restore only through a documented incident process because recent writes may be absent from the selected backup.
