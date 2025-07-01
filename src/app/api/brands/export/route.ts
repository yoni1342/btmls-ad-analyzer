import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { fetchAdsByBrand, fetchCommentsByBrand, fetchCommentClusters, fetchClusterCommentMappings } from '@/lib/supabase-service';

// Helper to filter comments by date range
function filterCommentsByDateRange(comments: any[], startDate: Date, endDate: Date) {
  const isLifetime = startDate.getFullYear() < 1980;
  return comments.filter(comment => {
    if (!comment.created_time) return false;
    const d = new Date(comment.created_time);
    return isLifetime ? d <= endDate : d >= startDate && d <= endDate;
  });
}

// Helper to filter ads by date range
function filterAdsByDateRange(ads: any[], startDate: Date, endDate: Date) {
  const isLifetime = startDate.getFullYear() < 1980;
  return ads.filter(ad => {
    if (!ad.created_at) return false;
    const d = new Date(ad.created_at);
    return isLifetime ? d <= endDate : d >= startDate && d <= endDate;
  });
}

// Helper to filter comments by sentiment
function filterCommentsBySentiment(comments: any[], sentiment: string) {
  if (sentiment === 'all') return comments;
  return comments.filter(c => c.sentiment?.toLowerCase() === sentiment.toLowerCase());
}

// Helper to filter by search query
function filterBySearchQuery(comments: any[], ads: any[], query: string) {
  const q = query.toLowerCase();
  const filteredComments = comments.filter(c =>
    (c.message && c.message.toLowerCase().includes(q)) ||
    (c.theme && c.theme.toLowerCase().includes(q))
  );
  const filteredAds = ads.filter(a =>
    (a.ad_name && a.ad_name.toLowerCase().includes(q)) ||
    (a.ad_text && a.ad_text.toLowerCase().includes(q)) ||
    (a.brand && a.brand.toLowerCase().includes(q))
  );
  if (filteredAds.length) {
    const ids = filteredAds.map(a => a.ad_id);
    return {
      comments: filteredComments.concat(comments.filter(c => ids.includes(c.ad_id))),
      ads: filteredAds
    };
  }
  return { comments: filteredComments, ads };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brand = url.searchParams.get('brand');
  if (!brand) {
    return NextResponse.json({ error: 'Brand query parameter is required' }, { status: 400 });
  }
  const startDateStr = url.searchParams.get('startDate');
  const endDateStr = url.searchParams.get('endDate');
  const sentiment = url.searchParams.get('sentiment') || 'all';
  const search = url.searchParams.get('search') || '';

  let startDate: Date | undefined;
  let endDate: Date | undefined;
  if (startDateStr) startDate = new Date(startDateStr);
  if (endDateStr) endDate = new Date(endDateStr);

  // Fetch raw data
  let ads = await fetchAdsByBrand(brand);
  let comments = await fetchCommentsByBrand(brand);
  /* Fetch comment clusters and mappings */
    const clusters = await fetchCommentClusters();
    const mappings = await fetchClusterCommentMappings();
    const clusterDefMap = new Map(clusters.map(cl => [cl.id, cl.meta_cluster]));
    const commentClusterMap = new Map(mappings.map(m => [m.comment_id, clusterDefMap.get(m.id) ?? '']));

  // Apply filters
  if (startDate && endDate) {
    ads = filterAdsByDateRange(ads, startDate, endDate);
    comments = filterCommentsByDateRange(comments, startDate, endDate);
  }
  if (sentiment && sentiment !== 'all') {
    comments = filterCommentsBySentiment(comments, sentiment);
  }
  if (search) {
    const filtered = filterBySearchQuery(comments, ads, search);
    comments = filtered.comments;
    ads = filtered.ads;
  }

  // Prepare sheet data
  const adsSheet = ads.map(a => ({
    AdID: a.ad_id,
    Name: a.ad_name,
    Brand: a.brand,
    Text: a.ad_text,
    CreatedAt: a.created_at,
    Platform: a.platform,
    angle_type: a.angle_type,
    angle_description: a.explanation ?? (a as any)['Explanation'] ?? ''
  }));
  const commentsSheet = comments.map(c => ({
    CommentID: c.id,
    AdID: c.ad_id,
    Message: c.message,
    Sentiment: c.sentiment,
    Theme: c.theme,
    CreatedTime: c.created_time,
    cluster: commentClusterMap.get(c.comment_id) || ''
  }));

  // Build workbook
  const wb = XLSX.utils.book_new();
  const wsAds = XLSX.utils.json_to_sheet(adsSheet);
  const wsComments = XLSX.utils.json_to_sheet(commentsSheet);
  XLSX.utils.book_append_sheet(wb, wsAds, 'Ads');
  XLSX.utils.book_append_sheet(wb, wsComments, 'Comments');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // Format date strings as YYYY-MM-DD for filename
  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const fileNameSuffix = startDateStr && endDateStr
    ? `-${formatDate(startDateStr)}-${formatDate(endDateStr)}`
    : '';
  const filename = `${brand}-data${fileNameSuffix}.xlsx`;

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}