alter table "public"."comment_assignments" drop constraint "comment_assignments_assignment_method_check";

alter table "public"."comment_assignments" add constraint "comment_assignments_assignment_method_check" CHECK (((assignment_method)::text = ANY ((ARRAY['hybrid'::character varying, 'embedding_only'::character varying, 'llm_only'::character varying, 'new_cluster'::character varying, 'manual'::character varying])::text[]))) not valid;

alter table "public"."comment_assignments" validate constraint "comment_assignments_assignment_method_check";


