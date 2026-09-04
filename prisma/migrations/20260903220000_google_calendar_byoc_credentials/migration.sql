ALTER TABLE "GoogleCalendarConnection"
ADD COLUMN IF NOT EXISTS "googleClientId" TEXT;

ALTER TABLE "GoogleCalendarConnection"
ADD COLUMN IF NOT EXISTS "encryptedClientSecret" TEXT;

ALTER TABLE "GoogleCalendarConnection"
ALTER COLUMN "encryptedRefreshToken" DROP NOT NULL;

ALTER TABLE "GoogleCalendarConnection"
ALTER COLUMN "connectedAt" DROP NOT NULL;

ALTER TABLE "GoogleCalendarConnection"
ALTER COLUMN "connectedAt" DROP DEFAULT;