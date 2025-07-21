'use client';

import { useRouter } from 'next/navigation';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

import { useSearchParams } from 'next/navigation';
import SidebarLayout from '../components/SidebarLayout';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getBrands, getBrandDashboardData, getFilteredComments } from '@/app/actions';
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
    funnel,
    angel,
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
    setFunnel,
    setAngel,
    setSearchQuery,
    setSelectedTab,
    setBrandData,
    setLoading,
    setUntrackedInfo,
    setAnalyzingStatus,
  } = useAppStore();
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportAdsRange, setExportAdsRange] = useState<{ startDate: Date; endDate: Date }>({ startDate: dateRange.start, endDate: dateRange.end });
  const [exportCommentsRange, setExportCommentsRange] = useState<{ startDate: Date; endDate: Date }>({ startDate: dateRange.start, endDate: dateRange.end });
  const [filteredComments, setFilteredComments] = useState<any[]>([]);
  
  // Comment table specific filters
  const [commentSentimentFilter, setCommentSentimentFilter] = useState('');
  const [commentClusterFilter, setCommentClusterFilter] = useState('');
  const [commentAngleTypeFilter, setCommentAngleTypeFilter] = useState('');

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
            const result = await getBrandDashboardData(selectedBrand.id, dateRange, sentiment, funnel, angel, searchQuery);
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
  }, [selectedBrand, dateRange, sentiment, funnel, angel, searchQuery, setLoading, setBrandData, setUntrackedInfo, setAnalyzingStatus]);

  // Separate effect for fetching filtered comments when on comments tab
  useEffect(() => {
    const fetchFilteredComments = async () => {
      if (!selectedBrand || selectedTab !== 'comments') return;
      
      setLoading(true);
      try {
        // Get ad IDs to filter by (either selected ads or all ads from current view)
        const adIdsToFilter = selectedAdIds.length > 0
          ? selectedAdIds
          : brandData?.ads?.map(ad => ad.ad_id) || [];
        
        const comments = await getFilteredComments(
          selectedBrand.id,
          adIdsToFilter.length > 0 ? adIdsToFilter : undefined,
          commentSentimentFilter || undefined,
          commentClusterFilter || undefined,
          commentAngleTypeFilter || undefined,
          searchQuery,
          dateRange // Use page date filter for comments when on comments tab
        );
        setFilteredComments(comments);
      } catch (err) {
        console.error('Error fetching filtered comments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredComments();
  }, [selectedBrand, selectedTab, dateRange, commentSentimentFilter, commentAngleTypeFilter, commentClusterFilter, searchQuery, selectedAdIds, brandData?.ads, setLoading]);

  const handleSelectBrand = (brand: { id: string; brand_name: string }) => {
    setSelectedBrand(brand.id === '' ? undefined : brand);
  };

  const doExport = async () => {
    if (!selectedBrand) return;
    
    try {
      const exportData = {
        brandId: selectedBrand.id,
        adsDateRange: {
          startDate: exportAdsRange.startDate.toISOString(),
          endDate: exportAdsRange.endDate.toISOString()
        },
        commentsDateRange: {
          startDate: exportCommentsRange.startDate.toISOString(),
          endDate: exportCommentsRange.endDate.toISOString()
        },
        sentiment: sentiment && sentiment !== 'all' ? sentiment : undefined,
        funnel: funnel && funnel !== 'all' ? funnel : undefined,
        angel: angel && angel !== 'all' ? angel : undefined,
        searchQuery: searchQuery || undefined,
        selectedAdIds: selectedAdIds.length > 0 ? selectedAdIds : undefined,
        // Comment-specific filters
        commentSentiment: commentSentimentFilter || undefined,
        commentCluster: commentClusterFilter || undefined,
        commentAngelType: commentAngleTypeFilter || undefined
      };

      const response = await fetch('/api/brands/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brand-${selectedBrand.id}-export.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleUntrackedAdsClick = async () => {
    if (untrackedAdIds.length === 0 || !selectedBrand) return;
    try {
      const adsWebhookUrl = process.env.NEXT_PUBLIC_ADS_WEBHOOK_URL;
      if (!adsWebhookUrl) {
        toast.error('Ads webhook URL is not configured.');
        return;
      }
      const response = await fetch(adsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_ids: untrackedAdIds, brand_id: selectedBrand.id }),
      });
      if (response.ok) {
        toast.success('Untracked ads sent for analysis!');
        // Immediately show loading animation on successful webhook call
        setAnalyzingStatus({ ad: true, comment: isCommentAnalyzing });
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
      const commentsWebhookUrl = process.env.NEXT_PUBLIC_COMMENTS_WEBHOOK_URL;
      if (!commentsWebhookUrl) {
        toast.error('Comments webhook URL is not configured.');
        return;
      }
      const response = await fetch(commentsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_ids: untrackedCommentIds, brand_id: selectedBrand.id }),
      });
      if (response.ok) {
        toast.success('Untracked comments sent for analysis!');
        // Immediately show loading animation on successful webhook call
        setAnalyzingStatus({ ad: isAdAnalyzing, comment: true });
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
          <div className="flex gap-2">
            <button
              onClick={() => {
                setExportAdsRange({ startDate: dateRange.start, endDate: dateRange.end });
                setExportCommentsRange({ startDate: dateRange.start, endDate: dateRange.end });
                setShowExportModal(true);
              }}
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
            Select a brand to view detailed analytics test text 2
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
                  {/* Filter Controls */}
                  <div className="mb-4 flex gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filter by Funnel
                      </label>
                      <select
                        value={funnel}
                        onChange={(e) => setFunnel(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="all">All Funnels</option>
                        <option value="TOF">TOF </option>
                        <option value="MOF">MOF </option>
                        <option value="BOF">BOF </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filter by Angel
                      </label>
                      <select
                        value={angel}
                        onChange={(e) => setAngel(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="all">All Angels</option>
                        {brandData?.ads && Array.from(new Set(brandData.ads.map(ad => ad.angle_type || 'Unknown'))).map(angelType => (
                          <option key={angelType} value={angelType}>{angelType}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  ) : brandData?.ads && brandData.ads.length > 0 ? (
                    <AdTable
                      ads={brandData.ads.filter(ad =>
                        (!searchQuery ||
                        (ad.ad_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (ad.ad_text?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (ad.ad_title?.toLowerCase().includes(searchQuery.toLowerCase()))) &&
                        (funnel === 'all' || ad.funnel === funnel) &&
                        (angel === 'all' || ad.angle_type === angel)
                      )}
                      selectedAdIds={selectedAdIds}
                      onSelectedAdIdsChange={setSelectedAdIds}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No ads found for this brand with the selected filters.
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
                  ) : filteredComments && filteredComments.length > 0 ? (
                    <CommentTable
                    comments={filteredComments}
                    ads={brandData?.ads || []}
                    selectedAdIds={selectedAdIds}
                    sentimentFilter={commentSentimentFilter}
                    setSentimentFilter={setCommentSentimentFilter}
                    clusterFilter={commentClusterFilter}
                    setClusterFilter={setCommentClusterFilter}
                    angleTypeFilter={commentAngleTypeFilter}
                    setAngleTypeFilter={setCommentAngleTypeFilter}
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Export Brand Data
                </h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Ads Date Range */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Ads Date Range
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <DateRangePicker
                      className="w-full"
                      initialRange={exportAdsRange}
                      onChange={(range) => {
                        setExportAdsRange(range);
                      }}
                    />
                  </div>
                </div>

                {/* Comments Date Range */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Comments Date Range
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <DateRangePicker
                      className="w-full"
                      initialRange={exportCommentsRange}
                      onChange={(range) => {
                        setExportCommentsRange(range);
                      }}
                    />
                  </div>
                </div>

                {/* Export Summary */}
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Export Summary
                  </h4>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <div>
                      <strong>Brand:</strong> {selectedBrand?.brand_name}
                    </div>
                    <div>
                      <strong>Selected Ads:</strong> {selectedAdIds.length > 0 ? `${selectedAdIds.length} ads selected` : 'All visible ads'}
                    </div>
                    <div>
                      <strong>Ads Period:</strong> {exportAdsRange.startDate.toLocaleDateString()} - {exportAdsRange.endDate.toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Comments Period:</strong> {exportCommentsRange.startDate.toLocaleDateString()} - {exportCommentsRange.endDate.toLocaleDateString()}
                    </div>
                    {(sentiment && sentiment !== 'all') && (
                      <div>
                        <strong>Sentiment Filter:</strong> {sentiment}
                      </div>
                    )}
                    {(funnel && funnel !== 'all') && (
                      <div>
                        <strong>Funnel Filter:</strong> {funnel}
                      </div>
                    )}
                    {(angel && angel !== 'all') && (
                      <div>
                        <strong>Angel Filter:</strong> {angel}
                      </div>
                    )}
                    {searchQuery && (
                      <div>
                        <strong>Search Query:</strong> "{searchQuery}"
                      </div>
                    )}
                    {commentSentimentFilter && (
                      <div>
                        <strong>Comment Sentiment Filter:</strong> {commentSentimentFilter}
                      </div>
                    )}
                    {commentClusterFilter && (
                      <div>
                        <strong>Comment Cluster Filter:</strong> {commentClusterFilter}
                      </div>
                    )}
                    {commentAngleTypeFilter && (
                      <div>
                        <strong>Comment Angel Type Filter:</strong> {commentAngleTypeFilter}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={doExport}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Export to Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}