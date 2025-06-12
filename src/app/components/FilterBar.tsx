'use client';

import { useState, useEffect } from 'react';
import DateRangePicker from './DateRangePicker';

type DateRange = 'last7' | 'last30' | 'last90' | 'lifetime' | 'custom';
type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral';

type FilterBarProps = {
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
  onSentimentChange?: (sentiment: SentimentFilter) => void;
  onSearchChange?: (search: string) => void;
  showSentimentFilter?: boolean;
  showSearch?: boolean;
  showCalendar?: boolean;
};

export default function FilterBar({
  onDateRangeChange,
  onSentimentChange,
  onSearchChange,
  showSentimentFilter = true,
  showSearch = true,
  showCalendar = true,
}: FilterBarProps) {
  const [dateRange, setDateRange] = useState<DateRange>('last30');
  const [sentiment, setSentiment] = useState<SentimentFilter>('all');
  const [search, setSearch] = useState('');
  const [isCalendarView, setIsCalendarView] = useState(false);

  // Initialize the date range
  useEffect(() => {
    // Apply the default date range on component mount
    handleDateRangeChange('last30');
  }, []);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    
    // Calculate date range based on selection
    const end = new Date();
    let start = new Date();
    
    switch (range) {
      case 'last7':
        start.setDate(end.getDate() - 7);
        break;
      case 'last30':
        start.setDate(end.getDate() - 30);
        break;
      case 'last90':
        start.setDate(end.getDate() - 90);
        break;
      case 'lifetime':
        // Set start date to beginning of Unix epoch (Jan 1, 1970)
        start = new Date(0);
        break;
      case 'custom':
        setIsCalendarView(true);
        return;
    }
    
    if (onDateRangeChange) {
      onDateRangeChange({ start, end });
    }
  };
  
  const handleCalendarDateChange = (range: { startDate: Date; endDate: Date }) => {
    setDateRange('custom');
    
    if (onDateRangeChange) {
      onDateRangeChange({ 
        start: range.startDate, 
        end: range.endDate 
      });
    }
  };
  
  const handleSentimentChange = (newSentiment: SentimentFilter) => {
    setSentiment(newSentiment);
    if (onSentimentChange) {
      onSentimentChange(newSentiment);
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };
  
  const toggleCalendarView = () => {
    setIsCalendarView(!isCalendarView);
    if (isCalendarView && dateRange !== 'custom') {
      // If switching back from calendar view to preset buttons,
      // reapply the currently selected date range
      handleDateRangeChange(dateRange);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md mb-6">
      <div className="flex flex-col space-y-4">
        {/* Date Range Filter */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date Range
            </label>
            {showCalendar && (
              <button 
                onClick={toggleCalendarView}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                {isCalendarView ? 'Switch to Preset Buttons' : 'Switch to Calendar'}
              </button>
            )}
          </div>
          
          {isCalendarView && showCalendar ? (
            <DateRangePicker onChange={handleCalendarDateChange} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleDateRangeChange('last7')}
                className={`px-3 py-2 text-sm rounded-md ${
                  dateRange === 'last7'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => handleDateRangeChange('last30')}
                className={`px-3 py-2 text-sm rounded-md ${
                  dateRange === 'last30'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => handleDateRangeChange('last90')}
                className={`px-3 py-2 text-sm rounded-md ${
                  dateRange === 'last90'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Last 90 Days
              </button>
              <button
                onClick={() => handleDateRangeChange('lifetime')}
                className={`px-3 py-2 text-sm rounded-md ${
                  dateRange === 'lifetime'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Lifetime
              </button>
              <button
                onClick={() => handleDateRangeChange('custom')}
                className={`px-3 py-2 text-sm rounded-md ${
                  dateRange === 'custom'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Custom
              </button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sentiment Filter */}
          {showSentimentFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sentiment
              </label>
              <select
                value={sentiment}
                onChange={(e) => handleSentimentChange(e.target.value as SentimentFilter)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          )}
          
          {/* Search */}
          {showSearch && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search ads, comments..."
                  className="w-full p-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 text-gray-400" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 