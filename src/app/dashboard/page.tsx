'use client';

import { useRouter } from 'next/navigation';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

import { useSearchParams } from 'next/navigation';
import Dashboard from '../components/Dashboard';
import SidebarLayout from '../components/SidebarLayout';
import { Suspense, useEffect, useState } from 'react';
import FilterBar from '../components/FilterBar';
import BrandSelector from '../components/BrandSelector';
import { useAppStore } from '@/lib/store';
import { getBrands, getBrandDashboardData } from '@/app/actions';

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/auth?mode=login');
      } else {
        setSession(data.session);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, newSession) => {
      if (!newSession) {
        router.replace('/auth?mode=login');
      } else {
        setSession(newSession);
      }
    });
    return () => { subscription.unsubscribe(); };
  }, [router]);

  if (!session) return null;
  return (
    <SidebarLayout>
      <Suspense fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </SidebarLayout>
  );
}

function DashboardContent() {
  const {
    brands,
    selectedBrand,
    dateRange,
    sentiment,
    funnel,
    angel,
    searchQuery,
    setBrands,
    setSelectedBrand,
    setDateRange,
    setSentiment,
    setFunnel,
    setAngel,
    setSearchQuery,
    setBrandData,
    brandData,
    setLoading,
    loading
  } = useAppStore();

  useEffect(() => {
    getBrands().then(setBrands);
  }, [setBrands]);

  useEffect(() => {
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const data = await getBrandDashboardData(selectedBrand?.id, dateRange, sentiment, funnel, angel);
            setBrandData(data);
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false);
        }
    }
    fetchDashboardData();
  }, [selectedBrand, dateRange, sentiment, funnel, angel, setBrandData, setLoading]);


  const handleBrandSelect = (brand: { id: string; brand_name: string }) => {
    setSelectedBrand(brand.id === '' ? undefined : brand);
  };

  const handleDateRangeChange = (range: { start: Date; end: Date }) => {
    setDateRange(range);
  };

  const handleSentimentChange = (newSentiment: string) => {
    setSentiment(newSentiment);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {selectedBrand
              ? `Viewing data for ${selectedBrand.brand_name}`
              : 'Overview of all brands and ads'}
          </p>
        </div>
        <div className="mt-4 md:mt-0"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="md:col-span-3">
          <FilterBar
            onDateRangeChange={handleDateRangeChange}
            onSentimentChange={handleSentimentChange}
            onSearchChange={handleSearchChange}
            showSearch={false}
          />
        </div>
        <div className="md:col-span-1">
          <BrandSelector 
            brands={brands}
            selectedBrand={selectedBrand} 
            onSelectBrand={handleBrandSelect}
            displayAs="dropdown"
          />
        </div>
      </div>
      
      <Dashboard 
        data={brandData}
        loading={loading}
      />
    </div>
  );
} 