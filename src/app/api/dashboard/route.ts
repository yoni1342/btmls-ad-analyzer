import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { transformDataForDashboard } from '@/lib/datamapper';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brand_id') || undefined;
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');
    const sentiment = url.searchParams.get('sentiment') || undefined;
    const funnel = url.searchParams.get('funnel') || undefined;
    const angel = url.searchParams.get('angel') || undefined;
    // Parse dates
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Call Postgres RPC directly for dashboard data
    const { data: rawData, error } = await supabase.rpc('get_dashboard_data', {
      brand_id_param: brandId ? parseInt(brandId, 10) : null,
      start_date_param: startDate ? startDate.toISOString() : null,
      end_date_param: endDate ? endDate.toISOString() : null,
      sentiment_param: sentiment || null,
      funnel_param: funnel || null,
      angel_param: angel || null,
    });
    if (error) throw error;

    // Transform data for dashboard components
    const dashboardData = transformDataForDashboard(
      rawData,
      startDate && endDate
        ? { start: startDate, end: endDate }
        : undefined
    );

    return NextResponse.json({
      filters: {
        brandId,
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
        sentiment,
        funnel,
        angel,
      },
      data: dashboardData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in dashboard API route:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}