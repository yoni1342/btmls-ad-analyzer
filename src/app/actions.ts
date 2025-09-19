'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { transformDataForDashboard } from '@/lib/datamapper';

export async function getBrands() {
  const { data, error } = await supabase
    .from('brands')
    .select('id, brand_name');

  if (error) throw error;

  const brands = data || [];
  revalidatePath('/brands');
  return brands;
}


export async function getBrandDashboardData(
  brandId?: string,
  dateRange?: { start: Date; end: Date },
  sentiment?: string,
  funnel?: string,
  angel?: string,
  searchQuery?: string,
  returnFullData: boolean = false  // New parameter to control data return
) {
  // Check if this is a lifetime query (start date is Unix epoch)
  const isLifetimeQuery = dateRange?.start && dateRange.start.getTime() === 0;
  
  const { data, error } = await supabase.rpc('get_dashboard_data', {
  brand_id_param: brandId ? parseInt(brandId, 10) : null,
  start_date_param: isLifetimeQuery ? null : dateRange?.start?.toISOString() || null,
  end_date_param: isLifetimeQuery ? null : dateRange?.end?.toISOString() || null,
      sentiment_param: sentiment,
      funnel_param: funnel,
      angel_param: angel,
      return_full_data: returnFullData  // Pass the parameter to the database function
  });

  if (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
  
  const transformedData = transformDataForDashboard(data, dateRange);
 
  const { data: comparisonData, error: comparisonError } = await supabase.rpc('get_sentiments_with_comparison', {
  	brand_id_param: brandId ? parseInt(brandId, 10) : null,
  	start_date_param: isLifetimeQuery ? null : dateRange?.start?.toISOString() || null,
  	end_date_param: isLifetimeQuery ? null : dateRange?.end?.toISOString() || null,
  	ad_ids_param: null,
  	sentiment_param: sentiment,
  	cluster_param: null,
  	angel_param: angel,
  	search_query_param: searchQuery
  });
 
  if (comparisonError) {
  	console.error('Error fetching comparison data:', comparisonError);
  	return transformedData;
  }
 
  if (comparisonData) {
  	const calculatePercentageChange = (current: number, previous: number) => {
  		if (previous === 0) {
  			return current > 0 ? 100.0 : 0.0;
  		}
  		return ((current - previous) / previous) * 100;
  	};
 
  	const current_period_data = comparisonData.current_period || {};
  	const previous_period_data = comparisonData.previous_period || {};
 
  	// Update Total Ads
  	const total_ads_change = calculatePercentageChange(current_period_data.total_ads || 0, previous_period_data.total_ads || 0);
  	const totalAdsMetric = transformedData.metrics.find(m => m.id === 'total_ads');
  	if (totalAdsMetric) totalAdsMetric.change = total_ads_change;
 
  	// Update Total Comments (this will also be filtered by sentiment if a filter is active)
  	const total_comments_change = calculatePercentageChange(current_period_data.total_comments || 0, previous_period_data.total_comments || 0);
  	const totalCommentsMetric = transformedData.metrics.find(m => m.id === 'total_comments');
  	if (totalCommentsMetric) totalCommentsMetric.change = total_comments_change;
 
  	// --- Handle Sentiment Changes ---
  	if (sentiment && sentiment !== 'all') {
  		// A sentiment filter is active. The change for that metric is the change in total comments.
  		const metric = transformedData.metrics.find(m => m.id.includes(sentiment));
  		if (metric) metric.change = total_comments_change;
 
  	} else {
  		// No sentiment filter. Compare percentages across all sentiments.
  		const calculateSentimentPercentages = (comments: any[]) => {
  			const counts = { positive: 0, negative: 0, neutral: 0, total: 0 };
  			if (!comments || comments.length === 0) return { positive: 0, negative: 0, neutral: 0 };
  			for (const comment of comments) {
  				counts.total++;
  				const sentiment = comment.sentiment?.toLowerCase().trim();
  				if (sentiment === 'positive') counts.positive++;
  				else if (sentiment === 'negative') counts.negative++;
  				else if (sentiment === 'neutral') counts.neutral++;
  			}
  			return {
  				positive: (counts.positive / counts.total) * 100,
  				negative: (counts.negative / counts.total) * 100,
  				neutral: (counts.neutral / counts.total) * 100,
  			};
  		};
  		const current_percentages = calculateSentimentPercentages(current_period_data.comments || []);
  		const previous_percentages = calculateSentimentPercentages(previous_period_data.comments || []);
 
  		const positive_change = calculatePercentageChange(current_percentages.positive, previous_percentages.positive);
  		const negative_change = calculatePercentageChange(current_percentages.negative, previous_percentages.negative);
  		const neutral_change = calculatePercentageChange(current_percentages.neutral, previous_percentages.neutral);
 
  		const positiveMetric = transformedData.metrics.find(m => m.id === 'positive_sentiment');
  		if (positiveMetric) positiveMetric.change = positive_change;
  		const negativeMetric = transformedData.metrics.find(m => m.id === 'negative_sentiment');
  		if (negativeMetric) negativeMetric.change = negative_change;
  		const neutralMetric = transformedData.metrics.find(m => m.id === 'neutral_sentiment');
  		if (neutralMetric) neutralMetric.change = neutral_change;
  	}
  }
 
  return transformedData;
}

export async function getFilteredComments(
  brandId: string,
  adIds?: string[],
  sentiment?: string,
  cluster?: string,
  angel?: string,
  searchQuery?: string,
  dateRange?: { start: Date; end: Date }
) {
  // Check if this is a lifetime query (start date is Unix epoch)
  const isLifetimeQuery = dateRange?.start && dateRange.start.getTime() === 0;
  
  const { data, error } = await supabase.rpc('get_filtered_data', {
    brand_id_param: parseInt(brandId, 10),
    ad_ids_param: adIds && adIds.length > 0 ? adIds : null,
    sentiment_param: sentiment,
    cluster_param: cluster,
    angel_param: angel,
    search_query_param: searchQuery,
    start_date_param: isLifetimeQuery ? null : dateRange?.start?.toISOString() || null,
    end_date_param: isLifetimeQuery ? null : dateRange?.end?.toISOString() || null
  });

  if (error) {
    console.error('Error fetching filtered comments:', error);
    throw error;
  }

  return data || [];
}

export async function getCampaigns(
  brandId: string,
  dateRange?: { start: Date; end: Date }
) {
  // Get campaigns from the main dashboard data (with full data for brands page)
  const dashboardData = await getBrandDashboardData(brandId, dateRange, undefined, undefined, undefined, undefined, true);
  return dashboardData?.campaigns || [];
}

export async function getAdSets(
  brandId: string,
  dateRange?: { start: Date; end: Date },
  campaignIds?: string[]
) {
  // Get ad sets from the main dashboard data (with full data for brands page)
  const dashboardData = await getBrandDashboardData(brandId, dateRange, undefined, undefined, undefined, undefined, true);
  let adSets = dashboardData?.ad_sets || [];
  
  // Filter ad sets by selected campaigns if provided
  if (campaignIds && campaignIds.length > 0) {
    adSets = adSets.filter(adSet =>
      campaignIds.includes(adSet.campaign_id?.toString())
    );
  }

  return adSets;
}

export async function getFilteredAds(
  brandId: string,
  dateRange?: { start: Date; end: Date },
  adSetIds?: string[],
  funnel?: string,
  angel?: string,
  searchQuery?: string
) {
  // Get the full dashboard data to extract ads (with full data for brands page)
  const dashboardData = await getBrandDashboardData(brandId, dateRange, undefined, funnel, angel, searchQuery, true);
  
  let ads = dashboardData?.ads || [];
  
  // Filter ads by selected ad sets if provided
  if (adSetIds && adSetIds.length > 0) {
    ads = ads.filter(ad =>
      ad.ad_set_id && adSetIds.includes(ad.ad_set_id.toString())
    );
  }
  
  return ads;
}
