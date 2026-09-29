CREATE TABLE IF NOT EXISTS "SocialConnection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountId" TEXT,
    "accountName" TEXT,
    "accountUsername" TEXT,
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "connectedByUserId" TEXT,
    "connectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialConnection_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS
"SocialConnection_clientId_platform_key"
ON "SocialConnection"(
    "clientId",
    "platform"
);

CREATE INDEX IF NOT EXISTS
"SocialConnection_platform_status_idx"
ON "SocialConnection"(
    "platform",
    "status"
);

CREATE INDEX IF NOT EXISTS
"SocialConnection_clientId_idx"
ON "SocialConnection"(
    "clientId"
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'SocialConnection_clientId_fkey'
    ) THEN

        ALTER TABLE "SocialConnection"
        ADD CONSTRAINT "SocialConnection_clientId_fkey"
        FOREIGN KEY ("clientId")
        REFERENCES "Client"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;

    END IF;
END
$$;


CREATE TABLE IF NOT EXISTS "SocialPublication" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "captionOverride" TEXT,
    "titleOverride" TEXT,
    "descriptionOverride" TEXT,
    "privacyStatus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SELECIONADO',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "permalink" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "errorAlertedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPublication_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS
"SocialPublication_contentId_platform_key"
ON "SocialPublication"(
    "contentId",
    "platform"
);

CREATE INDEX IF NOT EXISTS
"SocialPublication_platform_status_idx"
ON "SocialPublication"(
    "platform",
    "status"
);

CREATE INDEX IF NOT EXISTS
"SocialPublication_scheduledFor_idx"
ON "SocialPublication"(
    "scheduledFor"
);

CREATE INDEX IF NOT EXISTS
"SocialPublication_contentId_idx"
ON "SocialPublication"(
    "contentId"
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'SocialPublication_contentId_fkey'
    ) THEN

        ALTER TABLE "SocialPublication"
        ADD CONSTRAINT "SocialPublication_contentId_fkey"
        FOREIGN KEY ("contentId")
        REFERENCES "Content"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;

    END IF;
END
$$;