-- Remove the ad_name column from the ad_account table.
-- This is a destructive action and cannot be undone without restoring a backup
-- or creating another migration to add the column back.
alter table public.ad_account
  drop column ad_name;


-- Disable Row Level Security (RLS) on the tables.
-- WARNING: Disabling RLS will make your data publicly accessible according
-- to your default PostgreSQL role permissions (e.g., via the 'anon' key).
-- All RLS policies on these tables will become inactive.
alter table public.ad_account
  disable row level security;

alter table public.campaigns
  disable row level security;