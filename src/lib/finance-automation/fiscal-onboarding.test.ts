import { test } from "node:test";
import { strict as assert } from "node:assert";
import { normalizeFiscalOnboardingDraft, validateCnpjCheckDigits, validateFiscalOnboardingDraft, type FiscalOnboardingDraft } from "./fiscal-onboarding";

const example: FiscalOnboardingDraft = {
  legalName: "Empresa de Exemplo LTDA",
  cnpj: "11.222.333/0001-81", // synthetic standard-check-digit example
  municipalRegistration: "123-45",
  municipalityIbgeCode: "2704302", // Maceio IBGE code, not a fiscal integration commitment
  stateCode: "AL",
  taxRegime: "SIMPLES_NACIONAL",
  serviceCode: "01.07",
  serviceDescription: "Servicos de marketing digital",
};

test("rejects all-equal and malformed CNPJ", () => {
  assert.equal(validateCnpjCheckDigits("00.000.000/0000-00"), false);
  assert.equal(validateCnpjCheckDigits("123"), false);
});
test("accepts a valid numeric CNPJ checksum", () => assert.equal(validateCnpjCheckDigits(example.cnpj), true));
test("accepts Receita Federal alphanumeric format", () => assert.equal(validateCnpjCheckDigits("00.000.000/E08G-12"), true));
test("rejects invalid alphanumeric check digits", () => assert.equal(validateCnpjCheckDigits("00.000.000/E08G-13"), false));
test("accepts properly filled preliminary draft", () => assert.deepEqual(validateFiscalOnboardingDraft(example), {}));
test("rejects missing municipality", () => assert.equal(validateFiscalOnboardingDraft({ ...example, municipalityIbgeCode: "270" }).municipalityIbgeCode, "INVALID_IBGE_CODE"));
test("rejects invalid state", () => assert.equal(validateFiscalOnboardingDraft({ ...example, stateCode: "XX" }).stateCode, "INVALID_STATE"));
test("rejects arbitrary tax regime", () => assert.equal(validateFiscalOnboardingDraft({ ...example, taxRegime: "QUALQUER" }).taxRegime, "INVALID_TAX_REGIME"));
test("rejects empty service code", () => assert.equal(validateFiscalOnboardingDraft({ ...example, serviceCode: " " }).serviceCode, "INVALID_SERVICE_CODE"));
test("rejects missing description", () => assert.equal(validateFiscalOnboardingDraft({ ...example, serviceDescription: "short" }).serviceDescription, "INVALID_SERVICE_DESCRIPTION"));
test("rejects invalid registration characters", () => assert.equal(validateFiscalOnboardingDraft({ ...example, municipalRegistration: "123;DROP" }).municipalRegistration, "INVALID_MUNICIPAL_REGISTRATION"));
test("normalizes without changing input", () => {
  const original = { ...example, cnpj: " 11.222.333/0001-81 ", stateCode: "al " };
  const result = normalizeFiscalOnboardingDraft(original);
  assert.equal(result.cnpj, "11222333000181");
  assert.equal(result.stateCode, "AL");
  assert.equal(original.stateCode, "al ");
});
