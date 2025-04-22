-- Drop existing tables if they exist
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS report_metadata;

-- Create tables with lowercase column names to match the updated code
CREATE TABLE report_metadata (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  created TIMESTAMP WITH TIME ZONE NOT NULL,
  adcount INTEGER NOT NULL  -- lowercase to match the code
);

CREATE TABLE reports (
  id UUID PRIMARY KEY REFERENCES report_metadata(id),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_report_metadata_brand ON report_metadata(brand);
CREATE INDEX idx_report_metadata_created ON report_metadata(created); 