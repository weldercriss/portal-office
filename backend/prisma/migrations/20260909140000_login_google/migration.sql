-- CreateEnum
CREATE TYPE "AuthChallengeFinalidade" AS ENUM ('LOGIN', 'VINCULO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleLinkedAt" TIMESTAMP(3),
ADD COLUMN     "googleSub" TEXT;

-- CreateTable
CREATE TABLE "AuthChallenge" (
    "id" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "finalidade" "AuthChallengeFinalidade" NOT NULL,
    "userId" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthChallenge_nonceHash_key" ON "AuthChallenge"("nonceHash");

-- CreateIndex
CREATE INDEX "AuthChallenge_expiraEm_idx" ON "AuthChallenge"("expiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");
