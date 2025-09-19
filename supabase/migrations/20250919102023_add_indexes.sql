-- Add indexes to improve query performance for get_dashboard_data function
-- These indexes will significantly speed up JOIN operations and filtering

-- Indexes for ads table
CREATE INDEX IF NOT EXISTS idx_ads_ad_set_id ON ads(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_ads_source_created_time ON ads(source_created_time);
CREATE INDEX IF NOT EXISTS idx_ads_funnel ON ads(funnel);
CREATE INDEX IF NOT EXISTS idx_ads_angle_type ON ads(angle_type);
CREATE INDEX IF NOT EXISTS idx_ads_angle ON ads(angle);
CREATE INDEX IF NOT EXISTS idx_ads_ad_account_id ON ads(ad_account_id);

-- Indexes for ad_sets table
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_id ON ad_sets(campaign_id);

-- Indexes for campaigns table
CREATE INDEX IF NOT EXISTS idx_campaigns_account_id ON campaigns(account_id);

-- Indexes for ad_account table
CREATE INDEX IF NOT EXISTS idx_ad_account_brand_id ON ad_account(brand_id);

-- Indexes for comments table
CREATE INDEX IF NOT EXISTS idx_comments_ad_id ON comments(ad_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_time ON comments(created_time);
CREATE INDEX IF NOT EXISTS idx_comments_sentiment ON comments(sentiment);
CREATE INDEX IF NOT EXISTS idx_comments_theme ON comments(theme);

-- Composite indexes for frequently used JOIN patterns
CREATE INDEX IF NOT EXISTS idx_ads_composite_filter ON ads(ad_set_id, source_created_time, funnel, angle_type);
CREATE INDEX IF NOT EXISTS idx_comments_composite ON comments(ad_id, sentiment, created_time);

-- Index for comment_cluster table
CREATE INDEX IF NOT EXISTS idx_comment_cluster_comment_id ON comment_cluster(comment_id);

-- Analyze tables to update statistics
ANALYZE ads;
ANALYZE ad_sets;
ANALYZE campaigns;
ANALYZE ad_account;
ANALYZE comments;
ANALYZE comment_cluster;