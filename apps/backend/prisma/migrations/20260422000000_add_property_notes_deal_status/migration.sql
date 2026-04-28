-- AddColumn notes and dealStatus to saved_properties
ALTER TABLE "saved_properties" ADD COLUMN "notes" TEXT;
ALTER TABLE "saved_properties" ADD COLUMN "dealStatus" TEXT DEFAULT 'watching';
ALTER TABLE "saved_properties" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
