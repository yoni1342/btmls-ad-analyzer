'use client';

import { useSearchParams } from 'next/navigation';
import SidebarLayout from '../components/SidebarLayout';
import { Suspense, useState, useEffect } from 'react';
import BrandSelector from '../components/BrandSelector';
import FilterBar from '../components/FilterBar';
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
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(initialBrand || undefined);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [sentiment, setSentiment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [brandData, setBrandData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const handleSelectBrand = (brand: string) => {
    setSelectedBrand(brand === '' ? undefined : brand);
    // Reset to overview tab when changing brands
    setSelectedTab('overview');
    // Clear previous brand data
    setBrandData(null);
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
  
  // Fetch brand data for tables when tab changes or when filters change
  useEffect(() => {
    const fetchBrandData = async () => {
      if (!selectedBrand || selectedTab === 'overview') return;
      
      try {
        setLoading(true);
        let url = `/api/dashboard?id=brand&brand=${encodeURIComponent(selectedBrand)}`;
        
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
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">
        {selectedBrand ? `${selectedBrand} Analytics` : 'Brand Analytics'}
      </h1>
      
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
          <FilterBar 
            onDateRangeChange={handleDateRangeChange}
            onSentimentChange={handleSentimentChange}
            onSearchChange={handleSearchChange}
            showSearch={true}
          />
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{selectedBrand} Overview</h2>
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
                brand={selectedBrand}
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
                    <AdTable ads={brandData.ads} />
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
                    <CommentTable comments={brandData.allComments} ads={brandData.ads || []} />
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