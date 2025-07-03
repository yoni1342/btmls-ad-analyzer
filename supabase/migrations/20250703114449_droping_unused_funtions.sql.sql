-- This migration removes old, unused application-specific functions.
-- It intentionally leaves pg_vector internal functions and the two active trigger functions untouched.

-- Dropping old dashboard and reporting functions
DROP FUNCTION IF EXISTS public.dashboard_metrics(start_date timestamp with time zone, end_date timestamp with time zone, brand_filter text, sentiment_filter text) CASCADE;
DROP FUNCTION IF EXISTS public.dashboard_metrics(start_date text, end_date text, brand_filter text, sentiment_filter text) CASCADE;
DROP FUNCTION IF EXISTS public.full_dashboard_data(start_date text, end_date text, brand_filter text, sentiment_filter text) CASCADE;
DROP FUNCTION IF EXISTS public.period_comparison_metrics(current_start timestamp with time zone, current_end timestamp with time zone, previous_start timestamp with time zone, previous_end timestamp with time zone, brand_filter text) CASCADE;
DROP FUNCTION IF EXISTS public.top_ads_by_comments(start_date text, end_date text, brand_filter text, sentiment_filter text, limit_count integer) CASCADE;
DROP FUNCTION IF EXISTS public.top_ads_by_comments(start_date timestamp with time zone, end_date timestamp with time zone, brand_filter text, sentiment_filter text, limit_count integer) CASCADE;

-- Dropping old cluster and embedding management functions
DROP FUNCTION IF EXISTS public.find_similar_clusters(query_embedding vector, target_ad_id character varying, similarity_threshold double precision, max_results integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_cluster_centroid(target_cluster_id uuid, new_embedding vector, new_comment_text text) CASCADE;

-- Dropping old trigger functions
DROP FUNCTION IF EXISTS public.populate_cluster_from_metadata() CASCADE;
DROP FUNCTION IF EXISTS public.set_ad_account_comment_id() CASCADE;
DROP FUNCTION IF EXISTS public.update_ad_account_comment_on_new_comment() CASCADE;
DROP FUNCTION IF EXISTS public.update_comment_brand() CASCADE;
DROP FUNCTION IF EXISTS public.update_comment_brand_from_ad_account() CASCADE;