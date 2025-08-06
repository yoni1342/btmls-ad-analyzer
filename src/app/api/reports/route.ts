import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getReportUrl } from '@/config';
import { supabase } from '@/lib/supabase';

// Report metadata interface
interface Report {
  id: string;
  title: string;
  brand: string;
  created: string;
  adCount: number;
}

// Get all reports
export async function GET() {
  try {
    // Fetch report metadata from Supabase
    const { data: reports, error } = await supabase
      .from('report_metadata')
      .select('*')
      .order('created', { ascending: false });
    
    if (error) {
      throw new Error(`Error fetching reports: ${error.message}`);
    }
    
    // Add report URLs to each report
    const reportsWithUrls = reports.map(report => ({
      ...report,
      reportUrl: getReportUrl(report.id)
    }));
    
    return NextResponse.json({ reports: reportsWithUrls });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

// Create or update a report for a brand and ad_ids
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Incoming request body:', JSON.stringify(body, null, 2));
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: 'Request body must be a non-empty array.' }, { status: 400 });
    }

    const results = [];

    for (const group of body) {
      const { brand_id, ad_ids } = group;
      if (!brand_id || !Array.isArray(ad_ids) || ad_ids.length === 0) {
      	results.push({ error: `Missing brand_id or ad_ids for group: ${JSON.stringify(group)}` });
      	continue;
      }

      // Fetch ads using new hierarchical structure
      const { data: ads, error: adsError } = await supabase
      	.from('ads')
      	.select(`
          *,
          ad_sets!inner(
            campaigns!inner(
              ad_account!inner(
                brands!inner(brand_name)
              )
            )
          )
        `)
      	.eq('ad_sets.campaigns.ad_account.brand_id', brand_id)
      	.in('id', ad_ids);
      if (adsError) {
      	results.push({ error: `Error fetching ads for brand ${brand_id}: ${adsError.message}` });
      	continue;
      }
      console.log(`Fetched ${ads.length} ads for brand ${brand_id}:`, ads);

      // Fetch comments for these ads using bigint ad_ids
      const { data: comments, error: commentsError } = await supabase
      	.from('comments')
      	.select('*')
      	.in('ad_id', ad_ids.map(id => parseInt(id, 10)));
      if (commentsError) {
      	results.push({ error: `Error fetching comments for brand ${brand_id}: ${commentsError.message}` });
      	continue;
      }
      console.log(`Fetched ${comments.length} comments for brand ${brand_id}:`, comments);

      // After fetching comments:
      const commentIds = comments.map((c: any) => c.comment_id);
      console.log(`Comment IDs for brand ${brand_id}:`, commentIds);

      // Fetch cluster-comment mappings
      const { data: clusterComments, error: clusterCommentsError } = await supabase
        .from('cluster_comments')
        .select('*')
        .in('comment_id', commentIds);
      if (clusterCommentsError) {
        results.push({ error: `Error fetching cluster comments for brand ${brand_id}: ${clusterCommentsError.message}` });
        continue;
       }
       console.log(`Fetched ${clusterComments.length} cluster comments for brand ${brand_id}:`, clusterComments);

      // Get unique cluster IDs
      const clusterIds = [...new Set(clusterComments.map((cc: any) => cc.id))];
      console.log(`Cluster IDs for brand ${brand_id}:`, clusterIds);

      // Fetch clusters
      const { data: clusters, error: clustersError } = await supabase
        .from('comment_cluster')
        .select('*')
        .in('id', clusterIds);
      if (clustersError) {
        results.push({ error: `Error fetching clusters for brand ${brand_id}: ${clustersError.message}` });
        continue;
       }
       console.log(`Fetched ${clusters.length} clusters for brand ${brand_id}:`, clusters);

      // Check if a previous report exists for this brand
      const { data: prevReports, error: prevError } = await supabase
      	.from('report_metadata')
      	.select('*')
      	.eq('brand_id', brand_id)
      	.order('created', { ascending: false })
      	.limit(1);
      if (prevError) {
      	results.push({ error: `Error checking previous report for brand ${brand_id}: ${prevError.message}` });
      	continue;
      }

      let prevData = null;
      if (prevReports && prevReports.length > 0) {
        const prevReportId = prevReports[0].id;
        const { data: prevReportData, error: prevDataError } = await supabase
          .from('reports')
          .select('data')
          .eq('id', prevReportId)
          .single();
        if (!prevDataError && prevReportData && prevReportData.data) {
          prevData = prevReportData.data;
        }
      }

      // Merge new data with previous data (if any)
      // For simplicity, merge ads and comments arrays, deduplicating by ad_id and comment_id
      const mergedAds = prevData && Array.isArray(prevData.ads)
        ? [...prevData.ads.filter((a: any) => !ads.some((na: any) => na.ad_id === a.ad_id)), ...ads]
        : ads;
      const mergedComments = prevData && Array.isArray(prevData.comments)
        ? [...prevData.comments.filter((c: any) => !comments.some((nc: any) => nc.comment_id === c.comment_id)), ...comments]
        : comments;

      // Compose the new report data - map from new hierarchical structure
      const brand_name = ads.length > 0 && ads[0].ad_sets?.campaigns?.ad_account?.brands ?
        ads[0].ad_sets.campaigns.ad_account.brands.brand_name : 'Unknown';
      const reportData = {
      	brand: brand_name,
      	ads: mergedAds,
      	comments: mergedComments,
      	clusters,
      	clusterComments
      };
      console.log(`Final reportData for brand ${brand_id}:`, reportData);
  
      // Generate a new report ID
      const reportId = uuidv4();
      const now = new Date().toISOString();
      const reportMetadata = {
      	id: reportId,
      	title: `${brand_name} Report`,
      	brand: brand_name,
      	brand_id,
      	created: now,
      	adcount: mergedAds.length
      };

      // Insert new report metadata
      const { error: metadataError } = await supabase
        .from('report_metadata')
        .insert(reportMetadata);
      if (metadataError) {
        results.push({ error: `Error inserting report metadata for brand ${brand_id}: ${metadataError.message}` });
        continue;
       }

      // Insert new report data
      const { error: dataError } = await supabase
        .from('reports')
        .insert({ id: reportId, data: reportData });
      if (dataError) {
        results.push({ error: `Error inserting report data for brand ${brand_id}: ${dataError.message}` });
        continue;
       }

      // Return the report link
      const reportUrl = getReportUrl(reportId);
      results.push({ brand: brand_id, reportId, reportUrl });
     }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error creating/updating report:', error);
    return NextResponse.json({ error: 'Failed to create/update report' }, { status: 500 });
  }
} 