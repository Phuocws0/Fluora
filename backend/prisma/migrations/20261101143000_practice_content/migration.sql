CREATE TABLE "vocabulary_sets" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vocabulary_sets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "vocabulary_cards" (
  "id" UUID NOT NULL,
  "setId" UUID NOT NULL,
  "front" TEXT NOT NULL,
  "back" TEXT NOT NULL,
  "tag" TEXT,
  "example" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vocabulary_cards_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "stories" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "bookmarks" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "note" TEXT,
  "tag" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "reading_progress" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "storyId" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vocabulary_sets_userId_createdAt_idx" ON "vocabulary_sets"("userId", "createdAt");
CREATE INDEX "vocabulary_cards_setId_createdAt_idx" ON "vocabulary_cards"("setId", "createdAt");
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");
CREATE UNIQUE INDEX "bookmarks_userId_targetType_targetId_key" ON "bookmarks"("userId", "targetType", "targetId");
CREATE INDEX "bookmarks_userId_createdAt_idx" ON "bookmarks"("userId", "createdAt");
CREATE UNIQUE INDEX "reading_progress_userId_storyId_key" ON "reading_progress"("userId", "storyId");
ALTER TABLE "vocabulary_sets" ADD CONSTRAINT "vocabulary_sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vocabulary_cards" ADD CONSTRAINT "vocabulary_cards_setId_fkey" FOREIGN KEY ("setId") REFERENCES "vocabulary_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
