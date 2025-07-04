'use client';

import { useSearchParams } from 'next/navigation';
import SidebarLayout from '../components/SidebarLayout';
import { Suspense, useState, useEffect } from 'react';
import { fetchBrands, fetchAdsByBrand, fetchCommentsByBrand } from '@/lib/supabase-service';
import BrandSelector from '../components/BrandSelector';
import FilterBar from '../components/FilterBar';
import DateRangePicker from '../components/DateRangePicker';
import Dashboard from '../components/Dashboard';
import AdTable from '../components/report/AdTable';
import CommentTable from '../components/report/CommentTable';
import MediaGrid from '../components/report/MediaGrid';

export default function BrandsPage() {
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
  const [selectedBrand, setSelectedBrand] = useState<{ id: string; brand_name: string } | undefined>();
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [sentiment, setSentiment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);
  const [brandData, setBrandData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportRange, setExportRange] = useState<{ start: Date; end: Date }>(dateRange);

  // Count unanalyzed ads/comments
  const [untrackedAdsCount, setUntrackedAdsCount] = useState<number>(0);
  const [untrackedCommentsCount, setUntrackedCommentsCount] = useState<number>(0);

  useEffect(() => {
    if (!selectedBrand) return;
    (async () => {
      try {
        const ads = await fetchAdsByBrand(selectedBrand.id);
        const comments = await fetchCommentsByBrand(selectedBrand.id);
        const adsCount = ads.filter(ad => !ad.angel && (!ad.angle_type || ad.angle_type === 'Unknown')).length;
        const commentsCount = comments.filter(c => !c.sentiment).length;
        setUntrackedAdsCount(adsCount);
        setUntrackedCommentsCount(commentsCount);
      } catch (err) {
        console.error('Error counting untracked items:', err);
      }
    })();
  }, [selectedBrand]);
  
  useEffect(() => {
  	if (initialBrand) {
  		const fetchAndSetInitialBrand = async () => {
  			const brands = await fetchBrands();
  			if (brands) {
  				const brand = brands.find((b: any) => b.id.toString() === initialBrand);
  				if (brand) {
  					setSelectedBrand(brand);
  				}
  			}
  		};
  		fetchAndSetInitialBrand();
  	}
  }, [initialBrand]);
 
  const handleSelectBrand = (brand: { id: string; brand_name: string }) => {
  	setSelectedBrand(brand.id === '' ? undefined : brand);
  	// Reset to overview tab when changing brands
  	setSelectedTab('overview');
  	// Clear previous brand data and ad selection
  	setBrandData(null);
  	setSelectedAdIds([]);
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
  
  // Fetch brand data for tables when tab changes or when filters change
  useEffect(() => {
    const fetchBrandData = async () => {
      if (!selectedBrand || selectedTab === 'overview') return;
    
      try {
      	setLoading(true);
      	let url = `/api/dashboard?id=brand&brand_id=${encodeURIComponent(selectedBrand.id)}`;
        
        // Add date range filters if provided
        if (dateRange) {
          url += `&startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`;
        }
        
        // Add sentiment filter if not 'all'
        if (sentiment && sentiment !== 'all') {
          url += `&sentiment=${encodeURIComponent(sentiment)}`;
        }
        
        // Add search query if provided
        if (searchQuery) {
          url += `&search=${encodeURIComponent(searchQuery)}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch brand data');
        }
        
        const result = await response.json();
        setBrandData(result.data);
      } catch (err) {
        console.error('Error fetching brand data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBrandData();
  }, [selectedBrand, selectedTab, dateRange, sentiment, searchQuery]);
  
  return (
    <div className="container mx-auto py-8 px-4 relative">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          {selectedBrand ? `${selectedBrand.brand_name} Analytics` : 'Brand Analytics'}
        </h1>
        {selectedBrand && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Export
            </button>
            <button
              onClick={() => setSelectedTab('ads')}
              className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
            >
              {untrackedAdsCount} Untracked Ads
            </button>
            <button
              onClick={() => setSelectedTab('comments')}
              className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
            >
              {untrackedCommentsCount} Untracked Comments
            </button>
            {showExportMenu && (
              <div className="fixed inset-0 flex items-center justify-center z-50" onClick={() => setShowExportMenu(false)}>
                  <div
                    className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded p-8 shadow-lg w-full max-w-3xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DateRangePicker
                      initialRange={{ startDate: exportRange.start, endDate: exportRange.end }}
                      onChange={(range) => setExportRange({ start: range.startDate, end: range.endDate })}
                    />
                    <button
                      onClick={() => { doExport(exportRange); setShowExportMenu(false); }}
                      className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      Download
                    </button>
                  </div>
                </div>
            )}
          </div>
        )}
      </div>
      
      {!selectedBrand ? (
        <>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Select a brand to view detailed analytics
          </p>
          <BrandSelector 
            selectedBrand={selectedBrand}
            onSelectBrand={handleSelectBrand}
            displayAs="cards"
          />
        </>
      ) : (
        <>
          <div className="mb-6">
            <FilterBar
              onDateRangeChange={handleDateRangeChange}
              onSentimentChange={handleSentimentChange}
              onSearchChange={handleSearchChange}
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
              	← Back to All Brands
              </button>
            </div>
            
            {/* Tabs */}
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
                dashboardId="brand"
                brand_id={selectedBrand.id}
                dateRange={dateRange}
                sentiment={sentiment}
                searchQuery={searchQuery}
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
                      ads={brandData.ads.map((ad: any) => ({ ...ad, comments: brandData.allComments.filter((comment: any) => comment.ad_id === ad.ad_id) }))}
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
                      clusters={brandData.clusters || []}
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
                    <MediaGrid ads={brandData.ads.map((ad: any) => ({ ...ad, comments: brandData.allComments.filter((comment: any) => comment.ad_id === ad.ad_id) }))} />
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