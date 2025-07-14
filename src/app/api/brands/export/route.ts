import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { parseToDate } from '@/lib/normalizeDate';
import { getBrandDashboardData } from '@/app/actions';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brand = url.searchParams.get('brand_id');
  if (!brand) {
    return NextResponse.json({ error: 'Brand query parameter is required' }, { status: 400 });
  }

  const startDateStr = url.searchParams.get('startDate');
  const endDateStr = url.searchParams.get('endDate');
  const sentiment = url.searchParams.get('sentiment') || 'all';

  const dateRange = startDateStr && endDateStr
    ? { start: parseToDate(startDateStr) as Date, end: parseToDate(endDateStr) as Date }
    : undefined;

  // Fetch dashboard data via RPC
  const dashData = await getBrandDashboardData(brand, dateRange, sentiment);
  const ads = dashData.ads;
  const comments = dashData.allComments;

  // Prepare Ads sheet
  const adsSheet = ads.map(ad => ({
    AdID: ad.ad_id,
    Name: ad.ad_name,
    Text: ad.ad_text,
    CreatedAt: ad.created_at,
    BrandID: ad.brand_id,
    AngleType: ad.angel_type ?? '',
  }));

  // Prepare Comments sheet
  const commentsSheet = comments.map(c => {
    const anyC = c as any;
    return {
      CommentID: anyC.comment_id,
      AdID: anyC.ad_id,
      Message: anyC.message,
      Sentiment: anyC.sentiment,
      Cluster: anyC.meta_cluster || '',
      AngelType: anyC['Angel Type'] || '',
      CreatedTime: anyC.created_time,
    };
  });

  // Build workbook
  const wb = XLSX.utils.book_new();
  const wsAds = XLSX.utils.json_to_sheet(adsSheet);
  const wsComments = XLSX.utils.json_to_sheet(commentsSheet);
  XLSX.utils.book_append_sheet(wb, wsAds, 'Ads');
  XLSX.utils.book_append_sheet(wb, wsComments, 'Comments');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // Format date strings for filename
  function formatDate(dateStr: string): string {
    const d = parseToDate(dateStr);
    if (!d) return dateStr;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const suffix = startDateStr && endDateStr
    ? `-${formatDate(startDateStr)}-${formatDate(endDateStr)}`
    : '';
  const filename = `${brand}-data${suffix}.xlsx`;

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

