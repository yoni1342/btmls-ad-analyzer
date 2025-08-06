-- ============================================================================
-- Remove temporary functions that were created during rushed implementation
-- This cleans up the database by removing unused enhanced functions
-- ============================================================================

-- Drop the enhanced brands functions
DROP FUNCTION IF EXISTS public.get_all_brands();
DROP FUNCTION IF EXISTS public.get_enhanced_dashboard_data(text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_enhanced_campaigns_data(text, text, text, text);
DROP FUNCTION IF EXISTS public.get_enhanced_ad_sets_data(text, text, text, text);

-- Drop the direct account functions  
DROP FUNCTION IF EXISTS public.get_campaigns_by_account(text, text, text);
DROP FUNCTION IF EXISTS public.get_ad_sets_by_account(text, text, text);

-- Add comment for clarity
COMMENT ON SCHEMA public IS 'Cleaned up temporary functions from rushed implementation';
