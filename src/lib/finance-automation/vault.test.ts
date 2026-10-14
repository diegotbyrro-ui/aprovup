import test from "node:test";
import assert from "node:assert/strict";
import { encryptFinanceCredential, decryptFinanceCredential } from "./vault";

const context = { agencyId: "agency_test_one", providerConnectionId: "connector_001" };
const original = process.env.APROVUP_FINANCE_VAULT_KEY;

test("finance vault: fail closed when key is missing", () => {
  delete process.env.APROVUP_FINANCE_VAULT_KEY;
  assert.throws(() => encryptFinanceCredential("not-a-real-token", context), /FINANCE_VAULT_NOT_CONFIGURED/);
});

test("finance vault: reversible encryption with correct agency and connector", () => {
  process.env.APROVUP_FINANCE_VAULT_KEY = "local-test-value-never-use-for-production-32-bytes";
  const box = encryptFinanceCredential("dummy-sandbox-credential", context);
  assert.equal(decryptFinanceCredential(box, context), "dummy-sandbox-credential");
  assert.ok(!box.includes("dummy-sandbox-credential"));
});

test("finance vault: cross-agency ciphertext copy fails", () => {
  process.env.APROVUP_FINANCE_VAULT_KEY = "local-test-value-never-use-for-production-32-bytes";
  const box = encryptFinanceCredential("dummy-sandbox-credential", context);
  assert.throws(() => decryptFinanceCredential(box, { ...context, agencyId: "agency_test_two" }));
});

test("finance vault: cross-connector ciphertext copy fails", () => {
  process.env.APROVUP_FINANCE_VAULT_KEY = "local-test-value-never-use-for-production-32-bytes";
  const box = encryptFinanceCredential("dummy-sandbox-credential", context);
  assert.throws(() => decryptFinanceCredential(box, { ...context, providerConnectionId: "connector_002" }));
});

test("finance vault: invalid envelopes rejected", () => {
  process.env.APROVUP_FINANCE_VAULT_KEY = "local-test-value-never-use-for-production-32-bytes";
  assert.throws(() => decryptFinanceCredential("not-encrypted", context), /FINANCE_VAULT_INVALID_ENVELOPE/);
});

test.after(() => {
  if (original === undefined) delete process.env.APROVUP_FINANCE_VAULT_KEY;
  else process.env.APROVUP_FINANCE_VAULT_KEY = original;
});
