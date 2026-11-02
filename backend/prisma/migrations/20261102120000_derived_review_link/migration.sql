-- AlterTable
ALTER TABLE "review_items" ADD COLUMN "sourceExerciseId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "review_items_userId_sourceExerciseId_key" ON "review_items"("userId", "sourceExerciseId");

-- AddForeignKey
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_sourceExerciseId_fkey" FOREIGN KEY ("sourceExerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
