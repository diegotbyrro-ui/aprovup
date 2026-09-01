-- CreateTable
CREATE TABLE "ClientProfileDiagnosis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bioAnalysis" TEXT,
    "profilePhotoAnalysis" TEXT,
    "visualIdentityAnalysis" TEXT,
    "highlightsAnalysis" TEXT,
    "postingFrequencyAnalysis" TEXT,
    "offerClarityAnalysis" TEXT,
    "strengths" TEXT,
    "improvementPoints" TEXT,
    "actionPlan" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientProfileDiagnosis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
