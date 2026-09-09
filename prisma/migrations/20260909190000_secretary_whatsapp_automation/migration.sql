-- Secretária IA: canal WhatsApp, membros autorizados, eventos e entregas.

CREATE TABLE "SecretaryWhatsappConnection" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "wabaId" TEXT,
    "phoneNumberId" TEXT,
    "displayPhoneNumber" TEXT,
    "encryptedAccessToken" TEXT,
    "encryptedVerifyToken" TEXT,
    "graphVersion" TEXT NOT NULL DEFAULT 'v26.0',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "proactiveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "alertTemplateName" TEXT,
    "alertTemplateLanguage" TEXT NOT NULL DEFAULT 'pt_BR',
    "connectedAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretaryWhatsappConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecretaryWhatsappMember" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT,
    "phoneE164" TEXT NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "canUseSecretary" BOOLEAN NOT NULL DEFAULT true,
    "canConfirmActions" BOOLEAN NOT NULL DEFAULT false,
    "receiveAlerts" BOOLEAN NOT NULL DEFAULT false,
    "lastInboundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretaryWhatsappMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecretaryWhatsappEvent" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "fromPhone" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "transcript" TEXT,
    "responseMessageId" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretaryWhatsappEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecretaryWhatsappDelivery" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "memberId" TEXT,
    "alertId" TEXT,
    "toPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "templateUsed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretaryWhatsappDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SecretaryWhatsappConnection_agencyId_key"
ON "SecretaryWhatsappConnection"("agencyId");

CREATE UNIQUE INDEX "SecretaryWhatsappConnection_phoneNumberId_key"
ON "SecretaryWhatsappConnection"("phoneNumberId");

CREATE UNIQUE INDEX "SecretaryWhatsappMember_agencyId_phoneE164_key"
ON "SecretaryWhatsappMember"("agencyId", "phoneE164");

CREATE INDEX "SecretaryWhatsappMember_agencyId_userId_idx"
ON "SecretaryWhatsappMember"("agencyId", "userId");

CREATE INDEX "SecretaryWhatsappMember_agencyId_receiveAlerts_idx"
ON "SecretaryWhatsappMember"("agencyId", "receiveAlerts");

CREATE UNIQUE INDEX "SecretaryWhatsappEvent_providerMessageId_key"
ON "SecretaryWhatsappEvent"("providerMessageId");

CREATE INDEX "SecretaryWhatsappEvent_agencyId_status_createdAt_idx"
ON "SecretaryWhatsappEvent"("agencyId", "status", "createdAt");

CREATE UNIQUE INDEX "SecretaryWhatsappDelivery_agencyId_dedupKey_key"
ON "SecretaryWhatsappDelivery"("agencyId", "dedupKey");

CREATE INDEX "SecretaryWhatsappDelivery_agencyId_status_createdAt_idx"
ON "SecretaryWhatsappDelivery"("agencyId", "status", "createdAt");

ALTER TABLE "SecretaryWhatsappConnection"
ADD CONSTRAINT "SecretaryWhatsappConnection_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "SecretaryWhatsappMember"
ADD CONSTRAINT "SecretaryWhatsappMember_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "SecretaryWhatsappEvent"
ADD CONSTRAINT "SecretaryWhatsappEvent_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "SecretaryWhatsappDelivery"
ADD CONSTRAINT "SecretaryWhatsappDelivery_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
