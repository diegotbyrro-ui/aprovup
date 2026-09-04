CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceFileUrl" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "pageCount" INTEGER,
    "elements" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportTemplate_agencyId_idx"
ON "ReportTemplate"("agencyId");

CREATE INDEX "ReportTemplate_agencyId_isDefault_idx"
ON "ReportTemplate"("agencyId", "isDefault");

ALTER TABLE "ReportTemplate"
ADD CONSTRAINT "ReportTemplate_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;