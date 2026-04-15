-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExamSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "violationsCount" INTEGER NOT NULL DEFAULT 0,
    "rawScore" REAL,
    "finalGrade" REAL,
    CONSTRAINT "ExamSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExamSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExamSession" ("finalGrade", "finishedAt", "id", "rawScore", "roomId", "startedAt", "status", "studentId", "violationsCount") SELECT "finalGrade", "finishedAt", "id", "rawScore", "roomId", "startedAt", "status", "studentId", "violationsCount" FROM "ExamSession";
DROP TABLE "ExamSession";
ALTER TABLE "new_ExamSession" RENAME TO "ExamSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
