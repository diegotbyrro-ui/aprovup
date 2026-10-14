/**
 * APROVUP Finance Automation V4.1.109 - provider-neutral contracts.
 * These types are NOT live integrations, credentials, or permission grants.
 */
export type ConnectorDomain = "PAYMENT" | "TAX";
export type ConnectorCategory =
  | "BANK_API"
  | "PAYMENT_PLATFORM"
  | "NATIONAL_NFSE"
  | "MUNICIPAL_NFSE"
  | "FISCAL_PLATFORM"
  | "ASSISTED_NFSE";
export type ConnectorCapability =
  | "CREATE_CHARGE"
  | "CANCEL_CHARGE"
  | "CHECK_CHARGE"
  | "VERIFY_WEBHOOK"
  | "ISSUE_NFSE"
  | "CHECK_NFSE"
  | "CANCEL_NFSE"
  | "PREPARE_NFSE";

/** Every provider context MUST be derived from the authenticated server session. */
export type TenantContext = {
  actorAgencyId: string;
  resourceAgencyId: string;
  approvedByUserId: string | null;
};

/** These are future storage metadata. Tokens and passwords must NEVER be returned. */
export type ConnectorMetadata = {
  agencyId: string;
  connectorId: string;
  category: ConnectorCategory;
  status: "DISABLED" | "PENDING_SETUP" | "CONNECTED" | "ERROR";
  credentialReference?: string;
};

export type ChargeDraft = {
  agencyId: string;
  financeEntryId: string;
  clientId: string;
  amountCents: number;
  currency: "BRL";
  dueDate: string; // yyyy-mm-dd, no time-zone conversion
  idempotencyKey: string;
};

export type ChargeResult = {
  providerReference: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "FAILED";
  paymentUrl?: string;
  boletoUrl?: string;
  pixPayload?: string;
};

/** Tax codes and tax withholding must be approved by each agency's accountant. */
export type InvoiceDraft = {
  agencyId: string;
  financeEntryId: string;
  clientId: string;
  amountCents: number;
  currency: "BRL";
  municipalityIbgeCode: string;
  serviceCode: string;
  taxProfileApproved: boolean;
  idempotencyKey: string;
};

export type InvoiceResult = {
  providerReference: string;
  status: "PROCESSING" | "AUTHORIZED" | "REJECTED" | "CANCELLED";
  documentNumber?: string;
  xmlUrl?: string;
  pdfUrl?: string;
};

/**
 * No implementations are shipped in phase 1. Each adapter is installed,
 * authenticated and tested in a separate, approved development phase.
 */
export interface PaymentConnector {
  readonly domain: "PAYMENT";
  readonly connectorId: string;
  createCharge(ctx: TenantContext, draft: ChargeDraft): Promise<ChargeResult>;
  checkCharge(ctx: TenantContext, providerReference: string): Promise<ChargeResult>;
  cancelCharge(ctx: TenantContext, providerReference: string): Promise<void>;
  verifyWebhook(rawPayload: Uint8Array, signature: string): Promise<boolean>;
}

export interface TaxConnector {
  readonly domain: "TAX";
  readonly connectorId: string;
  issueInvoice(ctx: TenantContext, draft: InvoiceDraft): Promise<InvoiceResult>;
  checkInvoice(ctx: TenantContext, providerReference: string): Promise<InvoiceResult>;
  cancelInvoice(ctx: TenantContext, providerReference: string, reason: string): Promise<InvoiceResult>;
}
