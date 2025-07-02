

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."dashboard_metrics"("start_date" "text" DEFAULT NULL::"text", "end_date" "text" DEFAULT NULL::"text", "brand_filter" "text" DEFAULT NULL::"text", "sentiment_filter" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_ads integer;
  total_comments integer;
  positive integer;
  negative integer;
  neutral integer;
  positive_pct numeric;
  negative_pct numeric;
  neutral_pct numeric;
BEGIN
  -- Total ads
  SELECT count(*) INTO total_ads
  FROM "Ad per Ad Account" a
  WHERE (start_date IS NULL OR a.created_at >= start_date::date)
    AND (end_date IS NULL OR a.created_at <= end_date::date)
    AND (brand_filter IS NULL OR a.brand = brand_filter);

  -- Total comments
  SELECT count(*) INTO total_comments
  FROM "Comments" c
  WHERE (start_date IS NULL OR c.created_time >= start_date::date)
    AND (end_date IS NULL OR c.created_time <= end_date::date)
    AND (brand_filter IS NULL OR c.brand = brand_filter)
    AND (sentiment_filter IS NULL OR c.sentiment = sentiment_filter);

  -- Sentiment counts
  SELECT count(*) FILTER (WHERE lower(sentiment) = 'positive') INTO positive
  FROM "Comments" c
  WHERE (start_date IS NULL OR c.created_time >= start_date::date)
    AND (end_date IS NULL OR c.created_time <= end_date::date)
    AND (brand_filter IS NULL OR c.brand = brand_filter)
    AND (sentiment_filter IS NULL OR c.sentiment = sentiment_filter);

  SELECT count(*) FILTER (WHERE lower(sentiment) = 'negative') INTO negative
  FROM "Comments" c
  WHERE (start_date IS NULL OR c.created_time >= start_date::date)
    AND (end_date IS NULL OR c.created_time <= end_date::date)
    AND (brand_filter IS NULL OR c.brand = brand_filter)
    AND (sentiment_filter IS NULL OR c.sentiment = sentiment_filter);

  SELECT count(*) FILTER (WHERE lower(sentiment) = 'neutral') INTO neutral
  FROM "Comments" c
  WHERE (start_date IS NULL OR c.created_time >= start_date::date)
    AND (end_date IS NULL OR c.created_time <= end_date::date)
    AND (brand_filter IS NULL OR c.brand = brand_filter)
    AND (sentiment_filter IS NULL OR c.sentiment = sentiment_filter);

  -- Sentiment percentages
  IF total_comments > 0 THEN
    positive_pct := round(positive::numeric * 100 / total_comments, 2);
    negative_pct := round(negative::numeric * 100 / total_comments, 2);
    neutral_pct := round(neutral::numeric * 100 / total_comments, 2);
  ELSE
    positive_pct := 0;
    negative_pct := 0;
    neutral_pct := 0;
  END IF;

  RETURN json_build_object(
    'total_ads', total_ads,
    'total_comments', total_comments,
    'positive', positive,
    'negative', negative,
    'neutral', neutral,
    'positive_pct', positive_pct,
    'negative_pct', negative_pct,
    'neutral_pct', neutral_pct
  );
END;
$$;


ALTER FUNCTION "public"."dashboard_metrics"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_metrics"("start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "brand_filter" "text" DEFAULT NULL::"text", "sentiment_filter" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_ads int;
  total_comments int;
  positive int;
  negative int;
  neutral int;
BEGIN
  -- Total ads (filtered by brand and business timestamp)
  SELECT COUNT(*) INTO total_ads
    FROM "Ad per Ad Account"
    WHERE (brand_filter IS NULL OR brand = brand_filter)
      AND (start_date IS NULL OR "Created At" >= start_date)
      AND (end_date IS NULL OR "Created At" <= end_date);

  -- Total comments (filtered by business timestamp)
  SELECT COUNT(*) INTO total_comments
    FROM "Comments"
    WHERE (start_date IS NULL OR created_time >= start_date)
      AND (end_date IS NULL OR created_time <= end_date)
      AND (brand_filter IS NULL OR brand = brand_filter)
      AND (sentiment_filter IS NULL OR LOWER(sentiment) = LOWER(sentiment_filter));

  -- Sentiment counts (case-insensitive, filtered by business timestamp)
  SELECT COUNT(*) INTO positive FROM "Comments"
    WHERE LOWER(sentiment) = 'positive'
      AND (start_date IS NULL OR created_time >= start_date)
      AND (end_date IS NULL OR created_time <= end_date)
      AND (brand_filter IS NULL OR brand = brand_filter);

  SELECT COUNT(*) INTO negative FROM "Comments"
    WHERE LOWER(sentiment) = 'negative'
      AND (start_date IS NULL OR created_time >= start_date)
      AND (end_date IS NULL OR created_time <= end_date)
      AND (brand_filter IS NULL OR brand = brand_filter);

  SELECT COUNT(*) INTO neutral FROM "Comments"
    WHERE LOWER(sentiment) = 'neutral'
      AND (start_date IS NULL OR created_time >= start_date)
      AND (end_date IS NULL OR created_time <= end_date)
      AND (brand_filter IS NULL OR brand = brand_filter);

  RETURN jsonb_build_object(
    'total_ads', total_ads,
    'total_comments', total_comments,
    'positive', positive,
    'negative', negative,
    'neutral', neutral,
    'positive_pct', CASE WHEN total_comments > 0 THEN ROUND(positive::numeric / total_comments * 100, 2) ELSE 0 END,
    'negative_pct', CASE WHEN total_comments > 0 THEN ROUND(negative::numeric / total_comments * 100, 2) ELSE 0 END,
    'neutral_pct', CASE WHEN total_comments > 0 THEN ROUND(neutral::numeric / total_comments * 100, 2) ELSE 0 END
  );
END;
$$;


ALTER FUNCTION "public"."dashboard_metrics"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_similar_clusters"("query_embedding" "public"."vector", "target_ad_id" character varying, "similarity_threshold" double precision DEFAULT 0.5, "max_results" integer DEFAULT 3) RETURNS TABLE("cluster_id" "uuid", "cluster_name" character varying, "cluster_description" "text", "centroid_embedding" "public"."vector", "sample_comments" "text"[], "comment_count" integer, "similarity_score" double precision)
    LANGUAGE "sql"
    AS $$
    select 
        c.cluster_id,
        c.cluster_name,
        c.cluster_description,
        c.centroid_embedding,
        c.sample_comments,
        c.comment_count,
        (c.centroid_embedding <=> query_embedding) * -1 + 1 as similarity_score
    from comment_clusters c
    where c.ad_id = target_ad_id
    and (c.centroid_embedding <=> query_embedding) < (1 - similarity_threshold)
    order by c.centroid_embedding <=> query_embedding
    limit max_results;
$$;


ALTER FUNCTION "public"."find_similar_clusters"("query_embedding" "public"."vector", "target_ad_id" character varying, "similarity_threshold" double precision, "max_results" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."full_dashboard_data"("start_date" "text" DEFAULT NULL::"text", "end_date" "text" DEFAULT NULL::"text", "brand_filter" "text" DEFAULT NULL::"text", "sentiment_filter" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  metrics json;
  top_ads json;
  time_series json;
  all_dates text[];
  actual_start_date date;
BEGIN
  -- If start_date is 1970-01-01 or starts with 1970-01-01, treat as lifetime and use the oldest ad date
  IF start_date IS NOT NULL AND (start_date LIKE '1970-01-01%' OR start_date::date = '1970-01-01') THEN
    SELECT min(created_at)::date INTO actual_start_date FROM "Ad per Ad Account";
  ELSE
    actual_start_date := COALESCE(start_date::date, (SELECT min(created_at)::date FROM "Ad per Ad Account"));
  END IF;

  -- Metrics (reuse existing logic)
  SELECT public.dashboard_metrics(actual_start_date::text, end_date, brand_filter, sentiment_filter) INTO metrics;

  -- Top ads (reuse existing logic)
  SELECT json_agg(t) FROM (
    SELECT ad_id, ad_name, comment_count
    FROM public.top_ads_by_comments(actual_start_date::text, end_date, brand_filter, sentiment_filter, 5)
  ) t INTO top_ads;

  -- Get all dates in range
  SELECT array_agg(date::text) FROM (
    SELECT to_char(d, 'YYYY-MM-DD') AS date
    FROM generate_series(
      actual_start_date,
      COALESCE(end_date::date, (SELECT max(created_time)::date FROM "Comments")),
      interval '1 day'
    ) d
  ) x INTO all_dates;

  -- Build datasets for each sentiment
  SELECT json_build_object(
    'labels', all_dates,
    'datasets', json_agg(
      json_build_object(
        'name', sentiment,
        'data', (
          SELECT array_agg(cnt ORDER BY date_label)
          FROM (
            SELECT d AS date_label,
                   COALESCE(count(c.id), 0) AS cnt
            FROM unnest(all_dates) d
            LEFT JOIN "Comments" c ON to_char(c.created_time, 'YYYY-MM-DD') = d
              AND (brand_filter IS NULL OR c.brand = brand_filter)
              AND (sentiment_filter IS NULL OR c.sentiment = sentiment_filter)
              AND lower(c.sentiment) = lower(sentiment)
            GROUP BY d
            ORDER BY d
          ) sub
        )
      )
    )
  ) INTO time_series
  FROM (SELECT unnest(array['Positive','Negative','Neutral']) AS sentiment) s;

  RETURN json_build_object(
    'metrics', metrics,
    'topAds', top_ads,
    'timeSeriesData', COALESCE(time_series, json_build_object('labels', ARRAY[]::text[], 'datasets', ARRAY[]::json[]))
  );
END;
$$;


ALTER FUNCTION "public"."full_dashboard_data"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."period_comparison_metrics"("current_start" timestamp with time zone, "current_end" timestamp with time zone, "previous_start" timestamp with time zone, "previous_end" timestamp with time zone, "brand_filter" "text" DEFAULT NULL::"text", "sentiment_filter" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  curr_comments int;
  prev_comments int;
  curr_positive int;
  prev_positive int;
  curr_negative int;
  prev_negative int;
  curr_neutral int;
  prev_neutral int;
BEGIN
  -- Current period
  SELECT COUNT(*) INTO curr_comments FROM "Comments"
    WHERE (brand_filter IS NULL OR brand = brand_filter)
      AND (sentiment_filter IS NULL OR LOWER(sentiment) = LOWER(sentiment_filter))
      AND created_time >= current_start AND created_time <= current_end;
  SELECT COUNT(*) INTO curr_positive FROM "Comments"
    WHERE (brand_filter IS NULL OR brand = brand_filter)
      AND LOWER(sentiment) = 'positive'
      AND created_time >= current_start AND created_time <= current_end;
  SELECT COUNT(*) INTO curr_negative FROM "Comments"
    WHERE (brand_filter IS NULL OR brand = brand_filter)
      AND LOWER(sentiment) = 'negative'
      AND created_time >= current_start AND created_time <= current_end;
  SELECT COUNT(*) INTO curr_neutral FROM "Comments"
    WHERE (brand_filter IS NULL OR brand = brand_filter)
      AND LOWER(sentiment) = 'neutral'
      AND created_time >= current_start AND created_time <= current_end;

  -- Previous period
  SELECT COUNT(*) INTO prev_comments FROM "Comments"
    WHERE (brand_filter IS NULL OR brand = brand_filter)
      AND (sentiment_filter IS NULL OR LOWER(sentiment) = LOWER(sentiment_filter))
      AND created_time >= previous_start AND created_time <= previous_end;
  SELECT COUNT(*) INTO prev_positive FROM "Comments"
    WHERE (brand_filter IS NULL OR brand = brand_filter)
      AND LOWER(sentiment) = 'positive'
      AND created_time >= previous_start AND created_time <= previous_end;
  SELECT COUNT(*) INTO prev_negative FROM "Comments"
    WHERE (brand_filter IS NULL OR brand = brand_filter)
      AND LOWER(sentiment) = 'negative'
      AND created_time >= previous_start AND created_time <= previous_end;
  SELECT COUNT(*) INTO prev_neutral FROM "Comments"
    WHERE (brand_filter IS NULL OR brand = brand_filter)
      AND LOWER(sentiment) = 'neutral'
      AND created_time >= previous_start AND created_time <= previous_end;

  RETURN jsonb_build_object(
    'current_total_comments', curr_comments,
    'previous_total_comments', prev_comments,
    'comments_change_pct', CASE WHEN prev_comments > 0 THEN ROUND((curr_comments::numeric - prev_comments) / prev_comments * 100, 2) ELSE NULL END,
    'current_positive', curr_positive,
    'previous_positive', prev_positive,
    'positive_change_pct', CASE WHEN prev_positive > 0 THEN ROUND((curr_positive::numeric - prev_positive) / prev_positive * 100, 2) ELSE NULL END,
    'current_negative', curr_negative,
    'previous_negative', prev_negative,
    'negative_change_pct', CASE WHEN prev_negative > 0 THEN ROUND((curr_negative::numeric - prev_negative) / prev_negative * 100, 2) ELSE NULL END,
    'current_neutral', curr_neutral,
    'previous_neutral', prev_neutral,
    'neutral_change_pct', CASE WHEN prev_neutral > 0 THEN ROUND((curr_neutral::numeric - prev_neutral) / prev_neutral * 100, 2) ELSE NULL END
  );
END;
$$;


ALTER FUNCTION "public"."period_comparison_metrics"("current_start" timestamp with time zone, "current_end" timestamp with time zone, "previous_start" timestamp with time zone, "previous_end" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_cluster_from_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    base_name text;
    counter integer := 1;
    final_name text;
BEGIN
    -- If metadata exists, populate the fields
    IF NEW.metadata IS NOT NULL THEN
        base_name := NEW.metadata->>'cluster_name';
        final_name := base_name;
        
        -- Check if cluster name already exists for this ad_id
        WHILE EXISTS (
            SELECT 1 FROM comment_clusters 
            WHERE cluster_name = final_name 
            AND ad_id = NEW.metadata->>'ad_id'
            AND cluster_id != NEW.cluster_id
        ) LOOP
            counter := counter + 1;
            final_name := base_name || '_' || counter;
        END LOOP;
        
        NEW.cluster_name := final_name;
        NEW.cluster_description := COALESCE(NEW.cluster_description, NEW.content);
        NEW.ad_id := COALESCE(NEW.ad_id, NEW.metadata->>'ad_id');
        NEW.meta_cluster := COALESCE(NEW.meta_cluster, NEW.metadata->>'meta_cluster');
        NEW.comment_count := COALESCE(NEW.comment_count, (NEW.metadata->>'comment_count')::integer, 1);
        
        -- Set the centroid_embedding to the same as embedding if not set
        NEW.centroid_embedding := COALESCE(NEW.centroid_embedding, NEW.embedding);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."populate_cluster_from_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_ad_account_comment_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if ad_id is not null in the new row
  IF NEW.ad_id IS NOT NULL THEN
    -- Fetch the most recent comment_id from "Comments" table using ad_id
    SELECT comment_id INTO NEW.comment
    FROM public."Comments"
    WHERE ad_id = NEW.ad_id
    ORDER BY created_time DESC -- Assuming created_time indicates recency
    LIMIT 1;

    -- If no comment is found, set the comment column to NULL
    IF NOT FOUND THEN
      NEW.comment := NULL;
    END IF;
  ELSE
    -- If ad_id is null, set the comment column to NULL
    NEW.comment := NULL;
  END IF;

  -- Return the modified new row
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_ad_account_comment_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_comment_brand"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if ad_id is not null in the new row
  IF NEW.ad_id IS NOT NULL THEN
    -- Fetch the brand from "Ad per Ad Account" table using ad_id
    SELECT brand INTO NEW.brand
    FROM public."Ad per Ad Account"
    WHERE ad_id = NEW.ad_id;
  END IF;

  -- Return the modified new row
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_comment_brand"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."top_ads_by_comments"("start_date" "text" DEFAULT NULL::"text", "end_date" "text" DEFAULT NULL::"text", "brand_filter" "text" DEFAULT NULL::"text", "sentiment_filter" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 5) RETURNS TABLE("ad_id" "text", "ad_name" "text", "comment_count" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      a.ad_id::text,
      a.ad_name::text,
      COUNT(c.id)::integer AS comment_count
    FROM "Ad per Ad Account" a
    LEFT JOIN "Comments" c ON a.ad_id = c.ad_id
      AND (start_date IS NULL OR c.created_time >= start_date::date)
      AND (end_date IS NULL OR c.created_time <= end_date::date)
      AND (sentiment_filter IS NULL OR c.sentiment = sentiment_filter)
    WHERE (brand_filter IS NULL OR a.brand = brand_filter)
    GROUP BY a.ad_id, a.ad_name
    ORDER BY comment_count DESC
    LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."top_ads_by_comments"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text", "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."top_ads_by_comments"("start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "brand_filter" "text" DEFAULT NULL::"text", "sentiment_filter" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 5) RETURNS TABLE("ad_id" "text", "ad_name" "text", "comment_count" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT a.ad_id, a.ad_name, COUNT(c.id)::int AS comment_count
    FROM "Ad per Ad Account" a
    LEFT JOIN "Comments" c ON a.ad_id = c.ad_id
      AND (start_date IS NULL OR c.created_time >= start_date)
      AND (end_date IS NULL OR c.created_time <= end_date)
      AND (sentiment_filter IS NULL OR LOWER(c.sentiment) = LOWER(sentiment_filter))
    WHERE (brand_filter IS NULL OR a.brand = brand_filter)
    GROUP BY a.ad_id, a.ad_name
    ORDER BY comment_count DESC
    LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."top_ads_by_comments"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text", "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ad_account_comment_on_new_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if ad_id is not null in the new comment row
  IF NEW.ad_id IS NOT NULL THEN
    -- Update the "Ad per Ad Account" table with the new comment_id
    UPDATE public."Ad per Ad Account"
    SET comment = NEW.comment_id
    WHERE ad_id = NEW.ad_id;
  END IF;

  -- This is an AFTER trigger, so we just return the new row
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ad_account_comment_on_new_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cluster_centroid"("target_cluster_id" "uuid", "new_embedding" "public"."vector", "new_comment_text" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
    current_centroid vector(1536);
    current_count integer;
    current_samples text[];
    updated_centroid vector(1536);
begin
    -- Get current cluster data
    select centroid_embedding, comment_count, sample_comments
    into current_centroid, current_count, current_samples
    from comment_clusters 
    where cluster_id = target_cluster_id;
    
    if not found then
        raise exception 'Cluster not found: %', target_cluster_id;
    end if;
    
    -- Calculate new centroid (weighted average)
    select (
        select array_agg(
            (curr_val * current_count + new_val) / (current_count + 1)
        )
        from unnest(current_centroid::float[]) with ordinality as curr(curr_val, i),
             unnest(new_embedding::float[]) with ordinality as new(new_val, j)
        where curr.i = new.j
    )::vector(1536) into updated_centroid;
    
    -- Update sample comments (keep max 5)
    if array_length(current_samples, 1) < 5 then
        current_samples := current_samples || array[new_comment_text];
    end if;
    
    -- Update cluster
    update comment_clusters 
    set 
        centroid_embedding = updated_centroid,
        comment_count = comment_count + 1,
        updated_at = now(),
        sample_comments = current_samples
    where cluster_id = target_cluster_id;
end;
$$;


ALTER FUNCTION "public"."update_cluster_centroid"("target_cluster_id" "uuid", "new_embedding" "public"."vector", "new_comment_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_comment_brand"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update "Comments"
  set brand = (
    select brand
    from "Ad per Ad Account"
    where "Ad per Ad Account".ad_id = NEW.ad_id
    limit 1
  )
  where id = NEW.id;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."update_comment_brand"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_comment_brand_from_ad_account"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    comment_ad_id_text TEXT;
    ad_account_brand_text TEXT;
BEGIN
    -- Extract the first element from the comment's ad_id array string
    BEGIN
        comment_ad_id_text := (NEW.ad_id::jsonb)->>0;
    EXCEPTION WHEN others THEN
        RAISE WARNING 'Failed to parse comment ad_id "%" as JSON array. Skipping brand update for this comment.', NEW.ad_id;
        RETURN NEW; -- Keep the brand as null
    END;

    -- Find the brand from "Ad per Ad Account" using the extracted ad_id
    SELECT (a.brand::jsonb)->>0 -- Extract the first element from the brand array string
    INTO ad_account_brand_text
    FROM public."Ad per Ad Account" AS a
    WHERE a.ad_id = comment_ad_id_text; -- Match extracted text ad_id with text ad_id in Ad per Ad Account

    -- If a matching brand was found, set it in the new comment row
    IF FOUND THEN
        NEW.brand := ad_account_brand_text;
    ELSE
        RAISE WARNING 'No matching ad_id "%" found in "Ad per Ad Account". Cannot set brand for comment.', comment_ad_id_text;
        -- Keep the brand as null if no match is found
    END IF;

    -- Return the modified new row
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_comment_brand_from_ad_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_comment_cluster_brand_from_ad_account"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    comment_cluster_ad_id_val TEXT;
    ad_account_brand_val TEXT;
    ad_account_brand_raw TEXT;
BEGIN
    -- Handle ad_id from NEW.ad_id
    BEGIN
        -- Try to parse as jsonb and get the first element if it's an array
        IF NEW.ad_id IS NOT NULL AND jsonb_typeof(NEW.ad_id::jsonb) = 'array' THEN
            comment_cluster_ad_id_val := (NEW.ad_id::jsonb)->>0;
        ELSE
            -- Otherwise, treat as plain text
            comment_cluster_ad_id_val := NEW.ad_id;
        END IF;
    EXCEPTION WHEN others THEN
        -- If casting to jsonb fails, treat as plain text
        comment_cluster_ad_id_val := NEW.ad_id;
    END;

    -- Find the brand from "Ad per Ad Account" using the extracted ad_id
    SELECT brand INTO ad_account_brand_raw
    FROM public."Ad per Ad Account" AS a
    WHERE a.ad_id = comment_cluster_ad_id_val;

    -- If a matching brand was found, process it and set it in the new comment_clusters row
    IF FOUND THEN
        BEGIN
            -- Try to parse as jsonb and get the first element if it's an array
            IF ad_account_brand_raw IS NOT NULL AND jsonb_typeof(ad_account_brand_raw::jsonb) = 'array' THEN
                ad_account_brand_val := (ad_account_brand_raw::jsonb)->>0;
            ELSE
                -- Otherwise, treat as plain text
                ad_account_brand_val := ad_account_brand_raw;
            END IF;
        EXCEPTION WHEN others THEN
            -- If casting to jsonb fails, treat as plain text
            ad_account_brand_val := ad_account_brand_raw;
        END;
        NEW.brand := ad_account_brand_val;
    ELSE
        RAISE WARNING 'No matching ad_id "%" found in "Ad per Ad Account". Cannot set brand for comment cluster.', comment_cluster_ad_id_val;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_comment_cluster_brand_from_ad_account"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Ad per Ad Account" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ad_name" "text",
    "account_id" "text",
    "creative_id" "text",
    "ad_text" "text",
    "ad_title" "text",
    "image" "text",
    "video" "text",
    "brand" "text",
    "post_link" "text",
    "Created At" timestamp with time zone,
    "Image_url" "text",
    "video_url" "text",
    "ad_id" "text" NOT NULL,
    "ad per account" "text",
    "Angel" "text",
    "Angel Type" "text",
    "Explanation" "text"
);


ALTER TABLE "public"."Ad per Ad Account" OWNER TO "postgres";


ALTER TABLE "public"."Ad per Ad Account" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Ad per Ad Account_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."Cluster Comments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "comment_id" "text" NOT NULL
);


ALTER TABLE "public"."Cluster Comments" OWNER TO "postgres";


ALTER TABLE "public"."Cluster Comments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Cluster Comments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."Comment Claster" (
    "id" bigint NOT NULL,
    "Cluster name" "text",
    "Cluster Description" "text",
    "Comment" "text",
    "Ad" "text",
    "meta_cluster" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ad_id" "text",
    "comment_id" "text",
    "brand" "text"
);


ALTER TABLE "public"."Comment Claster" OWNER TO "postgres";


ALTER TABLE "public"."Comment Claster" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Comment Claster_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."Comments" (
    "id" bigint NOT NULL,
    "comment_id" "text",
    "message" "text",
    "created_time" timestamp without time zone,
    "ad_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "theme" "text",
    "sentiment" "text",
    "brand" "text"
);


ALTER TABLE "public"."Comments" OWNER TO "postgres";


ALTER TABLE "public"."Comments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Comments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."Prompt" (
    "id" bigint NOT NULL,
    "Prompts" "text",
    "Name" "text",
    "Examples" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."Prompt" OWNER TO "postgres";


ALTER TABLE "public"."Prompt" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Prompt_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."comment_assignments" (
    "assignment_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" character varying(255) NOT NULL,
    "cluster_id" "uuid" NOT NULL,
    "similarity_score" double precision,
    "assignment_method" character varying(50),
    "confidence_score" double precision,
    "llm_reasoning" "text",
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comment_assignments_assignment_method_check" CHECK ((("assignment_method")::"text" = ANY ((ARRAY['hybrid'::character varying, 'embedding_only'::character varying, 'llm_only'::character varying, 'new_cluster'::character varying, 'manual'::character varying])::"text"[]))),
    CONSTRAINT "comment_assignments_confidence_score_check" CHECK ((("confidence_score" >= (0)::double precision) AND ("confidence_score" <= (1)::double precision))),
    CONSTRAINT "comment_assignments_similarity_score_check" CHECK ((("similarity_score" >= ('-1'::integer)::double precision) AND ("similarity_score" <= (1)::double precision)))
);


ALTER TABLE "public"."comment_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_clusters" (
    "cluster_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cluster_name" character varying(255),
    "cluster_description" "text",
    "meta_cluster" character varying(100),
    "ad_id" character varying(100),
    "centroid_embedding" "public"."vector"(1536) NOT NULL,
    "comment_count" integer DEFAULT 1,
    "sample_comments" "text"[] DEFAULT '{}'::"text"[],
    "avg_similarity_score" double precision DEFAULT 0.0,
    "cluster_cohesion" double precision DEFAULT 0.0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "content" "text",
    "metadata" "jsonb",
    "embedding" "public"."vector"(1536),
    CONSTRAINT "comment_clusters_comment_count_check" CHECK (("comment_count" > 0)),
    CONSTRAINT "comment_clusters_sample_comments_check" CHECK (("array_length"("sample_comments", 1) <= 5))
);


ALTER TABLE "public"."comment_clusters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "comment_id" character varying(255) NOT NULL,
    "ad_id" character varying(100) NOT NULL,
    "comment_text" "text" NOT NULL,
    "author_name" character varying(255),
    "likes_count" integer DEFAULT 0,
    "replies_count" integer DEFAULT 0,
    "sentiment_score" double precision,
    "theme" character varying(500),
    "sentiment" character varying(50),
    "embedding" "public"."vector"(1536),
    "embedding_model" character varying(50) DEFAULT 'text-embedding-3-small'::character varying,
    "comment_created_at" timestamp with time zone,
    "processed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_metadata" (
    "id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "brand" "text" NOT NULL,
    "created" timestamp with time zone NOT NULL,
    "adcount" integer NOT NULL
);


ALTER TABLE "public"."report_metadata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" NOT NULL,
    "data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Ad per Ad Account"
    ADD CONSTRAINT "Ad per Ad Account_ad_id_key" UNIQUE ("ad_id");



ALTER TABLE ONLY "public"."Ad per Ad Account"
    ADD CONSTRAINT "Ad per Ad Account_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."Ad per Ad Account"
    ADD CONSTRAINT "Ad per Ad Account_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Cluster Comments"
    ADD CONSTRAINT "Cluster Comments_comment_id_key" UNIQUE ("comment_id");



ALTER TABLE ONLY "public"."Cluster Comments"
    ADD CONSTRAINT "Cluster Comments_pkey" PRIMARY KEY ("id", "comment_id");



ALTER TABLE ONLY "public"."Comment Claster"
    ADD CONSTRAINT "Comment Claster_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Comments"
    ADD CONSTRAINT "Comments_comment_id_key" UNIQUE ("comment_id");



ALTER TABLE ONLY "public"."Comments"
    ADD CONSTRAINT "Comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Prompt"
    ADD CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_assignments"
    ADD CONSTRAINT "comment_assignments_comment_id_cluster_id_key" UNIQUE ("comment_id", "cluster_id");



ALTER TABLE ONLY "public"."comment_assignments"
    ADD CONSTRAINT "comment_assignments_pkey" PRIMARY KEY ("assignment_id");



ALTER TABLE ONLY "public"."comment_clusters"
    ADD CONSTRAINT "comment_clusters_pkey" PRIMARY KEY ("cluster_id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("comment_id");



ALTER TABLE ONLY "public"."report_metadata"
    ADD CONSTRAINT "report_metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_assignments_cluster_id" ON "public"."comment_assignments" USING "btree" ("cluster_id");



CREATE INDEX "idx_assignments_comment_id" ON "public"."comment_assignments" USING "btree" ("comment_id");



CREATE INDEX "idx_clusters_ad_id" ON "public"."comment_clusters" USING "btree" ("ad_id");



CREATE INDEX "idx_clusters_ad_name" ON "public"."comment_clusters" USING "btree" ("ad_id", "cluster_name");



CREATE INDEX "idx_clusters_embedding" ON "public"."comment_clusters" USING "ivfflat" ("centroid_embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_clusters_updated_at" ON "public"."comment_clusters" USING "btree" ("updated_at");



CREATE INDEX "idx_comments_ad_id" ON "public"."comments" USING "btree" ("ad_id");



CREATE INDEX "idx_comments_embedding" ON "public"."comments" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_comments_processed_at" ON "public"."comments" USING "btree" ("processed_at");



CREATE INDEX "idx_report_metadata_brand" ON "public"."report_metadata" USING "btree" ("brand");



CREATE INDEX "idx_report_metadata_created" ON "public"."report_metadata" USING "btree" ("created");



CREATE OR REPLACE TRIGGER "populate_cluster_trigger" BEFORE INSERT ON "public"."comment_clusters" FOR EACH ROW EXECUTE FUNCTION "public"."populate_cluster_from_metadata"();



CREATE OR REPLACE TRIGGER "set_brand_on_comment" BEFORE INSERT OR UPDATE ON "public"."Comments" FOR EACH ROW EXECUTE FUNCTION "public"."set_comment_brand"();



CREATE OR REPLACE TRIGGER "set_brand_on_comment_cluster" BEFORE INSERT OR UPDATE ON "public"."Comment Claster" FOR EACH ROW EXECUTE FUNCTION "public"."update_comment_cluster_brand_from_ad_account"();



ALTER TABLE ONLY "public"."Cluster Comments"
    ADD CONSTRAINT "Cluster Comments_comment id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."Comments"("comment_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Cluster Comments"
    ADD CONSTRAINT "Cluster Comments_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."Comment Claster"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Comments"
    ADD CONSTRAINT "Comments_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "public"."Ad per Ad Account"("ad_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_assignments"
    ADD CONSTRAINT "comment_assignments_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "public"."comment_clusters"("cluster_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."report_metadata"("id");



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."dashboard_metrics"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."dashboard_metrics"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_metrics"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."dashboard_metrics"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."dashboard_metrics"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_metrics"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_similar_clusters"("query_embedding" "public"."vector", "target_ad_id" character varying, "similarity_threshold" double precision, "max_results" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_similar_clusters"("query_embedding" "public"."vector", "target_ad_id" character varying, "similarity_threshold" double precision, "max_results" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_similar_clusters"("query_embedding" "public"."vector", "target_ad_id" character varying, "similarity_threshold" double precision, "max_results" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."full_dashboard_data"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."full_dashboard_data"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."full_dashboard_data"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."period_comparison_metrics"("current_start" timestamp with time zone, "current_end" timestamp with time zone, "previous_start" timestamp with time zone, "previous_end" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."period_comparison_metrics"("current_start" timestamp with time zone, "current_end" timestamp with time zone, "previous_start" timestamp with time zone, "previous_end" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."period_comparison_metrics"("current_start" timestamp with time zone, "current_end" timestamp with time zone, "previous_start" timestamp with time zone, "previous_end" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_cluster_from_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."populate_cluster_from_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_cluster_from_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_ad_account_comment_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_ad_account_comment_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_ad_account_comment_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_comment_brand"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_comment_brand"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_comment_brand"() TO "service_role";



GRANT ALL ON FUNCTION "public"."top_ads_by_comments"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."top_ads_by_comments"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."top_ads_by_comments"("start_date" "text", "end_date" "text", "brand_filter" "text", "sentiment_filter" "text", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."top_ads_by_comments"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."top_ads_by_comments"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."top_ads_by_comments"("start_date" timestamp with time zone, "end_date" timestamp with time zone, "brand_filter" "text", "sentiment_filter" "text", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ad_account_comment_on_new_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ad_account_comment_on_new_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ad_account_comment_on_new_comment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cluster_centroid"("target_cluster_id" "uuid", "new_embedding" "public"."vector", "new_comment_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_cluster_centroid"("target_cluster_id" "uuid", "new_embedding" "public"."vector", "new_comment_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cluster_centroid"("target_cluster_id" "uuid", "new_embedding" "public"."vector", "new_comment_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comment_brand"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comment_brand"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comment_brand"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comment_brand_from_ad_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comment_brand_from_ad_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comment_brand_from_ad_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comment_cluster_brand_from_ad_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comment_cluster_brand_from_ad_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comment_cluster_brand_from_ad_account"() TO "service_role";



GRANT ALL ON TABLE "public"."Ad per Ad Account" TO "anon";
GRANT ALL ON TABLE "public"."Ad per Ad Account" TO "authenticated";
GRANT ALL ON TABLE "public"."Ad per Ad Account" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Ad per Ad Account_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Ad per Ad Account_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Ad per Ad Account_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Cluster Comments" TO "anon";
GRANT ALL ON TABLE "public"."Cluster Comments" TO "authenticated";
GRANT ALL ON TABLE "public"."Cluster Comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Cluster Comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Cluster Comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Cluster Comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Comment Claster" TO "anon";
GRANT ALL ON TABLE "public"."Comment Claster" TO "authenticated";
GRANT ALL ON TABLE "public"."Comment Claster" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Comment Claster_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Comment Claster_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Comment Claster_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Comments" TO "anon";
GRANT ALL ON TABLE "public"."Comments" TO "authenticated";
GRANT ALL ON TABLE "public"."Comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Prompt" TO "anon";
GRANT ALL ON TABLE "public"."Prompt" TO "authenticated";
GRANT ALL ON TABLE "public"."Prompt" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Prompt_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Prompt_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Prompt_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."comment_assignments" TO "anon";
GRANT ALL ON TABLE "public"."comment_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."comment_clusters" TO "anon";
GRANT ALL ON TABLE "public"."comment_clusters" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_clusters" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."report_metadata" TO "anon";
GRANT ALL ON TABLE "public"."report_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."report_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
