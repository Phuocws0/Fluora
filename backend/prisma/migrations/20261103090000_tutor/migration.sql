-- CreateTable
CREATE TABLE "tutor_scenarios" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "startTurnKey" TEXT NOT NULL,
    "closingLine" TEXT NOT NULL,
    "turns" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutor_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_conversations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "scenarioId" UUID,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "saved" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentTurnKey" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutor_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "context" JSONB,
    "feedback" JSONB,
    "turnKey" TEXT,
    "replyToId" UUID,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_notes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "conversationId" UUID,
    "messageId" UUID,
    "phrase" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "personalExample" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutor_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutor_scenarios_slug_key" ON "tutor_scenarios"("slug");

-- CreateIndex
CREATE INDEX "tutor_conversations_userId_createdAt_idx" ON "tutor_conversations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "tutor_conversations_userId_saved_lastActivityAt_idx" ON "tutor_conversations"("userId", "saved", "lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "tutor_messages_replyToId_key" ON "tutor_messages"("replyToId");

-- CreateIndex
CREATE INDEX "tutor_messages_conversationId_createdAt_idx" ON "tutor_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "tutor_notes_userId_createdAt_idx" ON "tutor_notes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "tutor_notes_messageId_idx" ON "tutor_notes"("messageId");

-- AddForeignKey
ALTER TABLE "tutor_conversations" ADD CONSTRAINT "tutor_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_conversations" ADD CONSTRAINT "tutor_conversations_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "tutor_scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_messages" ADD CONSTRAINT "tutor_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "tutor_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_messages" ADD CONSTRAINT "tutor_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "tutor_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_notes" ADD CONSTRAINT "tutor_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_notes" ADD CONSTRAINT "tutor_notes_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "tutor_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_notes" ADD CONSTRAINT "tutor_notes_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "tutor_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
