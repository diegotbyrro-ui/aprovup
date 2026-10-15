/**
 * APROVUP V4.1.114 - Fiscal onboarding DRAFT validation.
 * This module does not persist tax information, submit RPS, or enable connectors.
 * Tax parameters must be reviewed by an accountant before fiscal issuance.
 */
export const FISCAL_TAX_REGIMES = [
  "SIMPLES_NACIONAL",
  "MEI",
  "LUCRO_PRESUMIDO",
  "LUCRO_REAL",
  "OUTRO",
] as const;

export type FiscalTaxRegime = (typeof FISCAL_TAX_REGIMES)[number];

export type FiscalOnboardingDraft = {
  legalName: string;
  cnpj: string;
  municipalRegistration: string;
  municipalityIbgeCode: string;
  stateCode: string;
  taxRegime: string;
  serviceCode: string;
  serviceDescription: string;
};

export type FiscalDraftField = keyof FiscalOnboardingDraft;
export type FiscalDraftErrors = Partial<Record<FiscalDraftField, string>>;

const VALID_STATES = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
]);

/** Supports numeric and 2026 alphanumeric CNPJ using Receita Federal ASCII-48 check digits.
 * This does not verify government registration or issuance eligibility. */
export function validateCnpjCheckDigits(value: string): boolean {
  const raw = value.toUpperCase().replace(/[.\/\-\s]/g, "");
  if (!/^[A-Z0-9]{12}\d{2}$/.test(raw) || /^(.)\1{13}$/.test(raw)) return false;
  const check = (length: number): number => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += (raw.charCodeAt(i) - 48) * weights[i];
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return Number(raw[12]) === check(12) && Number(raw[13]) === check(13);
}

/** No agencyId is accepted from the browser: tenant identity comes from server session. */
export function validateFiscalOnboardingDraft(input: FiscalOnboardingDraft): FiscalDraftErrors {
  const errors: FiscalDraftErrors = {};
  if (input.legalName.trim().length < 3 || input.legalName.trim().length > 200) errors.legalName = "INVALID_LEGAL_NAME";
  if (!validateCnpjCheckDigits(input.cnpj)) errors.cnpj = "INVALID_CNPJ";
  const registration = input.municipalRegistration.trim();
  if (registration.length > 40 || (registration && !/^[A-Za-z0-9.\/-]+$/.test(registration))) errors.municipalRegistration = "INVALID_MUNICIPAL_REGISTRATION";
  if (!/^\d{7}$/.test(input.municipalityIbgeCode.trim())) errors.municipalityIbgeCode = "INVALID_IBGE_CODE";
  if (!VALID_STATES.has(input.stateCode.trim().toUpperCase())) errors.stateCode = "INVALID_STATE";
  if (!FISCAL_TAX_REGIMES.includes(input.taxRegime as FiscalTaxRegime)) errors.taxRegime = "INVALID_TAX_REGIME";
  const serviceCode = input.serviceCode.trim();
  if (!serviceCode || serviceCode.length > 40 || !/^[\w.\/-]+$/.test(serviceCode)) errors.serviceCode = "INVALID_SERVICE_CODE";
  const description = input.serviceDescription.trim();
  if (description.length < 8 || description.length > 1000) errors.serviceDescription = "INVALID_SERVICE_DESCRIPTION";
  return errors;
}

export function normalizeFiscalOnboardingDraft(input: FiscalOnboardingDraft): FiscalOnboardingDraft {
  return {
    legalName: input.legalName.trim(),
    cnpj: input.cnpj.toUpperCase().replace(/[.\/\-\s]/g, ""),
    municipalRegistration: input.municipalRegistration.trim(),
    municipalityIbgeCode: input.municipalityIbgeCode.trim(),
    stateCode: input.stateCode.trim().toUpperCase(),
    taxRegime: input.taxRegime,
    serviceCode: input.serviceCode.trim(),
    serviceDescription: input.serviceDescription.trim(),
  };
}
