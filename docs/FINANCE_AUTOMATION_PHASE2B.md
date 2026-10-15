# APROVUP V4.1.114 - Phase 2B: fiscal onboarding preview

This release introduces a client-only fiscal onboarding preview under `/financas/cadastro-fiscal`.

- The route requires the existing `settings.manage` permission and authenticates server side.
- The browser does not choose the agency ID. No tax data are persisted, sent to server APIs or logged.
- CNPJ validator supports classic numeric and the 2026 alphanumeric CNPJ format (ASCII-48 check digits), **not** government registration, tax eligibility or authorization to issue NFSe.
- Municipality input checks only the seven-digit format, not existence/compatibility.
- Tax code and tax regime are **not** automatically certified. They require accountant/government confirmation.
- No new tables are queried, and the production migration is not applied.
- The current `/financas/integracoes` page remains informational.
- No payment provider or tax issuer is activated; no WhatsApp message, charge or NFS-e is sent.

## Migration blockers unchanged

The production `_prisma_migrations` history has 25 entries: 24 finished and 1 rolled-back attempt (the latter does not imply an extra missing migration). Five finished migrations have checksum mismatches with current disk contents. **Do not manually edit history or execute migrate deploy** until those mismatches are reconciled, a restore-tested backup exists and a staging trial is complete.

## Next phase

- Compare recorded checksums against historical Git file versions, separating line-ending rewrites from semantic content edits.
- Inspect full migration SQL, database drift, and cross-agency composite reference enforcement.
- Apply reviewed SQL to an isolated staging clone, not production.
- After successful tests and explicit authorization, perform controlled production migration and add authenticated agency-owned fiscal profile persistence.
