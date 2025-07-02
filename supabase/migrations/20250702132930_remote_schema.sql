drop trigger if exists "set_brand_on_comment_cluster" on "public"."Comment Claster";

drop trigger if exists "set_brand_on_comment" on "public"."Comments";

drop trigger if exists "populate_cluster_trigger" on "public"."comment_clusters";

revoke delete on table "public"."Ad per Ad Account" from "anon";

revoke insert on table "public"."Ad per Ad Account" from "anon";

revoke references on table "public"."Ad per Ad Account" from "anon";

revoke select on table "public"."Ad per Ad Account" from "anon";

revoke trigger on table "public"."Ad per Ad Account" from "anon";

revoke truncate on table "public"."Ad per Ad Account" from "anon";

revoke update on table "public"."Ad per Ad Account" from "anon";

revoke delete on table "public"."Ad per Ad Account" from "authenticated";

revoke insert on table "public"."Ad per Ad Account" from "authenticated";

revoke references on table "public"."Ad per Ad Account" from "authenticated";

revoke select on table "public"."Ad per Ad Account" from "authenticated";

revoke trigger on table "public"."Ad per Ad Account" from "authenticated";

revoke truncate on table "public"."Ad per Ad Account" from "authenticated";

revoke update on table "public"."Ad per Ad Account" from "authenticated";

revoke delete on table "public"."Ad per Ad Account" from "service_role";

revoke insert on table "public"."Ad per Ad Account" from "service_role";

revoke references on table "public"."Ad per Ad Account" from "service_role";

revoke select on table "public"."Ad per Ad Account" from "service_role";

revoke trigger on table "public"."Ad per Ad Account" from "service_role";

revoke truncate on table "public"."Ad per Ad Account" from "service_role";

revoke update on table "public"."Ad per Ad Account" from "service_role";

revoke delete on table "public"."Cluster Comments" from "anon";

revoke insert on table "public"."Cluster Comments" from "anon";

revoke references on table "public"."Cluster Comments" from "anon";

revoke select on table "public"."Cluster Comments" from "anon";

revoke trigger on table "public"."Cluster Comments" from "anon";

revoke truncate on table "public"."Cluster Comments" from "anon";

revoke update on table "public"."Cluster Comments" from "anon";

revoke delete on table "public"."Cluster Comments" from "authenticated";

revoke insert on table "public"."Cluster Comments" from "authenticated";

revoke references on table "public"."Cluster Comments" from "authenticated";

revoke select on table "public"."Cluster Comments" from "authenticated";

revoke trigger on table "public"."Cluster Comments" from "authenticated";

revoke truncate on table "public"."Cluster Comments" from "authenticated";

revoke update on table "public"."Cluster Comments" from "authenticated";

revoke delete on table "public"."Cluster Comments" from "service_role";

revoke insert on table "public"."Cluster Comments" from "service_role";

revoke references on table "public"."Cluster Comments" from "service_role";

revoke select on table "public"."Cluster Comments" from "service_role";

revoke trigger on table "public"."Cluster Comments" from "service_role";

revoke truncate on table "public"."Cluster Comments" from "service_role";

revoke update on table "public"."Cluster Comments" from "service_role";

revoke delete on table "public"."Comment Claster" from "anon";

revoke insert on table "public"."Comment Claster" from "anon";

revoke references on table "public"."Comment Claster" from "anon";

revoke select on table "public"."Comment Claster" from "anon";

revoke trigger on table "public"."Comment Claster" from "anon";

revoke truncate on table "public"."Comment Claster" from "anon";

revoke update on table "public"."Comment Claster" from "anon";

revoke delete on table "public"."Comment Claster" from "authenticated";

revoke insert on table "public"."Comment Claster" from "authenticated";

revoke references on table "public"."Comment Claster" from "authenticated";

revoke select on table "public"."Comment Claster" from "authenticated";

revoke trigger on table "public"."Comment Claster" from "authenticated";

revoke truncate on table "public"."Comment Claster" from "authenticated";

revoke update on table "public"."Comment Claster" from "authenticated";

revoke delete on table "public"."Comment Claster" from "service_role";

revoke insert on table "public"."Comment Claster" from "service_role";

revoke references on table "public"."Comment Claster" from "service_role";

revoke select on table "public"."Comment Claster" from "service_role";

revoke trigger on table "public"."Comment Claster" from "service_role";

