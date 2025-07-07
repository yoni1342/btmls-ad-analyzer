Data-Fetching Refactor for Dashboard & Brands Pages
This document outlines the recent refactoring of the data-fetching logic for the dashboard and brands pages. The primary goal of this refactor was to improve performance and simplify the codebase by consolidating multiple database calls into a single, efficient Supabase function.

1. The Problem: Performance Bottlenecks
The previous implementation of the dashboard and brands pages suffered from performance issues due to multiple, separate database calls for each data component. This resulted in a slow and inefficient user experience, with the page making numerous round trips to the database to fetch data for:

Dashboard metrics

Sentiment distribution

Comment trends

Top-performing ads

Untracked ads and comments

Brand analysis status

This approach not only increased the load on the database but also made the frontend code more complex and harder to maintain.

2. The Solution: A Unified Data-Fetching Strategy
To address these issues, we implemented a new, unified data-fetching strategy centered around a single Supabase function: get_dashboard_data. This function is responsible for fetching all the necessary data for the dashboard and brands pages in a single call, which significantly improves performance and simplifies the codebase.

The new data pipeline is designed to be both efficient and extensible, allowing for the easy addition of new data points as needed.

3. Implementation Details
The refactoring involved several key changes to the codebase, which are detailed below.

3.1. New Supabase Function: get_dashboard_data
The core of the new data-fetching logic is the get_dashboard_data function, which is defined in the following migration file:

supabase/migrations/20250707140000_add_sentiment_filter_to_dashboard_function.sql

This function accepts brand_id, start_date, end_date, and sentiment as parameters and returns a single JSON object containing all the data needed for the dashboard and brands pages.

3.2. Updated Server Action
The getBrandDashboardData function in src/app/actions.ts has been updated to call the new get_dashboard_data RPC. This simplifies the server-side logic and ensures that all data is fetched through a single, efficient entry point.

3.3. Simplified Data Mapper
The data mapping logic in src/lib/datamapper.ts has been updated to work with the new data structure returned by the get_dashboard_data function. This has significantly simplified the data transformation process and made the code easier to read and maintain.

3.4. Refactored Frontend Components
The frontend components on the dashboard and brands pages have been updated to use the new, consolidated data source. This has involved removing the old, separate data-fetching calls and updating the components to pull data from the main brandData object.

4. Future Improvements: Fetching Ads, Comments, and Media
The current implementation of the get_dashboard_data function does not yet fetch the full data for ads, comments, and media. To add this functionality, you will need to extend the function to include this data in the returned JSON object.

Here’s how you can do it:

4.1. Update the Supabase Function
First, you’ll need to update the get_dashboard_data function to include the full data for ads, comments, and media. You can do this by adding the following to the json_build_object in the function:

'ads', (
    SELECT json_agg(a)
    FROM ad_per_ad_account a
    WHERE (brand_id_param IS NULL OR a.brand_id = brand_id_param)
),
'comments', (
    SELECT json_agg(c)
    FROM comments c
    LEFT JOIN ad_per_ad_account a ON c.ad_id = a.ad_id
    WHERE (brand_id_param IS NULL OR a.brand_id = brand_id_param)
        AND (start_date_param IS NULL OR c.created_time >= start_date_param)
        AND (end_date_param IS NULL OR c.created_time <= end_date_param)
        AND (sentiment_param IS NULL OR sentiment_param = 'all' OR lower(trim(c.sentiment)) = lower(sentiment_param))
)

4.2. Update the Data Mapper
Next, you’ll need to update the transformDataForDashboard function in src/lib/datamapper.ts to handle the new ads and comments data. This will involve updating the DashboardData type and the function itself to correctly handle and pass through the new data.

4.3. Update the Frontend Components
Finally, you’ll need to update the frontend components to use the new ads and comments data from the brandData object. This will allow you to populate the AdTable, CommentTable, and MediaGrid components with the fetched data.

By following these steps, you can extend the new, efficient data pipeline to include all the data needed for the dashboard and brands pages, while maintaining a clean and performant codebase.