CREATE TABLE "EditorialCalendarTemplate" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceFileUrl" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 2,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorialCalendarTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EditorialCalendarTemplate_agencyId_idx"
ON "EditorialCalendarTemplate"("agencyId");

CREATE INDEX "EditorialCalendarTemplate_agencyId_isDefault_idx"
ON "EditorialCalendarTemplate"("agencyId", "isDefault");

ALTER TABLE "EditorialCalendarTemplate"
ADD CONSTRAINT "EditorialCalendarTemplate_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
