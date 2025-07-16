import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { transformDataForDashboard } from '@/lib/datamapper';

export async function GET(request: Request, { params }: { params: Promise<{ adId: string }> }) {
  const { adId } = await params;

  if (!adId) {
    return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
  }

  try {
    // Use the same get_dashboard_data function but filter for this specific ad
    const { data: rawData, error } = await supabase.rpc('get_dashboard_data', {
      brand_id_param: null, // Get all brands to find the ad
      start_date_param: null,
      end_date_param: null,
      sentiment_param: null,
    });

    if (error) throw error;

    // Find the specific ad
    const ad = rawData?.ads?.find((a: any) => a.ad_id === adId);
    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    // Filter comments for this specific ad
    const comments = rawData?.comments?.filter((c: any) => c.ad_id === adId) || [];

    // Get clusters for this ad (from comment_cluster table)
    const clusters: any[] = []; // We can add this later if needed

    return NextResponse.json({ ad, comments, clusters });
  } catch (error) {
    console.error(`Error fetching data for ad ${adId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch ad data' }, { status: 500 });
  }
}