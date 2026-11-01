CREATE TABLE "support_requests" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "message" TEXT NOT NULL,
  "screenshot" TEXT,
  "deviceDetails" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "data_export_requests" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ready',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "support_requests_userId_createdAt_idx" ON "support_requests"("userId", "createdAt");
CREATE INDEX "data_export_requests_userId_createdAt_idx" ON "data_export_requests"("userId", "createdAt");
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
