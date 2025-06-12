'use client';

import { useState, useEffect } from 'react';

type DateRange = {
  startDate: Date;
  endDate: Date;
};

type DateRangePickerProps = {
  onChange: (range: DateRange) => void;
  initialRange?: DateRange;
  className?: string;
};

export default function DateRangePicker({
  onChange,
  initialRange,
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(
    initialRange || {
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date(),
    }
  );
  const [isApplying, setIsApplying] = useState(false);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = new Date(e.target.value);
    const newRange = { ...dateRange, startDate: newStartDate };
    setDateRange(newRange);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = new Date(e.target.value);
    const newRange = { ...dateRange, endDate: newEndDate };
    setDateRange(newRange);
  };

  const applyPreset = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const newRange = { startDate, endDate };
    setDateRange(newRange);
    
    // Visual feedback
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      onChange(newRange);
      setIsOpen(false);
    }, 300);
  };

  const handleApply = () => {
    // Visual feedback
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      onChange(dateRange);
      setIsOpen(false);
    }, 300);
  };

  const formatInputDate = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format for input
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.date-range-picker-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
      >
        <div className="flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
          <span className="font-medium">
            {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
          </span>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="date-range-picker-container absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formatInputDate(dateRange.startDate)}
                  onChange={handleStartDateChange}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formatInputDate(dateRange.endDate)}
                  onChange={handleEndDateChange}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="p-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Presets</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => applyPreset(7)}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => applyPreset(30)}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => applyPreset(90)}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"
              >
                Last 90 Days
              </button>
              <button
                onClick={() => applyPreset(365)}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"
              >
                Last Year
              </button>
            </div>
          </div>
          
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleApply}
              disabled={isApplying}
              className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${isApplying ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isApplying ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 