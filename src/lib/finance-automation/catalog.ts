import type { ConnectorCapability, ConnectorCategory, ConnectorDomain } from "./contracts";

export type ConnectorBlueprint = {
  id: string;
  domain: ConnectorDomain;
  category: ConnectorCategory;
  titlePt: string;
  titleEn: string;
  detailPt: string;
  detailEn: string;
  potentialCapabilities: readonly ConnectorCapability[];
  /** Catalog entries are PLANNED, not available connections. */
  availability: "PLANNED";
};

/** Generic categories; no agency or bank is forced to use a specific vendor. */
export const FINANCE_CONNECTOR_BLUEPRINTS: readonly ConnectorBlueprint[] = [
  {
    id: "bank-api",
    domain: "PAYMENT",
    category: "BANK_API",
    titlePt: "API de bancos",
    titleEn: "Bank APIs",
    detailPt: "Cada agencia podera conectar um banco com API homologada.",
    detailEn: "Each agency will be able to connect a supported bank API.",
    potentialCapabilities: ["CREATE_CHARGE", "CHECK_CHARGE", "CANCEL_CHARGE", "VERIFY_WEBHOOK"],
    availability: "PLANNED",
  },
  {
    id: "payment-platform",
    domain: "PAYMENT",
    category: "PAYMENT_PLATFORM",
    titlePt: "Plataformas de cobranca",
    titleEn: "Payment platforms",
    detailPt: "Boletos e Pix usando provedores de pagamento independentes.",
    detailEn: "Boleto and Pix through independent payment providers.",
    potentialCapabilities: ["CREATE_CHARGE", "CHECK_CHARGE", "CANCEL_CHARGE", "VERIFY_WEBHOOK"],
    availability: "PLANNED",
  },
  {
    id: "national-nfse",
    domain: "TAX",
    category: "NATIONAL_NFSE",
    titlePt: "NFS-e Nacional",
    titleEn: "National service invoices",
    detailPt: "Conector para o padrao nacional, conforme habilitacao da empresa.",
    detailEn: "National service invoice connector, subject to issuer eligibility.",
    potentialCapabilities: ["ISSUE_NFSE", "CHECK_NFSE", "CANCEL_NFSE"],
    availability: "PLANNED",
  },
  {
    id: "municipal-nfse",
    domain: "TAX",
    category: "MUNICIPAL_NFSE",
    titlePt: "Provedores municipais",
    titleEn: "Municipal tax systems",
    detailPt: "Adaptadores por municipio, quando exigidos e disponiveis.",
    detailEn: "Municipal adapters where required and available.",
    potentialCapabilities: ["ISSUE_NFSE", "CHECK_NFSE", "CANCEL_NFSE"],
    availability: "PLANNED",
  },
  {
    id: "fiscal-platform",
    domain: "TAX",
    category: "FISCAL_PLATFORM",
    titlePt: "Plataformas fiscais",
    titleEn: "Tax service providers",
    detailPt: "APIs de emissores terceiros compativeis com cada municipio.",
    detailEn: "Third-party issuer APIs compatible with each municipality.",
    potentialCapabilities: ["ISSUE_NFSE", "CHECK_NFSE", "CANCEL_NFSE"],
    availability: "PLANNED",
  },
  {
    id: "assisted-nfse",
    domain: "TAX",
    category: "ASSISTED_NFSE",
    titlePt: "Emissao assistida",
    titleEn: "Assisted invoice preparation",
    detailPt: "Prepara dados, sem afirmar que uma NFS-e foi emitida.",
    detailEn: "Prepares fields without claiming the invoice was issued.",
    potentialCapabilities: ["PREPARE_NFSE"],
    availability: "PLANNED",
  },
] as const;