revoke truncate on table "public"."Comment Claster" from "service_role";

revoke update on table "public"."Comment Claster" from "service_role";

revoke delete on table "public"."Comments" from "anon";

revoke insert on table "public"."Comments" from "anon";

revoke references on table "public"."Comments" from "anon";

revoke select on table "public"."Comments" from "anon";

revoke trigger on table "public"."Comments" from "anon";

revoke truncate on table "public"."Comments" from "anon";

revoke update on table "public"."Comments" from "anon";

revoke delete on table "public"."Comments" from "authenticated";

revoke insert on table "public"."Comments" from "authenticated";

revoke references on table "public"."Comments" from "authenticated";

revoke select on table "public"."Comments" from "authenticated";

revoke trigger on table "public"."Comments" from "authenticated";

revoke truncate on table "public"."Comments" from "authenticated";

revoke update on table "public"."Comments" from "authenticated";

revoke delete on table "public"."Comments" from "service_role";

revoke insert on table "public"."Comments" from "service_role";

revoke references on table "public"."Comments" from "service_role";

revoke select on table "public"."Comments" from "service_role";

revoke trigger on table "public"."Comments" from "service_role";

revoke truncate on table "public"."Comments" from "service_role";

revoke update on table "public"."Comments" from "service_role";

revoke delete on table "public"."Prompt" from "anon";

revoke insert on table "public"."Prompt" from "anon";

revoke references on table "public"."Prompt" from "anon";

revoke select on table "public"."Prompt" from "anon";

revoke trigger on table "public"."Prompt" from "anon";

revoke truncate on table "public"."Prompt" from "anon";

revoke update on table "public"."Prompt" from "anon";

revoke delete on table "public"."Prompt" from "authenticated";

revoke insert on table "public"."Prompt" from "authenticated";

revoke references on table "public"."Prompt" from "authenticated";

revoke select on table "public"."Prompt" from "authenticated";

revoke trigger on table "public"."Prompt" from "authenticated";

revoke truncate on table "public"."Prompt" from "authenticated";

revoke update on table "public"."Prompt" from "authenticated";

revoke delete on table "public"."Prompt" from "service_role";

revoke insert on table "public"."Prompt" from "service_role";

revoke references on table "public"."Prompt" from "service_role";

revoke select on table "public"."Prompt" from "service_role";

revoke trigger on table "public"."Prompt" from "service_role";

revoke truncate on table "public"."Prompt" from "service_role";

revoke update on table "public"."Prompt" from "service_role";

revoke delete on table "public"."comment_assignments" from "anon";

revoke insert on table "public"."comment_assignments" from "anon";

revoke references on table "public"."comment_assignments" from "anon";

revoke select on table "public"."comment_assignments" from "anon";

revoke trigger on table "public"."comment_assignments" from "anon";

revoke truncate on table "public"."comment_assignments" from "anon";

revoke update on table "public"."comment_assignments" from "anon";

revoke delete on table "public"."comment_assignments" from "authenticated";

revoke insert on table "public"."comment_assignments" from "authenticated";

revoke references on table "public"."comment_assignments" from "authenticated";

revoke select on table "public"."comment_assignments" from "authenticated";

revoke trigger on table "public"."comment_assignments" from "authenticated";

revoke truncate on table "public"."comment_assignments" from "authenticated";

revoke update on table "public"."comment_assignments" from "authenticated";

revoke delete on table "public"."comment_assignments" from "service_role";

revoke insert on table "public"."comment_assignments" from "service_role";

revoke references on table "public"."comment_assignments" from "service_role";

revoke select on table "public"."comment_assignments" from "service_role";

revoke trigger on table "public"."comment_assignments" from "service_role";

revoke truncate on table "public"."comment_assignments" from "service_role";

revoke update on table "public"."comment_assignments" from "service_role";

revoke delete on table "public"."comment_clusters" from "anon";

revoke insert on table "public"."comment_clusters" from "anon";

revoke references on table "public"."comment_clusters" from "anon";

revoke select on table "public"."comment_clusters" from "anon";

revoke trigger on table "public"."comment_clusters" from "anon";

revoke truncate on table "public"."comment_clusters" from "anon";

revoke update on table "public"."comment_clusters" from "anon";

revoke delete on table "public"."comment_clusters" from "authenticated";

revoke insert on table "public"."comment_clusters" from "authenticated";

revoke references on table "public"."comment_clusters" from "authenticated";

