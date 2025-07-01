-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Ad per Ad Account (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ad_name text,
  account_id text,
  creative_id text,
  ad_text text,
  ad_title text,
  image text,
  video text,
  brand text,
  post_link text,
  Created At timestamp with time zone,
  Image_url text,
  video_url text,
  ad_id text NOT NULL UNIQUE,
  ad per account text,
  Angel text,
  Angel Type text,
  Explanation text,
  CONSTRAINT Ad per Ad Account_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Cluster Comments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  comment_id text NOT NULL UNIQUE,
  CONSTRAINT Cluster Comments_pkey PRIMARY KEY (id, comment_id),
  CONSTRAINT Cluster Comments_id_fkey FOREIGN KEY (id) REFERENCES public.Comment Claster(id),
  CONSTRAINT Cluster Comments_comment id_fkey FOREIGN KEY (comment_id) REFERENCES public.Comments(comment_id)
);
CREATE TABLE public.Comment Claster (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  Cluster name text,
  Cluster Description text,
  Comment text,
  Ad text,
  meta_cluster text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ad_id text,
  comment_id text,
  brand text,
  CONSTRAINT Comment Claster_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Comments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  comment_id text UNIQUE,
  message text,
  created_time timestamp without time zone,
  ad_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  theme text,
  sentiment text,
  brand text,
  CONSTRAINT Comments_pkey PRIMARY KEY (id),
  CONSTRAINT Comments_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.Ad per Ad Account(ad_id)
);
CREATE TABLE public.Prompt (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  Prompts text,
  Name text,
  Examples text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT Prompt_pkey PRIMARY KEY (id)
);
CREATE TABLE public.comment_assignments (
  assignment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  comment_id character varying NOT NULL,
  cluster_id uuid NOT NULL,
  similarity_score double precision CHECK (similarity_score >= '-1'::integer::double precision AND similarity_score <= 1::double precision),
  assignment_method character varying CHECK (assignment_method::text = ANY (ARRAY['hybrid'::character varying, 'embedding_only'::character varying, 'llm_only'::character varying, 'new_cluster'::character varying, 'manual'::character varying]::text[])),
  confidence_score double precision CHECK (confidence_score >= 0::double precision AND confidence_score <= 1::double precision),
  llm_reasoning text,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_assignments_pkey PRIMARY KEY (assignment_id),
  CONSTRAINT comment_assignments_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.comment_clusters(cluster_id)
);
CREATE TABLE public.comment_clusters (
  cluster_id uuid NOT NULL DEFAULT gen_random_uuid(),
  cluster_name character varying,
  cluster_description text,
  meta_cluster character varying,
  ad_id character varying,
  centroid_embedding USER-DEFINED NOT NULL,
  comment_count integer DEFAULT 1 CHECK (comment_count > 0),
  sample_comments ARRAY DEFAULT '{}'::text[] CHECK (array_length(sample_comments, 1) <= 5),
  avg_similarity_score double precision DEFAULT 0.0,
  cluster_cohesion double precision DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  content text,
  metadata jsonb,
  embedding USER-DEFINED,
  CONSTRAINT comment_clusters_pkey PRIMARY KEY (cluster_id)
);
CREATE TABLE public.comments (
  comment_id character varying NOT NULL,
  ad_id character varying NOT NULL,
  comment_text text NOT NULL,
  author_name character varying,
  likes_count integer DEFAULT 0,
  replies_count integer DEFAULT 0,
  sentiment_score double precision,
  theme character varying,
  sentiment character varying,
  embedding USER-DEFINED,
  embedding_model character varying DEFAULT 'text-embedding-3-small'::character varying,
  comment_created_at timestamp with time zone,
  processed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (comment_id)
);
CREATE TABLE public.report_metadata (
  id uuid NOT NULL,
  title text NOT NULL,
  brand text NOT NULL,
  created timestamp with time zone NOT NULL,
  adcount integer NOT NULL,
  CONSTRAINT report_metadata_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_id_fkey FOREIGN KEY (id) REFERENCES public.report_metadata(id)
);