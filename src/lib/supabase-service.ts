import { supabase } from './supabase';
import { parseToDate } from './normalizeDate';

// Types based on the database schema
export type Ad = {
  id: number;
  ad_id: string;
  ad_name: string;
  account_id: string;
  brand_id: string;
  ad_text: string;
  ad_title: string;
  image_url: string;
  image: string;
  video_url: string;
  post_link: string;
  created_at: string;
  angel: string;
  angel_type: string;
  explanation: string;
  comment: string;
  funnel?: string;
  angle_type?: string;
  total_comments?: number; // Total unfiltered comment count for this ad
  ad_set_id?: string; // For hierarchical filtering
  campaign_id?: string; // For hierarchical filtering
};

export type Comment = {
  id: number;
  comment_id: string;
  message: string;
  created_time: string;
  ad_id: string;
  created_at: string;
  theme: string;
  sentiment: string;
  ad_title?: string;
  meta_cluster?: string;
  'Angel Type'?: string; // Legacy format from database functions
  angle_type?: string;   // New format for compatibility
  funnel?: string;
};

export type CommentCluster = {
  id: number;
  cluster_name: string;
  cluster_description: string;
  comment: string;
  ad: string;
  meta_cluster: string;
  created_at: string;
  ad_id: string;
  comment_id: string;
};

// Utility to robustly map angle_type from various DB column names
function getAngleType(ad: any): string {
  return (
    ad.angle_type ||
    ad.angel_type ||
    ad['Angel Type'] ||
    ad['Angel'] ||
    ad['angel_type'] ||
    ad['angel'] ||
    ad['angle_type'] ||
    ad['angle'] ||
    'Unknown'
  );
}

// Fetch all ads using new hierarchical structure
export async function fetchAds() {
  console.log('Fetching all ads using hierarchical structure...');
  const { data, error } = await supabase
    .from('ads')
    .select(`
      *,
      ad_sets!inner(
        *,
        campaigns!inner(
          *,
          ad_account!inner(
            *,
            brands!inner(brand_name)
          )
        )
      )
    `);
  
  if (error) throw error;
  console.log('Raw ads from Supabase:', data);
  const mapped = (data as any[]).map(ad => ({
    ...ad,
    ad_id: ad.id.toString(), // Convert bigint to string for compatibility
    ad_name: ad.name,
    ad_text: ad.body_text,
    ad_title: ad.title,
    brand_id: ad.ad_sets?.campaigns?.ad_account?.brand_id,
    brand_name: ad.ad_sets?.campaigns?.ad_account?.brands?.brand_name,
    angel: ad.angle,
    angel_type: ad.angle_type,
    explanation: ad.analysis_explanation,
    angle_type: ad.angle_type,
    created_at: parseToDate(ad.created_at)?.toISOString() ?? null,
  }));
  console.log('Mapped ads with hierarchical data:', mapped);
  return mapped;
}

// Fetch a specific ad by ID using new hierarchical structure
export async function fetchAdById(adId: string) {
  // Convert string adId to bigint for new schema
  const adIdBigint = parseInt(adId, 10);
  
  const { data, error } = await supabase
    .from('ads')
    .select(`
      *,
      ad_sets!inner(
        *,
        campaigns!inner(
          *,
          ad_account!inner(
            *,
            brands!inner(brand_name)
          )
        )
      )
    `)
    .eq('id', adIdBigint)
    .single();
  
  if (error) throw error;
  console.log('Raw ad from Supabase:', data);
  const mapped = {
    ...data,
    ad_id: data.id.toString(), // Convert bigint to string for compatibility
    ad_name: data.name,
    ad_text: data.body_text,
    ad_title: data.title,
    brand_id: data.ad_sets?.campaigns?.ad_account?.brand_id,
    brand_name: data.ad_sets?.campaigns?.ad_account?.brands?.brand_name,
    angel: data.angle,
    angel_type: data.angle_type,
    explanation: data.analysis_explanation,
    angle_type: data.angle_type,
    created_at: parseToDate(data.created_at)?.toISOString() ?? null,
  } as Ad;
  console.log('Mapped ad with hierarchical data:', mapped);
  return mapped;
}


// Fetch all comments with hierarchical data
export async function fetchComments() {
  console.log('Fetching all comments with hierarchical structure...');
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      ads!inner(
        name,
        title,
        angle_type,
        funnel,
        ad_sets!inner(
          campaigns!inner(
            ad_account!inner(
              brands!inner(brand_name)
            )
          )
        )
      )
    `);
  
  if (error) throw error;
  console.log(`Retrieved ${data.length} comments from database`);
  const mappedComments = (data as any[]).map(c => ({
    ...c,
    ad_id: c.ad_id.toString(), // Convert bigint to string for compatibility
    ad_title: c.ads?.title,
    'Angel Type': c.ads?.angle_type, // Map to expected format
    funnel: c.ads?.funnel,
    created_time: parseToDate(c.created_time)?.toISOString() ?? null,
  }));
  return mappedComments as Comment[];
}

// Fetch comments for a specific ad using new bigint ad_id
export async function fetchCommentsByAdId(adId: string) {
  // Convert string adId to bigint for new schema
  const adIdBigint = parseInt(adId, 10);
  
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      ads!inner(
        name,
        title,
        angle_type,
        funnel,
        ad_sets!inner(
          campaigns!inner(
            ad_account!inner(
              brands!inner(brand_name)
            )
          )
        )
      )
    `)
    .eq('ad_id', adIdBigint);
  
  if (error) throw error;
  const mappedComments = (data as any[]).map(c => ({
    ...c,
    ad_id: c.ad_id.toString(), // Convert bigint to string for compatibility
    ad_title: c.ads?.title,
    'Angel Type': c.ads?.angle_type, // Map to expected format
    funnel: c.ads?.funnel,
    created_time: parseToDate(c.created_time)?.toISOString() ?? null,
  }));
  return mappedComments as Comment[];
}


// Fetch all comment clusters
export async function fetchCommentClusters() {
  const { data, error } = await supabase
    .from('comment_cluster')
    .select('*');
  
  if (error) throw error;
  return data as CommentCluster[];
}


// Fetch all cluster-comment mappings
export async function fetchClusterCommentMappings() {
  const { data, error } = await supabase
    .from('cluster_comments')
    .select('*');
  if (error) throw error;
  return data as { id: number; comment_id: string }[];
}

/**
 * Fetch analyzing status flags for a brand
 */