-- This function acts as a custom endpoint for creating a campaign.
-- It accepts a TEXT value for status, normalizes it to lowercase,
-- and then inserts it into the table.

CREATE OR REPLACE FUNCTION public.create_campaign(
    p_account_id bigint,
    p_name text,
    p_status text, -- We accept raw text for the status
    p_objective public.campaign_objective,
    p_start_time timestamptz default null,
    p_topline_id text default null
)
RETURNS public.campaigns -- The function will return the newly created campaign row
AS $$
DECLARE
  new_campaign public.campaigns;
BEGIN
  INSERT INTO public.campaigns (
    account_id,
    name,
    status, -- This is the ENUM column
    objective,
    start_time,
    topline_id
  )
  VALUES (
    p_account_id,
    p_name,
    lower(p_status)::public.campaign_status, -- Here we convert the input text to the ENUM type
    p_objective,
    p_start_time,
    p_topline_id
  )
  RETURNING * INTO new_campaign; -- Capture the inserted row into our variable

  RETURN new_campaign;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment for clarity
COMMENT ON FUNCTION public.create_campaign(bigint, text, text, public.campaign_objective, timestamptz, text)
IS 'Creates a new campaign, automatically converting the status text to lowercase before insertion.';