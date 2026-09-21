-- CreateTable
CREATE TABLE "MindMap" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "viewport" JSONB,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MindMap_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MindMap_agencyId_idx"
ON "MindMap"("agencyId");

CREATE INDEX "MindMap_agencyId_clientId_idx"
ON "MindMap"("agencyId", "clientId");

CREATE INDEX "MindMap_agencyId_updatedAt_idx"
ON "MindMap"("agencyId", "updatedAt");

ALTER TABLE "MindMap"
ADD CONSTRAINT "MindMap_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "MindMap"
ADD CONSTRAINT "MindMap_clientId_fkey"
FOREIGN KEY ("clientId")
REFERENCES "Client"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
