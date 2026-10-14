# APROVUP V4.1.109 - National finance and tax automation roadmap

## Current state (Phase 1)
- Existing `FinanceEntry` and customer monthly billing are preserved.
- Read-only dashboard at `/financas/integracoes`, director/settings permission required.
- Typed payment and tax provider contracts; no live connector is activated.
- Pure validators and tests for tenant boundaries, approval, amounts, dates, fiscal profile and idempotency key formatting.
- **No database migrations, charges, NFS-e emissions, WhatsApp messages, or persisted secrets in Phase 1.**

## Phase 2: Tenant-safe persistence (separate review / deployment)
- Add agency-owned billing configuration, tax issuer profile, provider connections, client billing preferences.
- Schema tables `agencyId` scoped, provider references unique *per tenant and provider*, immutable audit events.
- Encrypt access tokens/certificates using a server-side key; rotate and mask secrets; never log them.
- Review Prisma migration SQL and backups before applying to production. Deploy database migration before deploying reads of new tables.

## Phase 3: Payment connectors
- Define feature availability per institution; validate sandbox onboarding.
- Implement create / consult / cancel charges and verified webhooks.
- Ensure persistent idempotency with unique database constraints (not only a validated string).
- Reconcile official provider notifications with `FinanceEntry`; never set PAID based solely on a generated payment link.

## Phase 4: National tax connections
- Validate issuer's municipality, tax regime, credentials, authorization and permitted NFSe national/API availability.
- Add certified municipal or fiscal-aggregator adapters only when required.
- Support preparation-only fallback; never call preparation an issued invoice.
- Require accountant-approved service codes, applicable tax data and RPS/NFSe flow; store official authorization XML/PDF/status.

## Phase 5: LIV orchestration
- Require current user permissions, agency-scoped entity checks, action confirmation and audit logging.
- Keep manual approval as the default for issuance, cancellation and external messages.
- For recurring operations use approved limits and deduplicate executions.

## Phase 6: WhatsApp delivery
- Send approved utility templates through each agency's authorized WhatsApp account.
- Avoid sending invoices or payment demands without configured destination and appropriate opt-in.
- Maintain delivery logs and retries, no duplicate deliveries.

## Phase 7: Functional tests
- Cross-tenant attack tests, forged webhook, duplicate provider events, outages, cancellation, failed NFS-e, retries and partial failures.
- Test in sandbox then pilot with one agency and approved fiscal/bank setup.

## Phase 8: Controlled rollout
- Add agency self-service onboarding and provider-compatibility display.
- Staged feature flags and support processes, provider-specific rollout and versioned adapters.

Important: Cora is not a preferred provider for Level UP. APROVUP will never require every agency to use one bank or one municipality.
