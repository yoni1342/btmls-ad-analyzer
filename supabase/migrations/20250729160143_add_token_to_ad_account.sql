-- This migration adds a column to store access tokens in the ad_account table.
ALTER TABLE public.ad_account
  ADD COLUMN access_token text; -- 'text' is flexible for long tokens. Column is nullable by default.

-- Add a comment for clarity.
COMMENT ON COLUMN public.ad_account.access_token IS 'Stores the long-lived Page Access Token for this ad account.';