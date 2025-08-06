-- Create custom ENUM types for status and objective for better data integrity.
create type public.campaign_status as enum ('draft', 'active', 'paused', 'completed', 'archived');
create type public.campaign_objective as enum ('brand_awareness', 'reach', 'traffic', 'engagement', 'conversions', 'sales');

-- Create the ad_account table
create table public.ad_account (
  id uuid not null primary key default gen_random_uuid(),
  ad_name text not null,
  brand_name text not null,
  created_at timestamptz not null default now()
);

-- Add a comment to the table for clarity
comment on table public.ad_account is 'Stores advertising account information.';

-- Create the campaigns table
create table public.campaigns (
  id uuid not null primary key default gen_random_uuid(),
  account_id uuid not null references public.ad_account(id) on delete cascade,
  name text not null,
  status public.campaign_status not null default 'draft',
  objective public.campaign_objective,
  start_time timestamptz,
  topline_id text, -- Can be used for internal or external identifiers.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add a comment to the table
comment on table public.campaigns is 'Stores marketing campaign details for each ad account.';

-- Add an index on the foreign key for performance
create index ix_campaigns_account_id on public.campaigns (account_id);

-- 1. Create a function to handle automatic updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create a trigger to call the function before any update on the campaigns table
create trigger on_campaign_update
  before update on public.campaigns
  for each row execute procedure public.handle_updated_at();

-- Finally, enable Row Level Security (RLS) on the tables.
-- IMPORTANT: You will need to add RLS POLICIES to make the data accessible.
alter table public.ad_account enable row level security;
alter table public.campaigns enable row level security;