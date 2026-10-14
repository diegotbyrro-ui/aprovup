import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** V4.1.110: server-side building block ONLY. No API or form stores secrets yet. */
export type FinanceVaultContext = { agencyId: string; providerConnectionId: string };

function key(): Buffer {
  const value = process.env.APROVUP_FINANCE_VAULT_KEY || "";
  if (value.length < 32) throw new Error("FINANCE_VAULT_NOT_CONFIGURED");
  return createHash("sha256").update("APROVUP_FINANCE_VAULT_V1:").update(value).digest();
}

function aad(context: FinanceVaultContext): Buffer {
  if (!context.agencyId.trim() || !context.providerConnectionId.trim()) {
    throw new Error("FINANCE_VAULT_INVALID_CONTEXT");
  }
  return Buffer.from(`${context.agencyId}::${context.providerConnectionId}`, "utf8");
}

export function encryptFinanceCredential(secret: string, context: FinanceVaultContext): string {
  if (!secret || typeof secret !== "string") throw new Error("FINANCE_VAULT_EMPTY_SECRET");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(aad(context));
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptFinanceCredential(envelope: string, context: FinanceVaultContext): string {
  const pieces = envelope.split(".");
  if (pieces.length !== 4 || pieces[0] !== "v1" || pieces.slice(1).some(s => !s)) {
    throw new Error("FINANCE_VAULT_INVALID_ENVELOPE");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(pieces[1], "base64url"));
  decipher.setAAD(aad(context));
  decipher.setAuthTag(Buffer.from(pieces[2], "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(pieces[3], "base64url")), decipher.final()]).toString("utf8");
}
