-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "segment" TEXT,
    "internalResponsible" TEXT,
    "postingFrequency" TEXT,
    "monthlyContentGoal" INTEGER NOT NULL DEFAULT 0,
    "toneOfVoice" TEXT,
    "contractedServices" TEXT,
    "usefulLinks" TEXT,
    "strategicNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Client" ("contractedServices", "createdAt", "id", "internalResponsible", "name", "postingFrequency", "segment", "strategicNotes", "toneOfVoice", "updatedAt", "usefulLinks") SELECT "contractedServices", "createdAt", "id", "internalResponsible", "name", "postingFrequency", "segment", "strategicNotes", "toneOfVoice", "updatedAt", "usefulLinks" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
