BEGIN;

-- =====================================================
-- 1. ADICIONAR AGENCY ID NAS COLUNAS DOS KANBANS
-- =====================================================

ALTER TABLE "DesignKanbanColumn"
ADD COLUMN "agencyId" TEXT;

ALTER TABLE "FilmmakerKanbanColumn"
ADD COLUMN "agencyId" TEXT;

-- =====================================================
-- 2. BACKFILL DO TENANT ATUAL
-- =====================================================

UPDATE "DesignKanbanColumn"
SET "agencyId" = 'agency_level_up'
WHERE "agencyId" IS NULL;

UPDATE "FilmmakerKanbanColumn"
SET "agencyId" = 'agency_level_up'
WHERE "agencyId" IS NULL;

-- =====================================================
-- 3. VALIDAR BACKFILL DOS REGISTROS EXISTENTES
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "DesignKanbanColumn"
        WHERE "agencyId" IS NULL
    ) THEN
        RAISE EXCEPTION 'Existem colunas de Design sem agencyId apos o backfill';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "FilmmakerKanbanColumn"
        WHERE "agencyId" IS NULL
    ) THEN
        RAISE EXCEPTION 'Existem colunas de Filmmaker sem agencyId apos o backfill';
    END IF;
END
$$;

-- =====================================================
-- 4. REMOVER UNIQUE GLOBAL DO STATUS KEY
-- =====================================================

DROP INDEX IF EXISTS "DesignKanbanColumn_statusKey_key";
DROP INDEX IF EXISTS "FilmmakerKanbanColumn_statusKey_key";

-- =====================================================
-- 5. UNIQUE POR AGENCIA
-- =====================================================

CREATE UNIQUE INDEX "DesignKanbanColumn_agencyId_statusKey_key"
ON "DesignKanbanColumn"("agencyId", "statusKey");

CREATE UNIQUE INDEX "FilmmakerKanbanColumn_agencyId_statusKey_key"
ON "FilmmakerKanbanColumn"("agencyId", "statusKey");

-- =====================================================
-- 6. INDICES DE TENANT
-- =====================================================

CREATE INDEX "DesignKanbanColumn_agencyId_idx"
ON "DesignKanbanColumn"("agencyId");

CREATE INDEX "FilmmakerKanbanColumn_agencyId_idx"
ON "FilmmakerKanbanColumn"("agencyId");

-- =====================================================
-- 7. FOREIGN KEYS
-- =====================================================

ALTER TABLE "DesignKanbanColumn"
ADD CONSTRAINT "DesignKanbanColumn_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "FilmmakerKanbanColumn"
ADD CONSTRAINT "FilmmakerKanbanColumn_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- =====================================================
-- 8. CONTRATO ADIADO
-- =====================================================
--
-- agencyId permanece nullable por enquanto.
-- NOT NULL sera aplicado somente apos deploy tenant-aware
-- e testes cross-tenant.
--

COMMIT;
