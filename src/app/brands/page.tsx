'use client';

import { useRouter } from 'next/navigation';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

import { useSearchParams } from 'next/navigation';
import SidebarLayout from '../components/SidebarLayout';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getBrands, getBrandDashboardData } from '@/app/actions';
import { useAppStore } from '@/lib/store';
import BrandSelector from '../components/BrandSelector';
import FilterBar from '../components/FilterBar';
import DateRangePicker from '../components/DateRangePicker';
import Dashboard from '../components/Dashboard';
import AdTable from '../components/report/AdTable';
import CommentTable from '../components/report/CommentTable';
import MediaGrid from '../components/report/MediaGrid';

export default function BrandsPage() {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, newSession: Session | null) => {
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
      <Suspense fallback={<div className="container mx-auto py-8 px-4">Loading brands...</div>}>
        <BrandsContent />
      </Suspense>
    </SidebarLayout>
  );
}

function BrandsContent() {
  const searchParams = useSearchParams();
  const initialBrand = searchParams.get('id');
  const {
    brands,
    selectedBrand,
    dateRange,
    sentiment,
    searchQuery,
    selectedTab,
    brandData,
    loading,
    untrackedAdsCount,
    untrackedCommentsCount,
    untrackedAdIds,
    untrackedCommentIds,
    isAdAnalyzing,
    isCommentAnalyzing,
    setBrands,
    setSelectedBrand,
    setDateRange,
    setSentiment,
    setSearchQuery,
    setSelectedTab,
    setBrandData,
    setLoading,
    setUntrackedInfo,
    setAnalyzingStatus,
  } = useAppStore();
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);

  useEffect(() => {
  if (initialBrand) {
  if (selectedBrand?.id.toString() !== initialBrand) {
  const fetchAndSetInitialBrand = async () => {
  const allBrands = await getBrands();
  setBrands(allBrands);
  if (allBrands) {
  const brand = allBrands.find((b: any) => b.id.toString() === initialBrand);
  if (brand) {
  setSelectedBrand(brand);
  }
  }
  };
  fetchAndSetInitialBrand();
  }
  } else {
  if (selectedBrand) {
  setSelectedBrand(undefined);
  }
  getBrands().then(setBrands);
  }
  }, [initialBrand, selectedBrand, setBrands, setSelectedBrand]);


  useEffect(() => {
    const fetchBrandData = async () => {
      if (!selectedBrand) return;
        setLoading(true);
        try {
            const result = await getBrandDashboardData(selectedBrand.id, dateRange, sentiment, searchQuery);
            setBrandData(result);
                          if (result.untracked_info) {
                            setUntrackedInfo({
                              adsCount: result.untracked_info.untracked_ads_count,
                              commentsCount: result.untracked_info.untracked_comments_count,
                              adIds: result.untracked_info.untracked_ad_ids || [],
                              commentIds: result.untracked_info.untracked_comment_ids || [],
                            });
                          }
                          if (result.brand_status) {
                            setAnalyzingStatus({
                              ad: result.brand_status.is_ad_analyzing,
                              comment: result.brand_status.is_comment_analyzing,
                            });
                          }
        } catch (err) {
            console.error('Error fetching brand data:', err);
        } finally {
            setLoading(false);
        }
    };

    fetchBrandData();
  }, [selectedBrand, dateRange, sentiment, searchQuery, setLoading, setBrandData, setUntrackedInfo, setAnalyzingStatus]);

  const handleSelectBrand = (brand: { id: string; brand_name: string }) => {
    setSelectedBrand(brand.id === '' ? undefined : brand);
  };

  const doExport = (range: { start: Date; end: Date }) => {
    if (!selectedBrand) return;
    let url = `/api/brands/export?brand_id=${encodeURIComponent(selectedBrand.id)}`;
    if (range) {
      url += `&startDate=${range.start.toISOString()}&endDate=${range.end.toISOString()}`;
    }
    if (sentiment && sentiment !== 'all') {
      url += `&sentiment=${encodeURIComponent(sentiment)}`;
    }
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }
    window.open(url, '_blank');
  };

  const handleUntrackedAdsClick = async () => {
    if (untrackedAdIds.length === 0 || !selectedBrand) return;
    try {
      const response = await fetch('https://n8n.btmls.com/webhook/174ccec0-1203-4873-88de-af45302fb3e8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_ids: untrackedAdIds, brand_id: selectedBrand.id }),
      });
      if (response.ok) {
        toast.success('Untracked ads sent for analysis!');
      } else {
        toast.error('Failed to send untracked ads.');
      }
    } catch (error) {
      console.error('Error sending untracked ads:', error);
      toast.error('An error occurred while sending untracked ads.');
    }
  };

  const handleUntrackedCommentsClick = async () => {
    if (untrackedCommentIds.length === 0 || !selectedBrand) return;
    try {
      const response = await fetch('https://n8n.btmls.com/webhook/5587ef6a-d610-4a48-98c4-9fe624619be7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_ids: untrackedCommentIds, brand_id: selectedBrand.id }),
      });
      if (response.ok) {
        toast.success('Untracked comments sent for analysis!');
      } else {
        toast.error('Failed to send untracked comments.');
      }
    } catch (error) {
      console.error('Error sending untracked comments:', error);
      toast.error('An error occurred while sending untracked comments.');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 relative">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          {selectedBrand ? `${selectedBrand.brand_name} Analytics` : 'Brand Analytics'}
        </h1>
        {selectedBrand && (
          <div className="relative">
            <button
              onClick={() => doExport(dateRange)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Export
            </button>
            <button
              onClick={handleUntrackedAdsClick}
              className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
              disabled={isAdAnalyzing || untrackedAdsCount === 0}
            >
              {isAdAnalyzing && (
                <span className="animate-spin inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" aria-label="Loading"></span>
              )}
              {`${untrackedAdsCount} Untracked Ads`}
            </button>
            <button
              onClick={handleUntrackedCommentsClick}
              className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
              disabled={isCommentAnalyzing || untrackedCommentsCount === 0}
            >
              {isCommentAnalyzing && (
                <span className="animate-spin inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" aria-label="Loading"></span>
              )}
              {`${untrackedCommentsCount} Untracked Comments`}
            </button>
          </div>
        )}
      </div>

      {!selectedBrand ? (
        <>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Select a brand to view detailed analytics
          </p>
          <BrandSelector
            brands={brands}
            selectedBrand={selectedBrand}
            onSelectBrand={handleSelectBrand}
            displayAs="cards"
          />
        </>
      ) : (
        <>
          <div className="mb-6">
            <FilterBar
              onDateRangeChange={setDateRange}
              onSentimentChange={setSentiment}
              onSearchChange={setSearchQuery}
              showSearch={selectedTab !== 'overview'}
            />
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{selectedBrand.brand_name} Overview</h2>
              <button
                onClick={() => setSelectedBrand(undefined)}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                &larr; Back to All Brands
              </button>
            </div>

            <div className="mb-8">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  className={`py-2 px-4 ${selectedTab === 'overview' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  onClick={() => setSelectedTab('overview')}
                >
                  Overview
                </button>
                <button
                  className={`py-2 px-4 ${selectedTab === 'ads' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  onClick={() => setSelectedTab('ads')}
                >
                  Ads
                </button>
                <button
                  className={`py-2 px-4 ${selectedTab === 'comments' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  onClick={() => setSelectedTab('comments')}
                >
                  Comments
                </button>
                <button
                  className={`py-2 px-4 ${selectedTab === 'media' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  onClick={() => setSelectedTab('media')}
                >
                  Media
                </button>
              </div>
            </div>

            {selectedTab === 'overview' && (
              <Dashboard
                data={brandData}
                loading={loading}
                showExtendedAnalysis={true}
              />
            )}

            {selectedTab === 'ads' && (
              <>
                <h3 className="text-lg font-medium mb-4">All Ads</h3>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  ) : brandData?.ads && brandData.ads.length > 0 ? (
                    <AdTable
                      ads={brandData.ads}
                      selectedAdIds={selectedAdIds}
                      onSelectedAdIdsChange={setSelectedAdIds}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No ads found for this brand.
                    </div>
                  )}
                </div>
              </>
            )}

            {selectedTab === 'comments' && (
              <>
                <h3 className="text-lg font-medium mb-4">All Comments</h3>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  ) : brandData?.allComments && brandData.allComments.length > 0 ? (
                    <CommentTable
                    comments={brandData.allComments}
                    ads={brandData.ads || []}
                    selectedAdIds={selectedAdIds}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No comments found for this brand.
                    </div>
                  )}
                </div>
              </>
            )}

            {selectedTab === 'media' && (
              <>
                <h3 className="text-lg font-medium mb-4">Media Gallery</h3>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  ) : brandData?.ads && brandData.ads.length > 0 ? (
                    <MediaGrid ads={brandData.ads} />
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No media found for this brand.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}