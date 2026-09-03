BEGIN;

ALTER TABLE "Comment"
ADD COLUMN "audioUrl" TEXT;

ALTER TABLE "Comment"
ADD COLUMN "audioMimeType" TEXT;

ALTER TABLE "Comment"
ADD COLUMN "audioDurationMs" INTEGER;

COMMIT;