-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Content" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "format" TEXT,
    "platform" TEXT,
    "plannedDate" DATETIME,
    "responsible" TEXT,
    "area" TEXT NOT NULL DEFAULT 'GERAL',
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "caption" TEXT,
    "artText" TEXT,
    "script" TEXT,
    "briefing" TEXT,
    "fileLinks" TEXT,
    "coverImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IDEIA',
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Content_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Content" ("area", "artText", "briefing", "caption", "clientId", "coverImageUrl", "createdAt", "fileLinks", "format", "id", "objective", "plannedDate", "platform", "responsible", "script", "status", "title", "updatedAt") SELECT "area", "artText", "briefing", "caption", "clientId", "coverImageUrl", "createdAt", "fileLinks", "format", "id", "objective", "plannedDate", "platform", "responsible", "script", "status", "title", "updatedAt" FROM "Content";
DROP TABLE "Content";
ALTER TABLE "new_Content" RENAME TO "Content";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
