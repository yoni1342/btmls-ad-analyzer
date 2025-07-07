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
  searchQuery?: string
) {
  const { data, error } = await supabase.rpc('get_dashboard_data', {
  brand_id_param: brandId ? parseInt(brandId, 10) : null,
  start_date_param: dateRange?.start.toISOString(),
  end_date_param: dateRange?.end.toISOString(),
      sentiment_param: sentiment
  });

  if (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
  
  let transformedData = transformDataForDashboard(data, dateRange);
  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    transformedData.ads = transformedData.ads.filter(ad =>
      (ad.ad_name?.toLowerCase().includes(lowerQuery)) ||
      (ad.ad_text?.toLowerCase().includes(lowerQuery)) ||
      (ad.ad_title?.toLowerCase().includes(lowerQuery))
    );
    transformedData.allComments = transformedData.allComments.filter(comment =>
      comment.message?.toLowerCase().includes(lowerQuery) ||
      comment.theme?.toLowerCase().includes(lowerQuery)
    );
  }
  return transformedData;
}