revoke select on table "public"."comment_clusters" from "authenticated";

revoke trigger on table "public"."comment_clusters" from "authenticated";

revoke truncate on table "public"."comment_clusters" from "authenticated";

revoke update on table "public"."comment_clusters" from "authenticated";

revoke delete on table "public"."comment_clusters" from "service_role";

revoke insert on table "public"."comment_clusters" from "service_role";

revoke references on table "public"."comment_clusters" from "service_role";

revoke select on table "public"."comment_clusters" from "service_role";

revoke trigger on table "public"."comment_clusters" from "service_role";

revoke truncate on table "public"."comment_clusters" from "service_role";

revoke update on table "public"."comment_clusters" from "service_role";

revoke delete on table "public"."report_metadata" from "anon";

revoke insert on table "public"."report_metadata" from "anon";

revoke references on table "public"."report_metadata" from "anon";

revoke select on table "public"."report_metadata" from "anon";

revoke trigger on table "public"."report_metadata" from "anon";

revoke truncate on table "public"."report_metadata" from "anon";

revoke update on table "public"."report_metadata" from "anon";

revoke delete on table "public"."report_metadata" from "authenticated";

revoke insert on table "public"."report_metadata" from "authenticated";

revoke references on table "public"."report_metadata" from "authenticated";

revoke select on table "public"."report_metadata" from "authenticated";

revoke trigger on table "public"."report_metadata" from "authenticated";

revoke truncate on table "public"."report_metadata" from "authenticated";

revoke update on table "public"."report_metadata" from "authenticated";

revoke delete on table "public"."report_metadata" from "service_role";

revoke insert on table "public"."report_metadata" from "service_role";

revoke references on table "public"."report_metadata" from "service_role";

revoke select on table "public"."report_metadata" from "service_role";

revoke trigger on table "public"."report_metadata" from "service_role";

revoke truncate on table "public"."report_metadata" from "service_role";

revoke update on table "public"."report_metadata" from "service_role";

revoke delete on table "public"."reports" from "anon";

revoke insert on table "public"."reports" from "anon";

revoke references on table "public"."reports" from "anon";

revoke select on table "public"."reports" from "anon";

revoke trigger on table "public"."reports" from "anon";

revoke truncate on table "public"."reports" from "anon";

revoke update on table "public"."reports" from "anon";

revoke delete on table "public"."reports" from "authenticated";

revoke insert on table "public"."reports" from "authenticated";

revoke references on table "public"."reports" from "authenticated";

revoke select on table "public"."reports" from "authenticated";

revoke trigger on table "public"."reports" from "authenticated";

revoke truncate on table "public"."reports" from "authenticated";

revoke update on table "public"."reports" from "authenticated";

revoke delete on table "public"."reports" from "service_role";

revoke insert on table "public"."reports" from "service_role";

revoke references on table "public"."reports" from "service_role";

revoke select on table "public"."reports" from "service_role";

revoke trigger on table "public"."reports" from "service_role";

revoke truncate on table "public"."reports" from "service_role";

revoke update on table "public"."reports" from "service_role";

alter table "public"."Ad per Ad Account" drop constraint "Ad per Ad Account_ad_id_key";

alter table "public"."Ad per Ad Account" drop constraint "Ad per Ad Account_id_key";

alter table "public"."Cluster Comments" drop constraint "Cluster Comments_comment id_fkey";

alter table "public"."Cluster Comments" drop constraint "Cluster Comments_comment_id_key";

alter table "public"."Cluster Comments" drop constraint "Cluster Comments_id_fkey";

alter table "public"."Comments" drop constraint "Comments_ad_id_fkey";

alter table "public"."Comments" drop constraint "Comments_comment_id_key";

alter table "public"."comment_assignments" drop constraint "comment_assignments_assignment_method_check";

alter table "public"."comment_assignments" drop constraint "comment_assignments_cluster_id_fkey";

alter table "public"."comment_assignments" drop constraint "comment_assignments_comment_id_cluster_id_key";

alter table "public"."comment_assignments" drop constraint "comment_assignments_confidence_score_check";

alter table "public"."comment_assignments" drop constraint "comment_assignments_similarity_score_check";

alter table "public"."comment_clusters" drop constraint "comment_clusters_comment_count_check";

alter table "public"."comment_clusters" drop constraint "comment_clusters_sample_comments_check";

alter table "public"."reports" drop constraint "reports_id_fkey";

