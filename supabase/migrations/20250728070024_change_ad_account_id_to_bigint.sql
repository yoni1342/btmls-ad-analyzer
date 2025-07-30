-- ============================================================================
-- WARNING: DESTRUCTIVE MIGRATION
-- This script changes the PK/FK types from UUID to BIGINT by dropping and
-- re-creating the columns, as direct casting is not possible.
-- This will delete any existing data in the tables.
-- ============================================================================

-- Step 1: Remove all data to ensure a clean slate.
-- This is crucial to prevent any potential integrity errors.
DELETE FROM public.campaigns;
DELETE FROM public.ad_account;

-- Step 2: Drop the foreign key constraint that links the two tables.
ALTER TABLE public.campaigns
  DROP CONSTRAINT campaigns_account_id_fkey;

-- Step 3: Drop the original 'account_id' column from the 'campaigns' table.
ALTER TABLE public.campaigns
  DROP COLUMN account_id;

-- Step 4: Drop the original 'id' primary key column from the 'ad_account' table.
-- We use CASCADE here to automatically remove any dependencies, like the primary key constraint.
ALTER TABLE public.ad_account
  DROP COLUMN id CASCADE;

-- Step 5: Re-create the 'id' column on 'ad_account' with the correct BIGINT type
-- and set it as the primary key. IDs must now be provided manually.
ALTER TABLE public.ad_account
  ADD COLUMN id BIGINT NOT NULL PRIMARY KEY;

-- Step 6: Re-create the 'account_id' column on 'campaigns' with the BIGINT type.
ALTER TABLE public.campaigns
  ADD COLUMN account_id BIGINT NOT NULL;

-- Step 7: Re-establish the foreign key relationship between the tables.
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_account_id_fkey
  FOREIGN KEY (account_id)
  REFERENCES public.ad_account(id)
  ON DELETE CASCADE;

-- Step 8: Re-create the index on the foreign key for performance.
-- The original index was dropped when the column was dropped.
CREATE INDEX ix_campaigns_account_id ON public.campaigns (account_id);