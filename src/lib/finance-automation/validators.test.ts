import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { ChargeDraft, InvoiceDraft, TenantContext } from "./contracts";
import { validateChargeDraft, validateInvoiceDraft, validateTenantContext } from "./validators";

const ctx: TenantContext = { actorAgencyId: "agency-a", resourceAgencyId: "agency-a", approvedByUserId: "director-a" };
const charge: ChargeDraft = {
  agencyId: "agency-a", financeEntryId: "entry-a", clientId: "client-a",
  amountCents: 250000, currency: "BRL", dueDate: "2026-11-15", idempotencyKey: "agency-a:charge:2026-11",
};
const invoice: InvoiceDraft = {
  agencyId: "agency-a", financeEntryId: "entry-a", clientId: "client-a",
  amountCents: 250000, currency: "BRL", municipalityIbgeCode: "2704302",
  serviceCode: "TEST-SERVICE", taxProfileApproved: true, idempotencyKey: "agency-a:invoice:2026-11",
};

test("validates authorized charge draft", () => assert.deepEqual(validateChargeDraft(ctx, charge), { ok: true }));
test("blocks cross-agency execution", () => {
  assert.equal(validateTenantContext({ ...ctx, resourceAgencyId: "agency-b" }, "agency-a").ok, false);
  assert.equal(validateChargeDraft(ctx, { ...charge, agencyId: "agency-b" }).ok, false);
});
test("requires explicit approval", () => assert.equal(validateChargeDraft({ ...ctx, approvedByUserId: null }, charge).ok, false));
test("refuses invalid financial amounts", () => {
  assert.equal(validateChargeDraft(ctx, { ...charge, amountCents: 0 }).ok, false);
  assert.equal(validateInvoiceDraft(ctx, { ...invoice, amountCents: 1.5 }).ok, false);
});
test("refuses nonexistent or malformed due dates", () => {
  assert.equal(validateChargeDraft(ctx, { ...charge, dueDate: "2026-02-30" }).ok, false);
  assert.equal(validateChargeDraft(ctx, { ...charge, dueDate: "14/10/2026" }).ok, false);
});
test("requires approved fiscal configuration", () => assert.equal(validateInvoiceDraft(ctx, { ...invoice, taxProfileApproved: false }).ok, false));
test("refuses missing service codes and municipality codes", () => {
  assert.equal(validateInvoiceDraft(ctx, { ...invoice, municipalityIbgeCode: "123" }).ok, false);
  assert.equal(validateInvoiceDraft(ctx, { ...invoice, serviceCode: "" }).ok, false);
});
test("refuses unreliable idempotency keys", () => assert.equal(validateInvoiceDraft(ctx, { ...invoice, idempotencyKey: "x" }).ok, false));
test("accepts complete validated invoice draft", () => assert.deepEqual(validateInvoiceDraft(ctx, invoice), { ok: true }));
