-- AprovUp SecretÃ¡ria IA:
-- conversas, mensagens, confirmaÃ§Ãµes e alertas operacionais.

CREATE TABLE "SecretaryThread" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WEB',
    "externalConversationId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretaryThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecretaryMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "inputType" TEXT NOT NULL DEFAULT 'TEXT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretaryMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecretaryPendingAction" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "threadId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretaryPendingAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecretaryAlert" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "clientId" TEXT,
    "contentId" TEXT,
    "publicationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretaryAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecretaryThread_agencyId_channel_userId_updatedAt_idx"
ON "SecretaryThread"("agencyId", "channel", "userId", "updatedAt");

CREATE INDEX "SecretaryMessage_threadId_createdAt_idx"
ON "SecretaryMessage"("threadId", "createdAt");

CREATE INDEX "SecretaryPendingAction_agencyId_status_createdAt_idx"
ON "SecretaryPendingAction"("agencyId", "status", "createdAt");

CREATE INDEX "SecretaryPendingAction_threadId_status_idx"
ON "SecretaryPendingAction"("threadId", "status");

CREATE UNIQUE INDEX "SecretaryAlert_agencyId_dedupKey_key"
ON "SecretaryAlert"("agencyId", "dedupKey");

CREATE INDEX "SecretaryAlert_agencyId_status_createdAt_idx"
ON "SecretaryAlert"("agencyId", "status", "createdAt");

CREATE INDEX "SecretaryAlert_publicationId_idx"
ON "SecretaryAlert"("publicationId");

ALTER TABLE "SecretaryThread"
ADD CONSTRAINT "SecretaryThread_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "SecretaryMessage"
ADD CONSTRAINT "SecretaryMessage_threadId_fkey"
FOREIGN KEY ("threadId")
REFERENCES "SecretaryThread"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "SecretaryPendingAction"
ADD CONSTRAINT "SecretaryPendingAction_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "SecretaryPendingAction"
ADD CONSTRAINT "SecretaryPendingAction_threadId_fkey"
FOREIGN KEY ("threadId")
REFERENCES "SecretaryThread"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "SecretaryAlert"
ADD CONSTRAINT "SecretaryAlert_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;