# APROVUP V4.1.110 - Stage 2A: tenant-owned schema, no production migration

## What this release DOES
- Adds optional new tenant-owned records for issuer profile, connection metadata, customer billing options, charges, NFSe, verified webhook-event metadata and immutable-intent audit.
- Defines an AES-256-GCM encrypted envelope with associated authenticated agencyId and providerConnectionId. Tests use a fake key; real secrets are never collected by this release.
- Produces an **offline, review-only migration draft on Desktop**, not under prisma/migrations. It is not automatically deployed.
- Leaves existing FinanceEntry, recurring revenues, LIV commands, and UI behavior unchanged.

## What this release DOES NOT DO
- No production Prisma migration, `db push`, database backup/restore, bank or tax API calls, credential form, live invoice, webhook, charge or WhatsApp send.
- New tables do not yet exist in production; do NOT run Prisma queries on them until a reviewed migration is applied separately.
- An encryption field in a model does not imply real credentials are present. No plaintext secrets should ever be written to logs or metadata.

## Before first real migration
1. Back up production PostgreSQL using host-approved snapshot with tested restore strategy.
2. Review offline SQL draft and check unexpected DROP, ALTER existing tables or data updates.
3. Check that existing migrations are consistent with actual production `_prisma_migrations` state, including any baseline changes.
4. Require composite tenant-identity validations in server actions (`agencyId` from authenticated user) and check referenced Client/FinanceEntry/Connection all belong to same agency. Future composite FK hardening can add DB enforcement.
5. Build and run staging with test data, then schedule separately approved production migration.
6. Configure APROVUP_FINANCE_VAULT_KEY only via host secret storage; do not add it to `.env.example` with a value, GitHub, screenshots or chat. Create rotation/recovery instructions before live operations.
7. Audit confidentiality of `XML/PDF` keys, signed URLs and webhook payload hashes, with minimal data retention.
8. Only after migration and auth reviews, enable read-only agency fiscal setup; default all provider integrations to disabled.

## Caveats
- Links to existing FinanceEntry/Client/ProviderConnection use standard foreign keys. Cross-agency references must also be checked in every future authenticated write path; no external writes are enabled yet.
- Multi-municipality tax rules require fiscal verification. A generic NFSe provider interface is not equivalent to approved issuance in all municipalities.
