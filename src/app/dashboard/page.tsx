'use client';

import { useSearchParams } from 'next/navigation';
import Dashboard from '../components/Dashboard';
import SidebarLayout from '../components/SidebarLayout';
import { Suspense, useState } from 'react';
import FilterBar from '../components/FilterBar';
import BrandSelector from '../components/BrandSelector';

export default function DashboardPage() {
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
  const searchParams = useSearchParams();
  const dashboardId = searchParams.get('id') || 'default';
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(
    searchParams.get('brand') || undefined
  );
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [sentiment, setSentiment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand === '' ? undefined : brand);
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
              ? `Viewing data for ${selectedBrand}` 
              : 'Overview of all brands and ads'}
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <button 
            onClick={() => {
              const url = new URL(window.location.href);
              navigator.clipboard.writeText(url.toString());
              alert('Dashboard link copied to clipboard!');
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            Share Dashboard
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="md:col-span-3">
          <FilterBar 
            onDateRangeChange={handleDateRangeChange}
            onSentimentChange={handleSentimentChange}
            onSearchChange={handleSearchChange}
          />
        </div>
        <div className="md:col-span-1">
          <BrandSelector 
            selectedBrand={selectedBrand} 
            onSelectBrand={handleBrandSelect}
            displayAs="dropdown"
          />
        </div>
      </div>
      
      <Dashboard 
        dashboardId={dashboardId} 
        brand={selectedBrand}
        dateRange={dateRange}
        sentiment={sentiment}
        searchQuery={searchQuery}
      />
    </div>
  );
} 