CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdByEmail" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'DUVIDA',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicket_agencyId_idx"
ON "SupportTicket"("agencyId");

CREATE INDEX "SupportTicket_agencyId_status_idx"
ON "SupportTicket"("agencyId", "status");

CREATE INDEX "SupportTicket_createdByUserId_idx"
ON "SupportTicket"("createdByUserId");

CREATE INDEX "SupportTicket_createdAt_idx"
ON "SupportTicket"("createdAt");

CREATE INDEX "SupportTicketMessage_ticketId_idx"
ON "SupportTicketMessage"("ticketId");

CREATE INDEX "SupportTicketMessage_createdAt_idx"
ON "SupportTicketMessage"("createdAt");

ALTER TABLE "SupportTicket"
ADD CONSTRAINT "SupportTicket_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "SupportTicketMessage"
ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey"
FOREIGN KEY ("ticketId")
REFERENCES "SupportTicket"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;