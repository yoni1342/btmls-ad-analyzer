-- Migration to change 'sentiment' column to an ENUM type

-- Step 1: Create the ENUM type if it does not already exist.
-- This DO block ensures that if the migration is re-run after a failure,
-- it won't throw an error trying to create a type that's already there.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sentiment_type') THEN
        CREATE TYPE sentiment_type AS ENUM ('Positive', 'Negative', 'Neutral');
    END IF;
END$$;


-- Step 2: Alter the 'comments' table to use the new 'sentiment_type'.
-- The USING clause includes a CASE statement to gracefully handle any
-- existing data in the 'sentiment' column that does not match the ENUM values.
-- It converts valid text ('Positive', 'Negative', 'Neutral') to the new ENUM type
-- and sets all other values (like empty strings "" or misspellings) to NULL.
ALTER TABLE public.comments
ALTER COLUMN sentiment
TYPE sentiment_type
USING (
  CASE
    WHEN sentiment IN ('Positive', 'Negative', 'Neutral') THEN sentiment::sentiment_type
    ELSE NULL
  END
);