alter table "public"."Ad per Ad Account" drop constraint "Ad per Ad Account_pkey";

alter table "public"."Cluster Comments" drop constraint "Cluster Comments_pkey";

alter table "public"."Comment Claster" drop constraint "Comment Claster_pkey";

alter table "public"."Comments" drop constraint "Comments_pkey";

alter table "public"."Prompt" drop constraint "Prompt_pkey";

alter table "public"."comment_assignments" drop constraint "comment_assignments_pkey";

alter table "public"."comment_clusters" drop constraint "comment_clusters_pkey";

alter table "public"."comments" drop constraint "comments_pkey";

alter table "public"."report_metadata" drop constraint "report_metadata_pkey";

alter table "public"."reports" drop constraint "reports_pkey";

drop index if exists "public"."comment_assignments_comment_id_cluster_id_key";

drop index if exists "public"."comment_assignments_pkey";

drop index if exists "public"."comment_clusters_pkey";

drop index if exists "public"."comments_pkey";

drop index if exists "public"."idx_assignments_cluster_id";

drop index if exists "public"."idx_assignments_comment_id";

drop index if exists "public"."idx_clusters_ad_id";

drop index if exists "public"."idx_clusters_ad_name";

drop index if exists "public"."idx_clusters_embedding";

drop index if exists "public"."idx_clusters_updated_at";

drop index if exists "public"."idx_comments_ad_id";

drop index if exists "public"."idx_comments_embedding";

drop index if exists "public"."idx_comments_processed_at";

drop index if exists "public"."idx_report_metadata_brand";

drop index if exists "public"."idx_report_metadata_created";

drop index if exists "public"."report_metadata_pkey";

drop index if exists "public"."reports_pkey";

drop index if exists "public"."Ad per Ad Account_ad_id_key";

drop index if exists "public"."Ad per Ad Account_id_key";

drop index if exists "public"."Ad per Ad Account_pkey";

drop index if exists "public"."Cluster Comments_comment_id_key";

drop index if exists "public"."Cluster Comments_pkey";

drop index if exists "public"."Comment Claster_pkey";

drop index if exists "public"."Comments_comment_id_key";

drop index if exists "public"."Comments_pkey";

drop index if exists "public"."Prompt_pkey";

drop table "public"."Ad per Ad Account";

drop table "public"."Cluster Comments";

drop table "public"."Comment Claster";

drop table "public"."Comments";

drop table "public"."Prompt";

drop table "public"."comment_assignments";

drop table "public"."comment_clusters";

drop table "public"."report_metadata";

drop table "public"."reports";

create table "public"."ad_per_ad_account" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "ad_name" text,
    "account_id" text,
    "creative_id" text,
    "ad_text" text,
    "ad_title" text,
    "image" text,
    "video" text,
    "brand" text,
    "post_link" text,
    "Created At" timestamp with time zone,
    "Image_url" text,
    "video_url" text,
    "ad_id" text not null,
    "ad per account" text,
    "Angel" text,
    "Angel Type" text,
    "Explanation" text
);


create table "public"."cluster_comments" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "comment_id" text not null
);


create table "public"."comment_cluster" (
    "id" bigint generated by default as identity not null,
    "cluster_name" text,
    "cluster_description" text,
    "comment" text,
    "ad" text,
    "meta_cluster" text,
    "created_at" timestamp with time zone not null default now(),
    "ad_id" text,
    "comment_id" text,
    "brand" text
);


