-- Option 1: Drop and recreate the table with proper column casing
-- WARNING: This will remove any existing data in the table

DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS report_metadata;

CREATE TABLE report_metadata (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  created TIMESTAMP WITH TIME ZONE NOT NULL,
  "adCount" INTEGER NOT NULL  -- Note the quotes to preserve case
);

CREATE TABLE reports (
  id UUID PRIMARY KEY REFERENCES report_metadata(id),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_report_metadata_brand ON report_metadata(brand);
CREATE INDEX idx_report_metadata_created ON report_metadata(created);

-- Option 2: Alter the existing table to add the correctly cased column
-- Only use this if you want to keep existing data and transition

-- First, add the new column with correct casing
ALTER TABLE report_metadata ADD COLUMN IF NOT EXISTS "adCount" INTEGER;

-- Then copy data from the old column (if it exists and has data)
UPDATE report_metadata SET "adCount" = adcount WHERE adcount IS NOT NULL;

-- Make the new column NOT NULL once data is migrated
ALTER TABLE report_metadata ALTER COLUMN "adCount" SET NOT NULL; 