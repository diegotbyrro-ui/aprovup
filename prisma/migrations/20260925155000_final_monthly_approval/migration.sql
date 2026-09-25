CREATE TABLE IF NOT EXISTS "FinalMonthlyApproval" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinalMonthlyApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS
"FinalMonthlyApproval_token_key"
ON "FinalMonthlyApproval"("token");

CREATE UNIQUE INDEX IF NOT EXISTS
"FinalMonthlyApproval_clientId_month_year_key"
ON "FinalMonthlyApproval"(
    "clientId",
    "month",
    "year"
);

CREATE INDEX IF NOT EXISTS
"FinalMonthlyApproval_clientId_year_month_idx"
ON "FinalMonthlyApproval"(
    "clientId",
    "year",
    "month"
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'FinalMonthlyApproval_clientId_fkey'
    ) THEN
        ALTER TABLE "FinalMonthlyApproval"
        ADD CONSTRAINT "FinalMonthlyApproval_clientId_fkey"
        FOREIGN KEY ("clientId")
        REFERENCES "Client"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END
$$;
