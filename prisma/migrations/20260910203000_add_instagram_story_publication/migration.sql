CREATE TABLE "InstagramStoryPublication" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "instagramUserId" TEXT,
    "instagramUsername" TEXT,
    "mediaUrl" TEXT,
    "coverUrl" TEXT,
    "mediaType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PRONTO',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "metaContainerId" TEXT,
    "metaMediaId" TEXT,
    "permalink" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstagramStoryPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstagramStoryPublication_contentId_key"
ON "InstagramStoryPublication"("contentId");

CREATE INDEX "InstagramStoryPublication_status_idx"
ON "InstagramStoryPublication"("status");

CREATE INDEX "InstagramStoryPublication_scheduledFor_idx"
ON "InstagramStoryPublication"("scheduledFor");

CREATE INDEX "InstagramStoryPublication_instagramUserId_idx"
ON "InstagramStoryPublication"("instagramUserId");

ALTER TABLE "InstagramStoryPublication"
ADD CONSTRAINT "InstagramStoryPublication_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "Content"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
