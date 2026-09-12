-- Identidade configuravel da Secretaria IA por agencia.
-- Campos nullable para manter compatibilidade com conexoes existentes.

ALTER TABLE "SecretaryWhatsappConnection"
ADD COLUMN "secretaryName" TEXT,
ADD COLUMN "secretaryCompanyName" TEXT;
