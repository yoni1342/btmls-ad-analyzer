import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { getBrandDashboardData } from '@/app/actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      brandId,
      adsDateRange,
      commentsDateRange,
      sentiment,
      funnel,
      angel,
      searchQuery,
      selectedAdIds,
      commentSentiment,
      commentCluster,
      commentAngelType
    } = body;

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    // Fetch ads data using dashboard function with ads date range
    const dashData = await getBrandDashboardData(
      brandId,
      adsDateRange ? { start: new Date(adsDateRange.startDate), end: new Date(adsDateRange.endDate) } : undefined,
      sentiment,
      funnel,
      angel,
      searchQuery
    );
    const ads = dashData.ads || [];

    // Fetch comments data using get_filtered_data with comments date range
    const adIdsToFilter = selectedAdIds && selectedAdIds.length > 0
      ? selectedAdIds
      : ads.map(ad => ad.ad_id);

    const { data: comments, error } = await supabase.rpc('get_filtered_data', {
      brand_id_param: parseInt(brandId, 10),
      ad_ids_param: adIdsToFilter.length > 0 ? adIdsToFilter : null,
      sentiment_param: commentSentiment || null,
      cluster_param: commentCluster || null,
      angel_param: commentAngelType || null,
      search_query_param: searchQuery || null,
      start_date_param: commentsDateRange?.startDate || null,
      end_date_param: commentsDateRange?.endDate || null
    });

    if (error) {
      console.error('Error fetching comments:', error);
      throw new Error('Failed to fetch comments');
    }

    const safeComments = comments || [];

    // Prepare Ads sheet
    const adsSheet = ads.map(ad => ({
      AdID: ad.ad_id,
      Name: ad.ad_name,
      Text: ad.ad_text,
      Title: ad.ad_title,
      CreatedAt: ad.created_at,
      BrandID: ad.brand_id,
      AngleType: ad.angle_type ?? '',
      Funnel: ad.funnel ?? '',
      TotalComments: ad.total_comments ?? 0,
      ImageURL: ad.image_url ?? '',
      VideoURL: ad.video_url ?? '',
      PostLink: ad.post_link ?? ''
    }));

    // Prepare Comments sheet
    const commentsSheet = safeComments.map((c: any) => ({
      CommentID: c.comment_id,
      AdID: c.ad_id,
      Message: c.message,
      Sentiment: c.sentiment,
      Cluster: c.meta_cluster || '',
      AngelType: c['Angel Type'] || c.angle_type || '',
      CreatedTime: c.created_time,
      AdTitle: c.ad_title || '',
      Funnel: c.funnel || ''
    }));

    // Build workbook
    const wb = XLSX.utils.book_new();
    const wsAds = XLSX.utils.json_to_sheet(adsSheet);
    const wsComments = XLSX.utils.json_to_sheet(commentsSheet);
    XLSX.utils.book_append_sheet(wb, wsAds, 'Ads');
    XLSX.utils.book_append_sheet(wb, wsComments, 'Comments');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Format date strings for filename
    function formatDate(dateStr: string): string {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    const adsSuffix = adsDateRange?.startDate && adsDateRange?.endDate
      ? `-ads-${formatDate(adsDateRange.startDate)}-${formatDate(adsDateRange.endDate)}`
      : '';
    const commentsSuffix = commentsDateRange?.startDate && commentsDateRange?.endDate
      ? `-comments-${formatDate(commentsDateRange.startDate)}-${formatDate(commentsDateRange.endDate)}`
      : '';
    const filename = `brand-${brandId}-export${adsSuffix}${commentsSuffix}.xlsx`;

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

