-- Create a new ENUM type called funnel_type
CREATE TYPE public.funnel_type AS ENUM ('TOF', 'MOF', 'BOF');

-- Change the data type of the 'funnel' column from TEXT to the new funnel_type ENUM
-- The USING clause safely casts the existing text values to the new enum type.
ALTER TABLE public.ad_per_ad_account
ALTER COLUMN funnel TYPE public.funnel_type
USING (funnel::public.funnel_type);