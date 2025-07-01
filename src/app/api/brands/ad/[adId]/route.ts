import { NextResponse } from 'next/server';
import { fetchAdById, fetchCommentsByAdId, fetchCommentClusters } from '@/lib/supabase-service';

export async function GET(request: Request, { params }: { params: { adId: string } }) {
  const { adId } = params;

  if (!adId) {
    return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
  }

  try {
    const ad = await fetchAdById(adId);
const comments = await fetchCommentsByAdId(adId);
const allClusters = await fetchCommentClusters();
const clusters = allClusters.filter(c => c.ad_id === adId);

return NextResponse.json({ ad, comments, clusters });
  } catch (error) {
    console.error(`Error fetching data for ad ${adId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch ad data' }, { status: 500 });
  }
}