-- ============================================================================
-- This script creates the 'ad_sets' table.
-- It follows these rules:
--   - No Row Level Security (RLS) is enabled.
--   - All columns are nullable (except PK/FK) to prevent insertion errors.
--   - Data types are flexible (e.g., TEXT instead of ENUMs).
-- ============================================================================

CREATE TABLE public.ad_sets (
  -- Core identifiers
  id bigint NOT NULL PRIMARY KEY,
  campaign_id bigint NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,

  -- Ad Set Details (all nullable as requested)
  name text,
  status text,
  effective_status text,
  configured_status text,
  
  -- Timing and Dates
  start_time timestamptz,
  end_time timestamptz,
  created_time timestamptz,
  updated_time timestamptz,
  campaign_active_time timestamptz,

  -- Budgeting (using NUMERIC for precision)
  bid_strategy text,
  billing_event text,
  daily_budget numeric,
  lifetime_budget numeric,
  budget_remaining numeric,
  recurring_budget_semantics boolean,
  min_budget_spend_percentage numeric,

  -- Optimization and Attribution
  optimization_goal text,
  optimization_sub_event text,
  destination_type text,
  campaign_attribution text,
  multi_optimization_goal_weight text,
  is_dynamic_creative boolean,
  is_incremental_attribution_enabled boolean,
  
  -- Performance Metrics
  lifetime_imps bigint
);

-- Add a comment to the table for clarity
COMMENT ON TABLE public.ad_sets IS 'Stores ad set information, linked to a specific campaign.';

-- Add an index on the foreign key for better query performance when filtering by campaign.
CREATE INDEX ix_ad_sets_campaign_id ON public.ad_sets (campaign_id);