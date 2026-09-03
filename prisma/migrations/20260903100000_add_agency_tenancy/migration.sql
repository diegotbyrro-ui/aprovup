BEGIN;

-- =====================================================
-- 1. CRIAR TENANT / AGENCY
-- =====================================================

CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Agency_slug_key"
ON "Agency"("slug");

-- =====================================================
-- 2. AGENCY ID INICIALMENTE OPCIONAL
-- =====================================================

ALTER TABLE "User"
ADD COLUMN "agencyId" TEXT;

ALTER TABLE "Client"
ADD COLUMN "agencyId" TEXT;

-- =====================================================
-- 3. CRIAR LEVEL UP COMO PRIMEIRO TENANT
-- =====================================================

INSERT INTO "Agency" (
    "id",
    "name",
    "slug",
    "status",
    "createdAt",
    "updatedAt"
)
VALUES (
    'agency_level_up',
    'Level UP',
    'level-up',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. BACKFILL DE TODOS OS REGISTROS EXISTENTES
-- =====================================================

UPDATE "User"
SET "agencyId" = 'agency_level_up'
WHERE "agencyId" IS NULL;

UPDATE "Client"
SET "agencyId" = 'agency_level_up'
WHERE "agencyId" IS NULL;

-- =====================================================
-- 5. PROTEGER CONTRA REGISTROS ORFAOS
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "User"
        WHERE "agencyId" IS NULL
    ) THEN
        RAISE EXCEPTION 'Existem usuarios sem agencyId apos o backfill';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "Client"
        WHERE "agencyId" IS NULL
    ) THEN
        RAISE EXCEPTION 'Existem clientes sem agencyId apos o backfill';
    END IF;
END
$$;

-- =====================================================
-- 6. CONTRATO ADIADO PARA A FASE FINAL
-- =====================================================
--
-- agencyId permanece nullable nesta migration de expansao.
-- O NOT NULL sera aplicado somente depois do deploy tenant-aware.
--

-- =====================================================
-- 7. INDICES
-- =====================================================

CREATE INDEX "User_agencyId_idx"
ON "User"("agencyId");

CREATE INDEX "Client_agencyId_idx"
ON "Client"("agencyId");

-- =====================================================
-- 8. FOREIGN KEYS
-- =====================================================

ALTER TABLE "User"
ADD CONSTRAINT "User_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "Client"
ADD CONSTRAINT "Client_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

COMMIT;