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
  angle_type?: string;
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
    ad["Angel Type"] ||
    ad["Angel"] ||
    ad["angel_type"] ||
    ad["angel"] ||
    ad["angle_type"] ||
    ad["angle"] ||
    'Unknown'
  );
}

// Fetch all ads
export async function fetchAds() {
  console.log('Fetching all ads...');
  const { data, error } = await supabase
  	.from('ad_per_ad_account')
  	.select('*, brands(brand_name)');
  
  if (error) throw error;
  console.log('Raw ads from Supabase:', data);
  const mapped = (data as any[]).map(ad => ({
    ...ad,
    angle_type: getAngleType(ad),
    created_at: parseToDate(ad.created_at)?.toISOString() ?? null,
  }));
  console.log('Mapped ads with angle_type:', mapped);
  return mapped;
}

// Fetch a specific ad by ID
export async function fetchAdById(adId: string) {
  const { data, error } = await supabase
  	.from('ad_per_ad_account')
  	.select('*, image, brands(brand_name)')
  	.eq('ad_id', adId)
  	.single();
  
  if (error) throw error;
  console.log('Raw ad from Supabase:', data);
  const mapped = {
    ...data,
    angle_type: getAngleType(data),
    created_at: parseToDate((data as any).created_at)?.toISOString() ?? null,
  } as Ad;
  console.log('Mapped ad with angle_type:', mapped);
  return mapped;
}

// Fetch ads by brand
export async function fetchAdsByBrand(brand_id: string) {
	const { data, error } = await supabase
		.from('ad_per_ad_account')
		.select('*, brands(brand_name)')
		.eq('brand_id', brand_id);
  
  if (error) throw error;
  console.log('Raw ads by brand from Supabase:', data);
  const mapped = (data as any[]).map(ad => ({
    ...ad,
    angle_type: getAngleType(ad),
    created_at: parseToDate(ad.created_at)?.toISOString() ?? null,
  }));
  console.log('Mapped ads by brand with angle_type:', mapped);
  return mapped;
}

// Fetch all comments
export async function fetchComments() {
  console.log('Fetching all comments...');
  const { data, error } = await supabase
    .from('comments')
    .select('*');
  
  if (error) throw error;
  console.log(`Retrieved ${data.length} comments from database`);
  const mappedComments = (data as any[]).map(c => ({
    ...c,
    created_time: parseToDate(c.created_time)?.toISOString() ?? null,
  }));
  return mappedComments as Comment[];
}

// Fetch comments for a specific ad
export async function fetchCommentsByAdId(adId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('ad_id', adId);
  
  if (error) throw error;
  const mappedComments = (data as any[]).map(c => ({
    ...c,
    created_time: parseToDate(c.created_time)?.toISOString() ?? null,
  }));
  return mappedComments as Comment[];
}

// Fetch comments by brand
export async function fetchCommentsByBrand(brand_id: string) {
	const { data: ads, error: adsError } = await supabase
		.from('ad_per_ad_account')
		.select('ad_id')
		.eq('brand_id', brand_id);

	if (adsError) throw adsError;

	const adIds = ads.map(ad => ad.ad_id);

	const { data, error } = await supabase
		.from('comments')
		.select('*')
		.in('ad_id', adIds);
  
  if (error) throw error;
  const mappedComments = (data as any[]).map(c => ({
    ...c,
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

// Fetch unique brands
export async function fetchBrands() {
	const { data, error } = await supabase
		.from('brands')
		.select('id, brand_name');
	
	if (error) throw error;

	return data || [];
}

// Fetch dashboard metrics
export async function fetchDashboardMetrics() {
  // Fetch count of ads
  const { count: adCount, error: adError } = await supabase
    .from('ad_per_ad_account')
    .select('*', { count: 'exact', head: true });
  
  if (adError) throw adError;
  
  // Fetch count of comments
  const { count: commentCount, error: commentError } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true });
  
  if (commentError) throw commentError;
  
  // Fetch sentiment distribution
  const { data: sentimentData, error: sentimentError } = await supabase
    .from<any, { sentiment: string | null }>('comments')
    
    .select('sentiment')
    .not('sentiment', 'is', null);
  console.log('Raw sentimentData from Supabase:', sentimentData);
  
  if (sentimentError) throw sentimentError;
  
  // Calculate sentiment percentages
  const sentiments: string[] = (sentimentData ?? []).map((item: { sentiment: string | null }) => item.sentiment?.toLowerCase() ?? '');
  const sentimentCounts = {
    positive: sentiments.filter((s: string) => s === 'positive').length,
    negative: sentiments.filter((s: string) => s === 'negative').length,
    neutral: sentiments.length - sentiments.filter((s: string) => s === 'positive' || s === 'negative').length,
  };
  
  const totalSentiments = sentiments.length || 1; // Avoid division by zero
  
  return {
    totalAds: adCount || 0,
    totalComments: commentCount || 0,
    sentimentDistribution: {
      positive: (sentimentCounts.positive / totalSentiments) * 100,
      negative: (sentimentCounts.negative / totalSentiments) * 100,
      neutral: (sentimentCounts.neutral / totalSentiments) * 100,
    }
  };
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
export async function fetchBrandStatus(brand_id: string) {
  const { data, error } = await supabase
    .from('brands')
    .select('is_ad_analyzing,is_comment_analyzing')
    .eq('id', brand_id)
    .single();
  if (error) throw error;
  return data;
}