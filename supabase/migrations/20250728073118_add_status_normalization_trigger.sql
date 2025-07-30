-- Create a function that takes the incoming row's status,
-- converts it to lowercase, and assigns it back.
CREATE OR REPLACE FUNCTION public.normalize_campaign_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Takes the 'status' value from the row being inserted/updated,
  -- converts it to lowercase, and updates it in place.
  NEW.status = lower(NEW.status::text)::public.campaign_status;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that calls the function before any INSERT or UPDATE
-- on the 'campaigns' table.
CREATE TRIGGER on_campaign_insert_or_update
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE PROCEDURE public.normalize_campaign_status();

-- Add a comment for future reference
COMMENT ON TRIGGER on_campaign_insert_or_update ON public.campaigns
IS 'Ensures the campaign status is always saved as lowercase.';