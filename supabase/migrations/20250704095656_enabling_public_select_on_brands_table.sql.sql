-- Allow anonymous reads on the brands table
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on brands"
ON public.brands
FOR SELECT
USING ( true );