CREATE TABLE IF NOT EXISTS "SecretaryMeeting" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "source" TEXT NOT NULL DEFAULT 'GOOGLE_MEET',
    "calendarEventId" TEXT,
    "calendarHtmlLink" TEXT,
    "googleMeetUri" TEXT,
    "googleMeetCode" TEXT,
    "googleMeetSpaceName" TEXT,
    "conferenceRecordName" TEXT,
    "transcriptName" TEXT,
    "transcriptDocumentUrl" TEXT,
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "attendeeEmails" JSONB,
    "participants" JSONB,
    "notes" TEXT,
    "rawTranscript" TEXT,
    "summary" TEXT,
    "decisions" JSONB,
    "pendingItems" JSONB,
    "ideas" JSONB,
    "actionPlan" JSONB,
    "processingError" TEXT,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretaryMeeting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SecretaryMeetingTranscriptEntry" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "providerEntryName" TEXT,
    "participantResource" TEXT,
    "speakerName" TEXT,
    "text" TEXT NOT NULL,
    "languageCode" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretaryMeetingTranscriptEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SecretaryMeetingAction" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TASK',
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "responsible" TEXT,
    "dueDateText" TEXT,
    "dueDate" TIMESTAMP(3),
    "payload" JSONB,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecretaryMeetingAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS
"SecretaryMeeting_agencyId_calendarEventId_key"
ON "SecretaryMeeting"("agencyId", "calendarEventId");

CREATE INDEX IF NOT EXISTS
"SecretaryMeeting_agencyId_scheduledStart_idx"
ON "SecretaryMeeting"("agencyId", "scheduledStart");

CREATE INDEX IF NOT EXISTS
"SecretaryMeeting_agencyId_status_idx"
ON "SecretaryMeeting"("agencyId", "status");

CREATE INDEX IF NOT EXISTS
"SecretaryMeeting_clientId_idx"
ON "SecretaryMeeting"("clientId");

CREATE INDEX IF NOT EXISTS
"SecretaryMeeting_googleMeetCode_idx"
ON "SecretaryMeeting"("googleMeetCode");

CREATE UNIQUE INDEX IF NOT EXISTS
"SecretaryMeetingTranscriptEntry_providerEntryName_key"
ON "SecretaryMeetingTranscriptEntry"("providerEntryName");

CREATE INDEX IF NOT EXISTS
"SecretaryMeetingTranscriptEntry_meetingId_startTime_idx"
ON "SecretaryMeetingTranscriptEntry"("meetingId", "startTime");

CREATE INDEX IF NOT EXISTS
"SecretaryMeetingAction_meetingId_status_idx"
ON "SecretaryMeetingAction"("meetingId", "status");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SecretaryMeeting_agencyId_fkey'
    ) THEN
        ALTER TABLE "SecretaryMeeting"
        ADD CONSTRAINT "SecretaryMeeting_agencyId_fkey"
        FOREIGN KEY ("agencyId")
        REFERENCES "Agency"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SecretaryMeeting_clientId_fkey'
    ) THEN
        ALTER TABLE "SecretaryMeeting"
        ADD CONSTRAINT "SecretaryMeeting_clientId_fkey"
        FOREIGN KEY ("clientId")
        REFERENCES "Client"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SecretaryMeetingTranscriptEntry_meetingId_fkey'
    ) THEN
        ALTER TABLE "SecretaryMeetingTranscriptEntry"
        ADD CONSTRAINT "SecretaryMeetingTranscriptEntry_meetingId_fkey"
        FOREIGN KEY ("meetingId")
        REFERENCES "SecretaryMeeting"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'SecretaryMeetingAction_meetingId_fkey'
    ) THEN
        ALTER TABLE "SecretaryMeetingAction"
        ADD CONSTRAINT "SecretaryMeetingAction_meetingId_fkey"
        FOREIGN KEY ("meetingId")
        REFERENCES "SecretaryMeeting"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END
$$;
