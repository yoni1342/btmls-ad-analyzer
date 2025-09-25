import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: Promise<{ adId: string }> }) {
  const { adId } = await params;

  if (!adId) {
    return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
  }

  try {
    // Convert adId to bigint for new schema
    const adIdBigint = parseInt(adId, 10);
    
    // First, get the ad details directly from the ads table
    const { data: adData, error: adError } = await supabase
      .from('ads')
      .select('*')
      .eq('id', adIdBigint)
      .single();

    if (adError) {
      console.error('Error fetching ad:', adError);
      if (adError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
      }
      throw adError;
    }

    if (!adData) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    // Get brand_id through the relationship chain
    let brandId = null;
    if (adData.ad_set_id) {
      const { data: adSetData } = await supabase
        .from('ad_sets')
        .select(`
          campaigns (
            ad_account (
              brand_id
            )
          )
        `)
        .eq('id', adData.ad_set_id)
        .single();
      
      brandId = adSetData?.campaigns?.[0]?.ad_account?.[0]?.brand_id || null;
    }

    // Transform ad data to match expected format
    const ad = {
      id: adData.id,
      ad_id: adData.id.toString(),
      ad_name: adData.name,
      ad_title: adData.title,
      ad_text: adData.body_text,
      image: adData.image_url,
      image_url: adData.image_url,
      video_url: adData.video_url,
      post_link: adData.permalink_url,
      created_at: adData.source_created_time,
      funnel: adData.funnel,
      angle_type: adData.angle_type,
      'Angel Type': adData.angle_type,
      Angel: adData.angle,
      Explanation: adData.analysis_explanation,
      ad_set_id: adData.ad_set_id,
      brand_id: brandId
    };

    // Get comments for this ad using the same method as database functions
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('ad_id', adIdBigint) // Use bigint adId to match the database schema
      .order('created_time', { ascending: false });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      // Don't throw, just return empty comments
    }

    console.log(`Found ${comments?.length || 0} comments for ad ${adId}`);

    // Transform comments to match expected format
    const transformedComments = (comments || []).map(comment => ({
      id: comment.comment_id, // Use comment_id as the primary identifier
      comment_id: comment.comment_id,
      message: comment.message, // Use message field (not comment_text)
      created_time: comment.created_time, // Use created_time field
      created_at: comment.created_at,
      ad_id: comment.ad_id?.toString(),
      sentiment: comment.sentiment,
      theme: comment.theme,
      brand: comment.brand, // Include brand from comment if available
      ad_title: adData.title,
      'Angel Type': adData.angle_type,
      meta_cluster: null, // Will be populated from clusters if needed
      funnel: adData.funnel
    }));

    // Get unique clusters from comments - for now return empty as cluster relationship needs investigation
    const clusters: any[] = [];

    return NextResponse.json({ ad, comments: transformedComments, clusters });
  } catch (error) {
    console.error(`Error fetching data for ad ${adId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch ad data' }, { status: 500 });
  }
}
