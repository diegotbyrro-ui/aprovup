# APROVUP V4.1.116A - Composite tenant references (schema only)

## Changes

- Client, FinanceEntry and AgencyFinanceConnection now expose `@@unique([id, agencyId])` so that new financial tables may reference composite tenant keys.
- AgencyClientBillingProfile.client now references `(Client.id, Client.agencyId)`.
- AgencyCharge.financeEntry, .providerConnection, and its optional .client all reference `(id, agencyId)`.
- AgencyFiscalDocument.financeEntry, its optional .providerConnection, and optional .client all reference `(id, agencyId)`.
- AgencyFinanceWebhookEvent.providerConnection now references `(id, agencyId)`.
- The existing Client.agencyId stays nullable for legacy content. A client without agency ownership cannot be used as a new agency billing target with a composite FK.
- No changes to existing FinanceEntry.client relation or historical migration files.

## Security limits and next actions

- NO PRODUCTION DATABASE MIGRATION. The new composite constraints do not protect the database until an approved migration is applied. UI onboarding still validates locally and does not persist anything.
- Server writes must independently derive agencyId from authenticated session, enforce permissions and verify all referenced entities belong to that agency. DB constraints are defense-in-depth, not authentication.
- `Client.agencyId` is optional and legacy finance entries can have historic cross-agency or null ownership. Audit existing references before enforcing changes to existing tables.
- The reviewed SQL draft must be assessed against real PostgreSQL schema drift; Prisma schema-to-schema diff alone does not prove deploy safety.
- The Prisma schema does not natively support CHECK constraints or immutable audit-table guarantees here. Add reviewed `amountCents > 0` checks and append-only audit protections to a future migration, and test them in staging.
- Confirm a restorable production backup, test restore, isolated staging, and production rollback plan before any migration deploy.
- Do not enable charges, provider credentials, webhooks, NFS-e issuance, or LIV sends in this release.
- Older migrations with line-ending-only checksum mismatches must not be rewritten or marked resolved just to silence warnings.

## Offline SQL

This version produces an offline review-only SQL draft in a Desktop audit folder by comparing the last production-compatible schema baseline at commit `1895bf1590b7867209e11baa6a2d404b273aa805` to the hardened schema. It creates no files under `prisma/migrations`. It is not executed or published to production.
