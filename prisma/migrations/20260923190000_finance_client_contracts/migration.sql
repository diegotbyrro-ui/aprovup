ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "financeMonthlyAmountCents" INTEGER,
ADD COLUMN IF NOT EXISTS "financeBillingDay" INTEGER,
ADD COLUMN IF NOT EXISTS "financeStartDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "financeEndDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "financeStatus" TEXT NOT NULL DEFAULT 'INATIVO',
ADD COLUMN IF NOT EXISTS "financeRecurring" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "financePaymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS "financeNotes" TEXT;

ALTER TABLE "FinanceEntry"
ADD COLUMN IF NOT EXISTS "contractPeriod" TEXT,
ADD COLUMN IF NOT EXISTS "source" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS
"FinanceEntry_agencyId_clientId_contractPeriod_key"
ON "FinanceEntry"(
  "agencyId",
  "clientId",
  "contractPeriod"
);
