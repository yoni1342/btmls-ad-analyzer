-- ============================================================
--  1. DROP UNNECESSARY TABLES
-- ============================================================
DROP TABLE IF EXISTS public.comment_assignments CASCADE;
DROP TABLE IF EXISTS public.comment_clusters CASCADE;
DROP TABLE IF EXISTS public.report_metadata CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;

-- ============================================================
--  2. DROP DEPENDENT TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS "set_brand_on_comment_cluster" ON "public"."Comment Claster";
DROP TRIGGER IF EXISTS "set_brand_on_comment" ON "public"."Comments";

-- ============================================================
--  3. RENAME TABLES
-- ============================================================
ALTER TABLE "public"."Comments" RENAME TO comments;
ALTER TABLE "public"."Cluster Comments" RENAME TO cluster_comments;
ALTER TABLE "public"."Prompt" RENAME TO prompt;
ALTER TABLE "public"."Comment Claster" RENAME TO comment_cluster;

-- The following line is commented out because this rename was already
-- performed manually on the staging database, causing the migration to fail.
-- ALTER TABLE "public"."Ad per Ad Account" RENAME TO ad_per_ad_account;


-- ============================================================
--  4. RENAME COLUMNS
-- ============================================================
ALTER TABLE "public"."prompt" RENAME COLUMN "Prompts" TO prompts;
ALTER TABLE "public"."prompt" RENAME COLUMN "Name" TO name;
ALTER TABLE "public"."prompt" RENAME COLUMN "Examples" TO examples;

ALTER TABLE "public"."comment_cluster" RENAME COLUMN "Cluster name" TO cluster_name;
ALTER TABLE "public"."comment_cluster" RENAME COLUMN "Cluster Description" TO cluster_description;
ALTER TABLE "public"."comment_cluster" RENAME COLUMN "Comment" TO comment;
ALTER TABLE "public"."comment_cluster" RENAME COLUMN "Ad" TO ad;

-- ============================================================
--  5. RECREATE TRIGGERS
-- ============================================================
CREATE TRIGGER set_brand_on_comment_cluster 
BEFORE INSERT OR UPDATE ON public.comment_cluster
FOR EACH ROW EXECUTE FUNCTION update_comment_cluster_brand_from_ad_account();

CREATE TRIGGER set_brand_on_comment 
BEFORE INSERT OR UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION set_comment_brand();