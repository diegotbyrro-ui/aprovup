import type { ChargeDraft, InvoiceDraft, TenantContext } from "./contracts";

export type DraftValidation = { ok: true } | { ok: false; reason: string };

function validDateOnly(input: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const [year, month, day] = input.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() + 1 === month && value.getUTCDate() === day;
}

/** UI must never supply a trusted tenant context. Authenticate on the server. */
export function validateTenantContext(ctx: TenantContext, agencyId: string): DraftValidation {
  if (!ctx.actorAgencyId || !ctx.resourceAgencyId || !agencyId) return { ok: false, reason: "MISSING_AGENCY" };
  if (ctx.actorAgencyId !== agencyId || ctx.resourceAgencyId !== agencyId) {
    return { ok: false, reason: "CROSS_AGENCY_BLOCKED" };
  }
  if (!ctx.approvedByUserId) return { ok: false, reason: "APPROVAL_REQUIRED" };
  return { ok: true };
}

function validCents(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function validIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9:_-]{8,128}$/.test(value);
}

export function validateChargeDraft(ctx: TenantContext, draft: ChargeDraft): DraftValidation {
  const agency = validateTenantContext(ctx, draft.agencyId);
  if (!agency.ok) return agency;
  if (!draft.financeEntryId?.trim() || !draft.clientId?.trim()) return { ok: false, reason: "MISSING_REFERENCE" };
  if (draft.currency !== "BRL" || !validCents(draft.amountCents)) return { ok: false, reason: "INVALID_AMOUNT" };
  if (!validDateOnly(draft.dueDate)) return { ok: false, reason: "INVALID_DUE_DATE" };
  if (!validIdempotencyKey(draft.idempotencyKey)) return { ok: false, reason: "INVALID_IDEMPOTENCY_KEY" };
  return { ok: true };
}

export function validateInvoiceDraft(ctx: TenantContext, draft: InvoiceDraft): DraftValidation {
  const agency = validateTenantContext(ctx, draft.agencyId);
  if (!agency.ok) return agency;
  if (!draft.taxProfileApproved) return { ok: false, reason: "TAX_PROFILE_NOT_APPROVED" };
  if (!draft.financeEntryId?.trim() || !draft.clientId?.trim()) return { ok: false, reason: "MISSING_REFERENCE" };
  if (draft.currency !== "BRL" || !validCents(draft.amountCents)) return { ok: false, reason: "INVALID_AMOUNT" };
  if (!/^\d{7}$/.test(draft.municipalityIbgeCode)) return { ok: false, reason: "INVALID_MUNICIPALITY" };
  if (!draft.serviceCode?.trim()) return { ok: false, reason: "MISSING_SERVICE_CODE" };
  if (!validIdempotencyKey(draft.idempotencyKey)) return { ok: false, reason: "INVALID_IDEMPOTENCY_KEY" };
  return { ok: true };
}