create table "public"."prompt" (
    "id" bigint generated by default as identity not null,
    "prompts" text,
    "name" text,
    "examples" text,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."comments" drop column "author_name";

alter table "public"."comments" drop column "comment_created_at";

alter table "public"."comments" drop column "comment_text";

alter table "public"."comments" drop column "embedding";

alter table "public"."comments" drop column "embedding_model";

alter table "public"."comments" drop column "likes_count";

alter table "public"."comments" drop column "processed_at";

alter table "public"."comments" drop column "replies_count";

alter table "public"."comments" drop column "sentiment_score";

alter table "public"."comments" add column "brand" text;

alter table "public"."comments" add column "created_at" timestamp with time zone not null default now();

alter table "public"."comments" add column "created_time" timestamp without time zone;

alter table "public"."comments" add column "id" bigint generated by default as identity not null;

alter table "public"."comments" add column "message" text;

alter table "public"."comments" alter column "ad_id" drop not null;

alter table "public"."comments" alter column "ad_id" set data type text using "ad_id"::text;

alter table "public"."comments" alter column "comment_id" drop not null;

alter table "public"."comments" alter column "comment_id" set data type text using "comment_id"::text;

alter table "public"."comments" alter column "sentiment" set data type text using "sentiment"::text;

alter table "public"."comments" alter column "theme" set data type text using "theme"::text;

CREATE UNIQUE INDEX "Ad per Ad Account_ad_id_key" ON public.ad_per_ad_account USING btree (ad_id);

CREATE UNIQUE INDEX "Ad per Ad Account_id_key" ON public.ad_per_ad_account USING btree (id);

CREATE UNIQUE INDEX "Ad per Ad Account_pkey" ON public.ad_per_ad_account USING btree (id);

CREATE UNIQUE INDEX "Cluster Comments_comment_id_key" ON public.cluster_comments USING btree (comment_id);

CREATE UNIQUE INDEX "Cluster Comments_pkey" ON public.cluster_comments USING btree (id, comment_id);

CREATE UNIQUE INDEX "Comment Claster_pkey" ON public.comment_cluster USING btree (id);

CREATE UNIQUE INDEX "Comments_comment_id_key" ON public.comments USING btree (comment_id);

CREATE UNIQUE INDEX "Comments_pkey" ON public.comments USING btree (id);

CREATE UNIQUE INDEX "Prompt_pkey" ON public.prompt USING btree (id);

alter table "public"."ad_per_ad_account" add constraint "Ad per Ad Account_pkey" PRIMARY KEY using index "Ad per Ad Account_pkey";

alter table "public"."cluster_comments" add constraint "Cluster Comments_pkey" PRIMARY KEY using index "Cluster Comments_pkey";

alter table "public"."comment_cluster" add constraint "Comment Claster_pkey" PRIMARY KEY using index "Comment Claster_pkey";

alter table "public"."comments" add constraint "Comments_pkey" PRIMARY KEY using index "Comments_pkey";

alter table "public"."prompt" add constraint "Prompt_pkey" PRIMARY KEY using index "Prompt_pkey";

alter table "public"."ad_per_ad_account" add constraint "Ad per Ad Account_ad_id_key" UNIQUE using index "Ad per Ad Account_ad_id_key";

alter table "public"."ad_per_ad_account" add constraint "Ad per Ad Account_id_key" UNIQUE using index "Ad per Ad Account_id_key";

alter table "public"."cluster_comments" add constraint "Cluster Comments_comment id_fkey" FOREIGN KEY (comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE not valid;

alter table "public"."cluster_comments" validate constraint "Cluster Comments_comment id_fkey";

alter table "public"."cluster_comments" add constraint "Cluster Comments_comment_id_key" UNIQUE using index "Cluster Comments_comment_id_key";

alter table "public"."cluster_comments" add constraint "Cluster Comments_id_fkey" FOREIGN KEY (id) REFERENCES comment_cluster(id) ON DELETE CASCADE not valid;

alter table "public"."cluster_comments" validate constraint "Cluster Comments_id_fkey";

alter table "public"."comments" add constraint "Comments_ad_id_fkey" FOREIGN KEY (ad_id) REFERENCES ad_per_ad_account(ad_id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "Comments_ad_id_fkey";

alter table "public"."comments" add constraint "Comments_comment_id_key" UNIQUE using index "Comments_comment_id_key";

grant delete on table "public"."ad_per_ad_account" to "anon";

grant insert on table "public"."ad_per_ad_account" to "anon";

grant references on table "public"."ad_per_ad_account" to "anon";

grant select on table "public"."ad_per_ad_account" to "anon";

grant trigger on table "public"."ad_per_ad_account" to "anon";

grant truncate on table "public"."ad_per_ad_account" to "anon";

grant update on table "public"."ad_per_ad_account" to "anon";

grant delete on table "public"."ad_per_ad_account" to "authenticated";

grant insert on table "public"."ad_per_ad_account" to "authenticated";

grant references on table "public"."ad_per_ad_account" to "authenticated";

grant select on table "public"."ad_per_ad_account" to "authenticated";

grant trigger on table "public"."ad_per_ad_account" to "authenticated";

grant truncate on table "public"."ad_per_ad_account" to "authenticated";

grant update on table "public"."ad_per_ad_account" to "authenticated";

grant delete on table "public"."ad_per_ad_account" to "service_role";

grant insert on table "public"."ad_per_ad_account" to "service_role";

grant references on table "public"."ad_per_ad_account" to "service_role";

grant select on table "public"."ad_per_ad_account" to "service_role";

grant trigger on table "public"."ad_per_ad_account" to "service_role";

grant truncate on table "public"."ad_per_ad_account" to "service_role";

grant update on table "public"."ad_per_ad_account" to "service_role";

grant delete on table "public"."cluster_comments" to "anon";

grant insert on table "public"."cluster_comments" to "anon";

grant references on table "public"."cluster_comments" to "anon";

grant select on table "public"."cluster_comments" to "anon";

grant trigger on table "public"."cluster_comments" to "anon";

grant truncate on table "public"."cluster_comments" to "anon";

grant update on table "public"."cluster_comments" to "anon";

grant delete on table "public"."cluster_comments" to "authenticated";

grant insert on table "public"."cluster_comments" to "authenticated";

grant references on table "public"."cluster_comments" to "authenticated";

grant select on table "public"."cluster_comments" to "authenticated";

grant trigger on table "public"."cluster_comments" to "authenticated";

grant truncate on table "public"."cluster_comments" to "authenticated";

grant update on table "public"."cluster_comments" to "authenticated";

grant delete on table "public"."cluster_comments" to "service_role";

grant insert on table "public"."cluster_comments" to "service_role";

grant references on table "public"."cluster_comments" to "service_role";

grant select on table "public"."cluster_comments" to "service_role";

grant trigger on table "public"."cluster_comments" to "service_role";

grant truncate on table "public"."cluster_comments" to "service_role";

grant update on table "public"."cluster_comments" to "service_role";

grant delete on table "public"."comment_cluster" to "anon";

grant insert on table "public"."comment_cluster" to "anon";

grant references on table "public"."comment_cluster" to "anon";

grant select on table "public"."comment_cluster" to "anon";

grant trigger on table "public"."comment_cluster" to "anon";

grant truncate on table "public"."comment_cluster" to "anon";

grant update on table "public"."comment_cluster" to "anon";

grant delete on table "public"."comment_cluster" to "authenticated";

grant insert on table "public"."comment_cluster" to "authenticated";

grant references on table "public"."comment_cluster" to "authenticated";

grant select on table "public"."comment_cluster" to "authenticated";

grant trigger on table "public"."comment_cluster" to "authenticated";

grant truncate on table "public"."comment_cluster" to "authenticated";

grant update on table "public"."comment_cluster" to "authenticated";

grant delete on table "public"."comment_cluster" to "service_role";

grant insert on table "public"."comment_cluster" to "service_role";

grant references on table "public"."comment_cluster" to "service_role";

grant select on table "public"."comment_cluster" to "service_role";

grant trigger on table "public"."comment_cluster" to "service_role";

grant truncate on table "public"."comment_cluster" to "service_role";

grant update on table "public"."comment_cluster" to "service_role";

grant delete on table "public"."prompt" to "anon";

grant insert on table "public"."prompt" to "anon";

grant references on table "public"."prompt" to "anon";

grant select on table "public"."prompt" to "anon";

grant trigger on table "public"."prompt" to "anon";

grant truncate on table "public"."prompt" to "anon";

grant update on table "public"."prompt" to "anon";

grant delete on table "public"."prompt" to "authenticated";

grant insert on table "public"."prompt" to "authenticated";

grant references on table "public"."prompt" to "authenticated";

grant select on table "public"."prompt" to "authenticated";

grant trigger on table "public"."prompt" to "authenticated";

grant truncate on table "public"."prompt" to "authenticated";

grant update on table "public"."prompt" to "authenticated";

grant delete on table "public"."prompt" to "service_role";

grant insert on table "public"."prompt" to "service_role";

grant references on table "public"."prompt" to "service_role";

grant select on table "public"."prompt" to "service_role";

grant trigger on table "public"."prompt" to "service_role";

grant truncate on table "public"."prompt" to "service_role";

grant update on table "public"."prompt" to "service_role";

CREATE TRIGGER set_brand_on_comment_cluster BEFORE INSERT OR UPDATE ON public.comment_cluster FOR EACH ROW EXECUTE FUNCTION update_comment_cluster_brand_from_ad_account();

CREATE TRIGGER set_brand_on_comment BEFORE INSERT OR UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION set_comment_brand();


