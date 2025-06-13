import { supabase } from './supabase';

// Types based on the database schema
export type Ad = {
  id: number;
  ad_id: string;
  ad_name: string;
  account_id: string;
  brand: string;
  ad_text: string;
  ad_title: string;
  image_url: string;
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
  brand: string;
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
    .from('Ad per Ad Account')
    .select('*');
  
  if (error) throw error;
  console.log('Raw ads from Supabase:', data);
  const mapped = (data as any[]).map(ad => ({
    ...ad,
    angle_type: getAngleType(ad),
  }));
  console.log('Mapped ads with angle_type:', mapped);
  return mapped;
}

// Fetch a specific ad by ID
export async function fetchAdById(adId: string) {
  const { data, error } = await supabase
    .from('Ad per Ad Account')
    .select('*')
    .eq('ad_id', adId)
    .single();
  
  if (error) throw error;
  console.log('Raw ad from Supabase:', data);
  const mapped = {
    ...data,
    angle_type: getAngleType(data),
  } as Ad;
  console.log('Mapped ad with angle_type:', mapped);
  return mapped;
}

// Fetch ads by brand
export async function fetchAdsByBrand(brand: string) {
  const { data, error } = await supabase
    .from('Ad per Ad Account')
    .select('*')
    .eq('brand', brand);
  
  if (error) throw error;
  console.log('Raw ads by brand from Supabase:', data);
  const mapped = (data as any[]).map(ad => ({
    ...ad,
    angle_type: getAngleType(ad),
  }));
  console.log('Mapped ads by brand with angle_type:', mapped);
  return mapped;
}

// Fetch all comments
export async function fetchComments() {
  console.log('Fetching all comments...');
  const { data, error } = await supabase
    .from('Comments')
    .select('*');
  
  if (error) throw error;
  console.log(`Retrieved ${data.length} comments from database`);
  return data as Comment[];
}

// Fetch comments for a specific ad
export async function fetchCommentsByAdId(adId: string) {
  const { data, error } = await supabase
    .from('Comments')
    .select('*')
    .eq('ad_id', adId);
  
  if (error) throw error;
  return data as Comment[];
}

// Fetch comments by brand
export async function fetchCommentsByBrand(brand: string) {
  const { data, error } = await supabase
    .from('Comments')
    .select('*')
    .eq('brand', brand);
  
  if (error) throw error;
  return data as Comment[];
}

// Fetch all comment clusters
export async function fetchCommentClusters() {
  const { data, error } = await supabase
    .from('Comment Claster')
    .select('*');
  
  if (error) throw error;
  return data as CommentCluster[];
}

// Fetch unique brands
export async function fetchBrands() {
  const { data, error } = await supabase
    .from('Ad per Ad Account')
    .select('brand')
    .not('brand', 'is', null);
  
  if (error) throw error;
  
  // Extract unique brands
  const uniqueBrands = [...new Set(data.map(item => item.brand))];
  return uniqueBrands;
}

// Fetch dashboard metrics
export async function fetchDashboardMetrics() {
  // Fetch count of ads
  const { count: adCount, error: adError } = await supabase
    .from('Ad per Ad Account')
    .select('*', { count: 'exact', head: true });
  
  if (adError) throw adError;
  
  // Fetch count of comments
  const { count: commentCount, error: commentError } = await supabase
    .from('Comments')
    .select('*', { count: 'exact', head: true });
  
  if (commentError) throw commentError;
  
  // Fetch sentiment distribution
  const { data: sentimentData, error: sentimentError } = await supabase
    .from('Comments')
    .select('sentiment')
    .not('sentiment', 'is', null);
  
  if (sentimentError) throw sentimentError;
  
  // Calculate sentiment percentages
  const sentiments = sentimentData.map(item => item.sentiment?.toLowerCase());
  const sentimentCounts = {
    positive: sentiments.filter(s => s === 'positive').length,
    negative: sentiments.filter(s => s === 'negative').length,
    neutral: sentiments.length - sentiments.filter(s => s === 'positive' || s === 'negative').length,
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
    .from('Cluster Comments')
    .select('*');
  if (error) throw error;
  return data as { id: number; comment_id: string }[];
} 