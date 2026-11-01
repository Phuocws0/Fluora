CREATE TABLE "review_items" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "front" TEXT NOT NULL,
  "back" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'custom',
  "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "review_items_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "review_outcomes" (
  "id" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_outcomes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "review_items_userId_nextReviewAt_idx" ON "review_items"("userId", "nextReviewAt");
CREATE INDEX "review_outcomes_itemId_createdAt_idx" ON "review_outcomes"("itemId", "createdAt");
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_outcomes" ADD CONSTRAINT "review_outcomes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "review_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
