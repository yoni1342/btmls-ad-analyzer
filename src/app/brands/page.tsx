'use client';

import { useRouter } from 'next/navigation';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

import { useSearchParams } from 'next/navigation';
import SidebarLayout from '../components/SidebarLayout';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getBrands, getBrandOverviewData, getBrandTablesData } from '@/app/actions';
import { useAppStore } from '@/lib/store';
import BrandSelector from '../components/BrandSelector';
import FilterBar from '../components/FilterBar';
import DateRangePicker from '../components/DateRangePicker';
import Dashboard from '../components/Dashboard';
import AdTable from '../components/report/AdTable';
import CampaignTable from '../components/report/CampaignTable';
import AdSetsTable from '../components/report/AdSetsTable';
import CommentTable from '../components/report/CommentTable';
import Pagination from '../components/Pagination';

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
    campaignStatus,
    campaignObjective,
    adsetStatus,
    adsetOptimization,
    searchQuery,
    selectedTab,
    brandData,
    overviewData,
    tablesData,
    loading,
    untrackedAdsCount,
    untrackedCommentsCount,
    untrackedAdIds,
    untrackedCommentIds,
    isAdAnalyzing,
    isCommentAnalyzing,
    currentPage,
    totalPages,
    totalRecords,
    pageSize,
    hasNext,
    hasPrevious,
    setBrands,
    setSelectedBrand,
    setDateRange,
    setSentiment,
    setFunnel,
    setAngel,
    setCampaignStatus,
    setCampaignObjective,
    setAdsetStatus,
    setAdsetOptimization,
    setSearchQuery,
    setSelectedTab,
    setBrandData,
    setOverviewData,
    setTablesData,
    setLoading,
    setUntrackedInfo,
    setAnalyzingStatus,
    setPagination,
    setCurrentPage,
    setPageSize,
  } = useAppStore();
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedAdSetIds, setSelectedAdSetIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportAdsRange, setExportAdsRange] = useState<{ startDate: Date; endDate: Date }>({ startDate: dateRange.start, endDate: dateRange.end });
  const [exportCommentsRange, setExportCommentsRange] = useState<{ startDate: Date; endDate: Date }>({ startDate: dateRange.start, endDate: dateRange.end });
  
  // Comment table specific filters  
  const [commentSentimentFilter, setCommentSentimentFilter] = useState('');
  const [commentClusterFilter, setCommentClusterFilter] = useState('');
  const [commentAngleTypeFilter, setCommentAngleTypeFilter] = useState('');
  
  // Store all angle types from the original unfiltered data to persist dropdown options
  const [allAngleTypes, setAllAngleTypes] = useState<string[]>([]);

  // Fetch all angle types for the brand (unfiltered) to populate dropdown
  // Only fetch when we're on a data table tab that needs this data
  useEffect(() => {
    const fetchAllAngleTypes = async () => {
      if (!selectedBrand) return;
      if (selectedTab === 'overview') return; // Skip for overview tab
      
      try {
        // Fetch unfiltered data to get all possible angle types
        const allData = await getBrandTablesData(
          selectedBrand.id,
          dateRange,
          {
            sentiment,
            funnel: 'all', // No funnel filter
            angel: 'all', // No angel filter
            campaignStatus: 'all', // No campaign status filter
            campaignObjective: 'all', // No campaign objective filter
            adsetStatus: 'all', // No adset status filter
            adsetOptimization: 'all', // No adset optimization filter
          },
          'ads', // Get ads to extract angle types
          1,
          1000 // Get a large sample to find all angle types
        );
        
        if (allData.ads && allData.ads.length > 0) {
          const uniqueAngleTypes = Array.from(new Set(
            allData.ads.map((ad: any) => ad.angle_type || 'Unknown')
          )).sort() as string[];
          setAllAngleTypes(uniqueAngleTypes);
        }
      } catch (err) {
        console.error('Error fetching all angle types:', err);
      }
    };
    
    fetchAllAngleTypes();
  }, [selectedBrand, dateRange, sentiment, selectedTab]); // Include selectedTab in dependencies

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
        let result;
        if (selectedTab === 'overview') {
          // Use overview function for overview tab (fast, aggregated data)
          result = await getBrandOverviewData(
            selectedBrand.id,
            dateRange,
            sentiment,
            funnel,
            angel,
            campaignStatus,
            campaignObjective,
            adsetStatus,
            adsetOptimization,
            searchQuery
          );
          setOverviewData(result);
          setBrandData(result); // Keep for backward compatibility
        } else {
          // Use paginated function for data tables with selection-based filtering
          result = await getBrandTablesData(
            selectedBrand.id,
            dateRange,
            {
              sentiment,
              funnel,
              angel,
              campaignStatus,
              campaignObjective,
              adsetStatus,
              adsetOptimization
            },
            selectedTab as 'campaigns' | 'adsets' | 'ads' | 'comments',
            currentPage,
            pageSize,
            // NEW: Selection-based filtering for interdependent behavior
            {
              selectedCampaignIds: selectedCampaignIds.length > 0 ? selectedCampaignIds : undefined,
              selectedAdSetIds: selectedAdSetIds.length > 0 ? selectedAdSetIds : undefined,
              selectedAdIds: selectedAdIds.length > 0 ? selectedAdIds : undefined,
              commentSentiment: commentSentimentFilter || undefined,
              commentCluster: commentClusterFilter || undefined,
              commentAngleType: commentAngleTypeFilter || undefined
            }
          );
          setTablesData(result);
          setBrandData(result); // Keep for backward compatibility
          
          // Update pagination state
          if (result.pagination) {
            setPagination({
              currentPage: result.pagination.page,
              totalPages: result.pagination.total_pages,
              totalRecords: result.pagination.total_records,
              hasNext: result.pagination.has_next,
              hasPrevious: result.pagination.has_previous,
            });
          }
        }
        
        // Handle untracked info and analyzing status - use the local result variable
        // Only update untracked info if we have valid data (from overview tab)
        // Otherwise persist existing counts to show across all tabs
        if (result?.untracked_info && (
          result.untracked_info.untracked_ads_count !== undefined ||
          result.untracked_info.untracked_comments_count !== undefined
        )) {
          setUntrackedInfo({
            adsCount: result.untracked_info.untracked_ads_count || 0,
            commentsCount: result.untracked_info.untracked_comments_count || 0,
            adIds: result.untracked_info.untracked_ad_ids || [],
            commentIds: result.untracked_info.untracked_comment_ids || [],
          });
        }
        // Note: If result.untracked_info is empty (from paginated function),
        // we don't call setUntrackedInfo, preserving the existing counts
        
        if (result?.brand_status) {
          setAnalyzingStatus({
            ad: result.brand_status.is_ad_analyzing || false,
            comment: result.brand_status.is_comment_analyzing || false,
          });
        }
      } catch (err) {
        console.error('Error fetching brand data:', err);
        toast.error('Failed to load brand data');
      } finally {
        setLoading(false);
      }
    };

    fetchBrandData();
  }, [selectedBrand, dateRange, sentiment, funnel, angel, campaignStatus, campaignObjective, adsetStatus, adsetOptimization, selectedTab, currentPage, pageSize, searchQuery, selectedCampaignIds, selectedAdSetIds, selectedAdIds, commentSentimentFilter, commentClusterFilter, commentAngleTypeFilter, setLoading, setBrandData, setOverviewData, setTablesData, setPagination, setUntrackedInfo, setAnalyzingStatus]);
  

  // NOTE: Client-side filtering removed - now handled by database function with selection-based filtering
  // All table data is now pre-filtered by the database based on interdependent selections

  // Selection management for interdependent filtering
  // NOTE: We no longer clear selections automatically since bidirectional filtering allows
  // selections across all tables to coexist and influence each other

  // NOTE: Comments filtering now handled by database function based on all interdependent selections

  const handleSelectBrand = (brand: { id: string; brand_name: string }) => {
    setSelectedBrand(brand.id === '' ? undefined : brand);
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
  };

  const goToNextPage = () => {
    if (hasNext) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (hasPrevious) {
      setCurrentPage(currentPage - 1);
    }
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
        // New campaign and adset filters
        campaignStatus: campaignStatus && campaignStatus !== 'all' ? campaignStatus : undefined,
        campaignObjective: campaignObjective && campaignObjective !== 'all' ? campaignObjective : undefined,
        adsetStatus: adsetStatus && adsetStatus !== 'all' ? adsetStatus : undefined,
        adsetOptimization: adsetOptimization && adsetOptimization !== 'all' ? adsetOptimization : undefined,
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

  // NOTE: AdsTableWithFiltering component removed - filtering now handled by database function

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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    {(selectedAdSetIds.length > 0 || selectedAdIds.length > 0 || commentSentimentFilter || commentClusterFilter || commentAngleTypeFilter)
                      ? 'Campaigns (Filtered by Selections)'
                      : 'All Campaigns'
                    }
                  </h3>
                  {(selectedAdSetIds.length > 0 || selectedAdIds.length > 0 || commentSentimentFilter || commentClusterFilter || commentAngleTypeFilter) && (
                    <button
                      onClick={() => {
                        setSelectedAdSetIds([]);
                        setSelectedAdIds([]);
                        setCommentSentimentFilter('');
                        setCommentClusterFilter('');
                        setCommentAngleTypeFilter('');
                      }}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
                  {/* Campaign Filter Controls */}
                  <div className="mb-4 flex gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filter by Status
                      </label>
                      <select
                        value={campaignStatus}
                        onChange={(e) => setCampaignStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="all">All Statuses</option>
                        {brandData?.campaigns && Array.from(new Set(brandData.campaigns.map((campaign: any) => campaign.status).filter(Boolean))).sort().map((status: any) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filter by Objective
                      </label>
                      <select
                        value={campaignObjective}
                        onChange={(e) => setCampaignObjective(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="all">All Objectives</option>
                        {brandData?.campaigns && Array.from(new Set(brandData.campaigns.map((campaign: any) => campaign.objective).filter(Boolean))).sort().map((objective: any) => (
                          <option key={objective} value={objective}>{objective}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  ) : (
                    <>
                      {tablesData?.campaigns && tablesData.campaigns.length > 0 ? (
                        <CampaignTable
                          campaigns={tablesData.campaigns}
                          selectedCampaignIds={selectedCampaignIds}
                          onSelectedCampaignIdsChange={setSelectedCampaignIds}
                        />
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No campaigns found for this brand.
                        </div>
                      )}
                      
                      {/* Pagination for campaigns */}
                      {tablesData?.pagination && selectedTab === 'campaigns' && (
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalRecords={totalRecords}
                          pageSize={pageSize}
                          hasNext={hasNext}
                          hasPrevious={hasPrevious}
                          onPageChange={handlePageChange}
                          onPageSizeChange={handlePageSizeChange}
                        />
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {selectedTab === 'adsets' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    {(selectedCampaignIds.length > 0 || selectedAdIds.length > 0 || commentSentimentFilter || commentClusterFilter || commentAngleTypeFilter)
                      ? 'Ad Sets (Filtered by Selections)'
                      : 'All Ad Sets'
                    }
                  </h3>
                  {(selectedCampaignIds.length > 0 || selectedAdIds.length > 0 || commentSentimentFilter || commentClusterFilter || commentAngleTypeFilter) && (
                    <button
                      onClick={() => {
                        setSelectedCampaignIds([]);
                        setSelectedAdIds([]);
                        setCommentSentimentFilter('');
                        setCommentClusterFilter('');
                        setCommentAngleTypeFilter('');
                      }}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
                  {/* AdSet Filter Controls */}
                  <div className="mb-4 flex gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filter by Status
                      </label>
                      <select
                        value={adsetStatus}
                        onChange={(e) => setAdsetStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="all">All Statuses</option>
                        {brandData?.ad_sets && Array.from(new Set(brandData.ad_sets.map((adset: any) => adset.status).filter(Boolean))).sort().map((status: any) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Filter by Optimization Goal
                      </label>
                      <select
                        value={adsetOptimization}
                        onChange={(e) => setAdsetOptimization(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="all">All Optimization Goals</option>
                        {brandData?.ad_sets && Array.from(new Set(brandData.ad_sets.map((adset: any) => adset.optimization_goal).filter(Boolean))).sort().map((goal: any) => (
                          <option key={goal} value={goal}>{goal}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  ) : (
                    <>
                      {tablesData?.ad_sets && tablesData.ad_sets.length > 0 ? (
                        <AdSetsTable
                          adSets={tablesData.ad_sets}
                          selectedAdSetIds={selectedAdSetIds}
                          onSelectedAdSetIdsChange={setSelectedAdSetIds}
                        />
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No ad sets found for this brand.
                        </div>
                      )}
                      
                      {/* Pagination for ad sets */}
                      {tablesData?.pagination && selectedTab === 'adsets' && (
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalRecords={totalRecords}
                          pageSize={pageSize}
                          hasNext={hasNext}
                          hasPrevious={hasPrevious}
                          onPageChange={handlePageChange}
                          onPageSizeChange={handlePageSizeChange}
                        />
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {selectedTab === 'ads' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    {(selectedCampaignIds.length > 0 || selectedAdSetIds.length > 0 || commentSentimentFilter || commentClusterFilter || commentAngleTypeFilter)
                      ? 'Ads (Filtered by Selections)'
                      : 'All Ads'
                    }
                  </h3>
                  {(selectedCampaignIds.length > 0 || selectedAdSetIds.length > 0 || commentSentimentFilter || commentClusterFilter || commentAngleTypeFilter) && (
                    <button
                      onClick={() => {
                        setSelectedCampaignIds([]);
                        setSelectedAdSetIds([]);
                        setCommentSentimentFilter('');
                        setCommentClusterFilter('');
                        setCommentAngleTypeFilter('');
                      }}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      Clear All Filters
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
                        {allAngleTypes.length > 0 
                          ? allAngleTypes.map(angelType => (
                              <option key={angelType} value={angelType}>{angelType}</option>
                            ))
                          : brandData?.ads && Array.from(new Set(brandData.ads.map(ad => ad.angle_type || 'Unknown'))).map(angelType => (
                              <option key={angelType} value={angelType}>{angelType}</option>
                            ))
                        }
                      </select>
                    </div>
                  </div>

                  <>
                    {loading ? (
                      <div className="flex justify-center items-center h-64">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                      </div>
                    ) : (
                      <>
                        {tablesData?.ads && tablesData.ads.length > 0 ? (
                          <AdTable
                            ads={tablesData.ads}
                            selectedAdIds={selectedAdIds}
                            onSelectedAdIdsChange={setSelectedAdIds}
                          />
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No ads found for this brand.
                          </div>
                        )}
                        
                        {/* Pagination for ads */}
                        {tablesData?.pagination && selectedTab === 'ads' && (
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalRecords={totalRecords}
                            pageSize={pageSize}
                            hasNext={hasNext}
                            hasPrevious={hasPrevious}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                          />
                        )}
                      </>
                    )}
                  </>
                </div>
              </>
            )}

            {selectedTab === 'comments' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    {(selectedCampaignIds.length > 0 || selectedAdSetIds.length > 0 || selectedAdIds.length > 0)
                      ? 'Comments (Filtered by Selections)'
                      : 'All Comments'
                    }
                  </h3>
                  {(selectedCampaignIds.length > 0 || selectedAdSetIds.length > 0 || selectedAdIds.length > 0) && (
                    <button
                      onClick={() => {
                        setSelectedCampaignIds([]);
                        setSelectedAdSetIds([]);
                        setSelectedAdIds([]);
                      }}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      Clear Selection Filters
                    </button>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  ) : (
                    <>
                      {tablesData?.comments && tablesData.comments.length > 0 ? (
                        <CommentTable
                          comments={tablesData.comments}
                          ads={tablesData?.ads || []}
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
                      
                      {/* Pagination for comments */}
                      {tablesData?.pagination && selectedTab === 'comments' && (
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalRecords={totalRecords}
                          pageSize={pageSize}
                          hasNext={hasNext}
                          hasPrevious={hasPrevious}
                          onPageChange={handlePageChange}
                          onPageSizeChange={handlePageSizeChange}
                        />
                      )}
                    </>
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
                    {(campaignStatus && campaignStatus !== 'all') && (
                      <div>
                        <strong>Campaign Status Filter:</strong> {campaignStatus}
                      </div>
                    )}
                    {(campaignObjective && campaignObjective !== 'all') && (
                      <div>
                        <strong>Campaign Objective Filter:</strong> {campaignObjective}
                      </div>
                    )}
                    {(adsetStatus && adsetStatus !== 'all') && (
                      <div>
                        <strong>AdSet Status Filter:</strong> {adsetStatus}
                      </div>
                    )}
                    {(adsetOptimization && adsetOptimization !== 'all') && (
                      <div>
                        <strong>AdSet Optimization Filter:</strong> {adsetOptimization}
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