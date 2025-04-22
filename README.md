This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Setting up Supabase

This project uses Supabase for storing report data. You'll need to:

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project
3. Run the following SQL commands in the Supabase SQL editor to create the necessary tables:

```sql
-- Create a table for report metadata
CREATE TABLE report_metadata (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  created TIMESTAMP WITH TIME ZONE NOT NULL,
  adCount INTEGER NOT NULL
);

-- Create a table for the actual report data
CREATE TABLE reports (
  id UUID PRIMARY KEY REFERENCES report_metadata(id),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_report_metadata_brand ON report_metadata(brand);
CREATE INDEX idx_report_metadata_created ON report_metadata(created);
```

4. Copy your Supabase URL and anon key from the project settings
5. Create a `.env.local` file in the root of the project with the following content:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
BASE_URL=http://localhost:3000
```

### Migration from file system to Supabase

If you have existing report data stored in the file system, you can migrate it to Supabase with the following command:

```bash
npm run migrate-to-supabase
```

### Running the development server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# btmls-ad-analyzer
