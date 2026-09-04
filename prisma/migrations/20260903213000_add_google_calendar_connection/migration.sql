CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "googleAccountEmail" TEXT,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "encryptedRefreshToken" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleCalendarConnection_agencyId_key"
ON "GoogleCalendarConnection"("agencyId");

ALTER TABLE "GoogleCalendarConnection"
ADD CONSTRAINT "GoogleCalendarConnection_agencyId_fkey"
FOREIGN KEY ("agencyId")
REFERENCES "Agency"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;