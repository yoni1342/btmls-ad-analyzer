DROP TRIGGER IF EXISTS on_campaign_insert_or_update ON public.campaigns;
DROP FUNCTION IF EXISTS public.normalize_campaign_status();