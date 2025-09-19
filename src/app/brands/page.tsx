'use client';

import { useRouter } from 'next/navigation';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

import { useSearchParams } from 'next/navigation';
import SidebarLayout from '../components/SidebarLayout';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getBrands, getBrandDashboardData, getBrandDashboardDataPaginated, getFilteredComments, getCampaigns, getAdSets, getFilteredAds } from '@/app/actions';
import { useAppStore } from '@/lib/store';
import BrandSelector from '../components/BrandSelector';
import FilterBar from '../components/FilterBar';
import DateRangePicker from '../components/DateRangePicker';
import Dashboard from '../components/Dashboard';
import AdTable from '../components/report/AdTable';
import CampaignTable from '../components/report/CampaignTable';
import AdSetsTable from '../components/report/AdSetsTable';
import CommentTable from '../components/report/CommentTable';

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
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedAdSetIds, setSelectedAdSetIds] = useState<string[]>([]);
  const [campaignsData, setCampaignsData] = useState<any[]>([]);
  const [adSetsData, setAdSetsData] = useState<any[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportAdsRange, setExportAdsRange] = useState<{ startDate: Date; endDate: Date }>({ startDate: dateRange.start, endDate: dateRange.end });
  const [exportCommentsRange, setExportCommentsRange] = useState<{ startDate: Date; endDate: Date }>({ startDate: dateRange.start, endDate: dateRange.end });
  const [filteredComments, setFilteredComments] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allAdsLoaded, setAllAdsLoaded] = useState<any[]>([]);
  
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
        setCurrentPage(1); // Reset to first page
        try {
            // Try paginated function first
            const result = await getBrandDashboardDataPaginated(
              selectedBrand.id, 
              dateRange, 
              sentiment, 
              funnel, 
              angel, 
              searchQuery, 
              1, // page 1
              100 // page size
            );
            
            setBrandData(result);
            
            // Set pagination info if available
            if (result.pagination) {
              setTotalPages(result.pagination.total_pages || 1);
            }
            
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
        } catch (err: any) {
            console.error('Error fetching brand data:', err);
            // If paginated function fails, fall back to regular function
            if (err.code === '42883') { // Function does not exist
              try {
                const result = await getBrandDashboardData(selectedBrand.id, dateRange, sentiment, funnel, angel, searchQuery, true);
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
              } catch (fallbackErr) {
                console.error('Error with fallback:', fallbackErr);
                toast.error('Failed to load brand data');
              }
            } else {
              toast.error('Failed to load brand data');
            }
        } finally {
            setLoading(false);
        }
    };

    fetchBrandData();
  }, [selectedBrand, dateRange, sentiment, funnel, angel, searchQuery, setLoading, setBrandData, setUntrackedInfo, setAnalyzingStatus]);
  
  // Function to load more ads
  const loadMoreAds = async () => {
    if (!selectedBrand || isLoadingMore || currentPage >= totalPages) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await getBrandDashboardDataPaginated(
        selectedBrand.id,
        dateRange,
        sentiment,
        funnel,
        angel,
        searchQuery,
        nextPage,
        100
      );
      
      // Append new ads to existing ones
      if (result.ads && result.ads.length > 0) {
        setBrandData(prev => ({
          ...prev,
          ads: [...(prev?.ads || []), ...result.ads]
        }));
        setCurrentPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading more ads:', err);
      toast.error('Failed to load more ads');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch campaigns data
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!selectedBrand) {
        setCampaignsData([]);
        return;
      }

      try {
        const campaigns = await getCampaigns(selectedBrand.id, dateRange);
        setCampaignsData(campaigns);
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        setCampaignsData([]);
      }
    };

    fetchCampaigns();
  }, [selectedBrand, dateRange]);

  // Fetch ad sets data based on selected campaigns
  useEffect(() => {
    const fetchAdSets = async () => {
      if (!selectedBrand) {
        setAdSetsData([]);
        return;
      }

      try {
        const adSets = await getAdSets(selectedBrand.id, dateRange, selectedCampaignIds);
        setAdSetsData(adSets);
      } catch (err) {
        console.error('Error fetching ad sets:', err);
        setAdSetsData([]);
      }
    };

    fetchAdSets();
  }, [selectedBrand, dateRange, selectedCampaignIds]);

  // Clear ad set selections when campaign selections change
  useEffect(() => {
    if (selectedCampaignIds.length === 0) {
      // If no campaigns selected, keep current ad set selections
      return;
    }
    
    // Clear ad set selections when campaigns change to avoid inconsistent state
    setSelectedAdSetIds([]);
  }, [selectedCampaignIds]);

  // Clear ad selections when ad set selections change
  useEffect(() => {
    if (selectedAdSetIds.length === 0) {
      // If no ad sets selected, keep current ad selections
      return;
    }
    
    // Clear ad selections when ad sets change to avoid inconsistent state
    setSelectedAdIds([]);
  }, [selectedAdSetIds]);

  // Use comments from dashboard data instead of fetching separately
  useEffect(() => {
    if (!selectedBrand || !brandData) return;
    
    // Use the comments from the main dashboard data
    // This ensures consistency with the overview metrics
    let comments = brandData.allComments || [];
    
    // If specific ads are selected, filter comments to those ads
    if (selectedAdIds.length > 0) {
      comments = comments.filter(c => selectedAdIds.includes(c.ad_id));
    }
    
    setFilteredComments(comments);
  }, [selectedBrand, brandData, selectedAdIds]);

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

  // Component for ads table with hierarchical filtering
  const AdsTableWithFiltering = ({
    selectedBrand,
    selectedAdSetIds,
    dateRange,
    funnel,
    angel,
    searchQuery,
    selectedAdIds,
    setSelectedAdIds,
    loading
  }: {
    selectedBrand: any;
    selectedAdSetIds: string[];
    dateRange: any;
    funnel: string;
    angel: string;
    searchQuery: string;
    selectedAdIds: string[];
    setSelectedAdIds: (ids: string[]) => void;
    loading: boolean;
  }) => {
    const [filteredAds, setFilteredAds] = useState<any[]>([]);
    const [adsLoading, setAdsLoading] = useState(false);

    useEffect(() => {
      const fetchFilteredAds = async () => {
        if (!selectedBrand) {
          setFilteredAds([]);
          return;
        }

        setAdsLoading(true);
        try {
          const ads = await getFilteredAds(
            selectedBrand.id,
            dateRange,
            selectedAdSetIds.length > 0 ? selectedAdSetIds : undefined,
            funnel,
            angel,
            searchQuery
          );
          
          // Apply additional client-side filtering for search query
          const finalAds = ads.filter(ad =>
            (!searchQuery ||
            (ad.ad_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (ad.ad_text?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (ad.ad_title?.toLowerCase().includes(searchQuery.toLowerCase())))
          );
          
          setFilteredAds(finalAds);
        } catch (err) {
          console.error('Error fetching filtered ads:', err);
          setFilteredAds([]);
        } finally {
          setAdsLoading(false);
        }
      };

      fetchFilteredAds();
    }, [selectedBrand, selectedAdSetIds, dateRange, funnel, angel, searchQuery]);

    if (loading || adsLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      );
    }

    if (filteredAds.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {selectedAdSetIds.length > 0
            ? 'No ads found for the selected ad sets with the current filters.'
            : 'No ads found for this brand with the selected filters.'
          }
        </div>
      );
    }

    return (
      <AdTable
        ads={filteredAds}
        selectedAdIds={selectedAdIds}
        onSelectedAdIdsChange={setSelectedAdIds}
      />
    );
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
                  className={`py-2 px-4 ${selectedTab === 'campaigns' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  onClick={() => setSelectedTab('campaigns')}
                >
                  Campaigns
                </button>
                <button
                  className={`py-2 px-4 ${selectedTab === 'adsets' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  onClick={() => setSelectedTab('adsets')}
                >
                  Ad Sets
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
              </div>
            </div>

            {selectedTab === 'overview' && (
              <Dashboard
                data={brandData}
                loading={loading}
                showExtendedAnalysis={true}
              />
            )}

            {selectedTab === 'campaigns' && (
              <>
                <h3 className="text-lg font-medium mb-4">All Campaigns</h3>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  ) : campaignsData && campaignsData.length > 0 ? (
                    <CampaignTable
                      campaigns={campaignsData}
                      selectedCampaignIds={selectedCampaignIds}
                      onSelectedCampaignIdsChange={setSelectedCampaignIds}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No campaigns found for this brand.
                    </div>
                  )}
                </div>
              </>
            )}

            {selectedTab === 'adsets' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    {selectedCampaignIds.length > 0
                      ? `Ad Sets from ${selectedCampaignIds.length} Selected Campaign${selectedCampaignIds.length > 1 ? 's' : ''}`
                      : 'All Ad Sets'
                    }
                  </h3>
                  {selectedCampaignIds.length > 0 && (
                    <button
                      onClick={() => setSelectedCampaignIds([])}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      Clear Campaign Filter
                    </button>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  ) : adSetsData && adSetsData.length > 0 ? (
                    <AdSetsTable
                      adSets={adSetsData}
                      selectedAdSetIds={selectedAdSetIds}
                      onSelectedAdSetIdsChange={setSelectedAdSetIds}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {selectedCampaignIds.length > 0
                        ? 'No ad sets found for the selected campaigns.'
                        : 'No ad sets found for this brand.'
                      }
                    </div>
                  )}
                </div>
              </>
            )}

            {selectedTab === 'ads' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    {selectedAdSetIds.length > 0
                      ? `Ads from ${selectedAdSetIds.length} Selected Ad Set${selectedAdSetIds.length > 1 ? 's' : ''}`
                      : 'All Ads'
                    }
                  </h3>
                  {selectedAdSetIds.length > 0 && (
                    <button
                      onClick={() => setSelectedAdSetIds([])}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      Clear Ad Set Filter
                    </button>
                  )}
                </div>
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

                  <>
                    <AdsTableWithFiltering
                      selectedBrand={selectedBrand}
                      selectedAdSetIds={selectedAdSetIds}
                      dateRange={dateRange}
                      funnel={funnel}
                      angel={angel}
                      searchQuery={searchQuery}
                      selectedAdIds={selectedAdIds}
                      setSelectedAdIds={setSelectedAdIds}
                      loading={loading}
                    />
                    
                    {/* Load More Button for Pagination */}
                    {totalPages > 1 && currentPage < totalPages && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={loadMoreAds}
                          disabled={isLoadingMore}
                          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoadingMore ? (
                            <>
                              <span className="animate-spin inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                              Loading...
                            </>
                          ) : (
                            `Load More (Page ${currentPage + 1} of ${totalPages})`
                          )}
                        </button>
                      </div>
                    )}
                  </>
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