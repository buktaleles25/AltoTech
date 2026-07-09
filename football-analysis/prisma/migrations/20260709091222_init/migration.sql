-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "league" TEXT NOT NULL,
    "country" TEXT,
    "logoUrl" TEXT,
    "apiFootballId" TEXT,
    "sportsDbId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "kickoffAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "apiFootballId" TEXT,
    "oddsApiId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Fixture_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Fixture_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OddsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" TEXT NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "market" TEXT NOT NULL DEFAULT 'h2h',
    "homeOdds" REAL NOT NULL,
    "drawOdds" REAL,
    "awayOdds" REAL NOT NULL,
    "impliedHomeProb" REAL NOT NULL,
    "impliedDrawProb" REAL,
    "impliedAwayProb" REAL NOT NULL,
    "isOpeningLine" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OddsSnapshot_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lineup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "formation" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "startingXiJson" TEXT,
    "missingPlayersJson" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lineup_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lineup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "relatedTeamId" TEXT,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsItem_relatedTeamId_fkey" FOREIGN KEY ("relatedTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" TEXT NOT NULL,
    "modelHomeProb" REAL NOT NULL,
    "modelDrawProb" REAL NOT NULL,
    "modelAwayProb" REAL NOT NULL,
    "edgeHome" REAL NOT NULL,
    "edgeDraw" REAL NOT NULL,
    "edgeAway" REAL NOT NULL,
    "confidenceScore" REAL NOT NULL,
    "reasoning" TEXT,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelPrediction_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Step" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "combinedOdds" REAL NOT NULL,
    "resultOutcome" TEXT NOT NULL DEFAULT 'PENDING',
    "isFullStrength" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StepLeg" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "odds" REAL NOT NULL,
    "edge" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "reasoning" TEXT,
    "legResult" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "StepLeg_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StepLeg_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StepResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "settledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualOutcomeJson" TEXT NOT NULL,
    "profitLossUnits" REAL NOT NULL,
    CONSTRAINT "StepResult_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_apiFootballId_key" ON "Team"("apiFootballId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_sportsDbId_key" ON "Team"("sportsDbId");

-- CreateIndex
CREATE INDEX "Team_league_idx" ON "Team"("league");

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_apiFootballId_key" ON "Fixture"("apiFootballId");

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_oddsApiId_key" ON "Fixture"("oddsApiId");

-- CreateIndex
CREATE INDEX "Fixture_kickoffAt_idx" ON "Fixture"("kickoffAt");

-- CreateIndex
CREATE INDEX "Fixture_league_idx" ON "Fixture"("league");

-- CreateIndex
CREATE INDEX "OddsSnapshot_fixtureId_capturedAt_idx" ON "OddsSnapshot"("fixtureId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lineup_fixtureId_teamId_key" ON "Lineup"("fixtureId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsItem_url_key" ON "NewsItem"("url");

-- CreateIndex
CREATE INDEX "NewsItem_publishedAt_idx" ON "NewsItem"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsItem_relatedTeamId_idx" ON "NewsItem"("relatedTeamId");

-- CreateIndex
CREATE INDEX "ModelPrediction_fixtureId_computedAt_idx" ON "ModelPrediction"("fixtureId", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Step_date_key" ON "Step"("date");

-- CreateIndex
CREATE UNIQUE INDEX "StepLeg_stepId_fixtureId_key" ON "StepLeg"("stepId", "fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "StepResult_stepId_key" ON "StepResult"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
