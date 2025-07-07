-- Migration: drop UUID overload of get_daily_comment_sentiment_counts
DROP FUNCTION IF EXISTS public.get_daily_comment_sentiment_counts(
UUID,
TIMESTAMPTZ,
TIMESTAMPTZ
);