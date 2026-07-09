/*
  Warnings:

  - You are about to drop the `Step` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StepLeg` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StepResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "ModelPrediction" ADD COLUMN "expectedGoalsAway" REAL;
ALTER TABLE "ModelPrediction" ADD COLUMN "expectedGoalsHome" REAL;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Step";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "StepLeg";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "StepResult";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "MarketQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" TEXT NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "line" REAL NOT NULL,
    "homeOrOverOdds" REAL NOT NULL,
    "awayOrUnderOdds" REAL NOT NULL,
    "isOpeningLine" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketQuote_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "market" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "line" REAL,
    "odds" REAL NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "modelProb" REAL NOT NULL,
    "fairProb" REAL NOT NULL,
    "edge" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "reasoning" TEXT,
    "result" TEXT NOT NULL DEFAULT 'PENDING',
    "profitLossUnits" REAL,
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pick_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MarketQuote_fixtureId_market_capturedAt_idx" ON "MarketQuote"("fixtureId", "market", "capturedAt");

-- CreateIndex
CREATE INDEX "Pick_date_idx" ON "Pick"("date");

-- CreateIndex
CREATE INDEX "Pick_fixtureId_idx" ON "Pick"("fixtureId");
