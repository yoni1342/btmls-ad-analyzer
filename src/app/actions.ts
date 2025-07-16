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
  searchQuery?: string
) {
  const { data, error } = await supabase.rpc('get_dashboard_data', {
  brand_id_param: brandId ? parseInt(brandId, 10) : null,
  start_date_param: dateRange?.start.toISOString(),
  end_date_param: dateRange?.end.toISOString(),
      sentiment_param: sentiment,
      funnel_param: funnel,
      angel_param: angel
  });

  if (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
  
  return transformDataForDashboard(data, dateRange);
}