CREATE TABLE "AiProviderConnection" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "encryptedOpenAiApiKey" TEXT,
    "openAiModel" TEXT NOT NULL DEFAULT 'gpt-5.6-luna',
    "encryptedAnthropicApiKey" TEXT,
    "anthropicModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiProviderConnection_agencyId_key"
ON "AiProviderConnection"("agencyId");

ALTER TABLE "AiProviderConnection"
ADD CONSTRAINT "AiProviderConnection_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;