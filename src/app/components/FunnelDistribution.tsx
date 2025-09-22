'use client';

import { useMemo } from 'react';

interface Ad {
  funnel?: string;
  [key: string]: any;
}

interface FunnelDistributionProps {
  ads?: Ad[];
  distributionData?: { name: string; count: number }[];
}

export default function FunnelDistribution({ ads, distributionData }: FunnelDistributionProps) {
  const funnelData = useMemo(() => {
    // Always start with all funnel types initialized to 0
    const allFunnelTypes = {
      'TOF': 0,
      'MOF': 0,
      'BOF': 0,
      'Unprocessed': 0
    };

    // If pre-calculated distribution data is provided, merge it with defaults
    if (distributionData && distributionData.length > 0) {
      // Update counts from distribution data
      distributionData.forEach(item => {
        if (item.name in allFunnelTypes) {
          allFunnelTypes[item.name as keyof typeof allFunnelTypes] = item.count;
        } else if (item.name === 'Unknown') {
          // Handle legacy 'Unknown' as 'Unprocessed'
          allFunnelTypes['Unprocessed'] = item.count;
        }
      });
      
      const total = Object.values(allFunnelTypes).reduce((sum, count) => sum + count, 0);
      return Object.entries(allFunnelTypes).map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
      }));
    }
    
    // Otherwise, calculate from ads array (for backwards compatibility)
    if (ads && ads.length > 0) {
      // Count actual ads
      ads.forEach(ad => {
        const funnel = ad.funnel || 'Unprocessed';
        if (funnel in allFunnelTypes) {
          allFunnelTypes[funnel as keyof typeof allFunnelTypes]++;
        } else {
          // Handle any unexpected funnel values
          allFunnelTypes['Unprocessed']++;
        }
      });

      const total = ads.length;
      return Object.entries(allFunnelTypes).map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
      }));
    }
    
    // No data available - still return all funnel types with 0
    return Object.entries(allFunnelTypes).map(([name, count]) => ({
      name,
      count,
      percentage: '0.0'
    }));
  }, [ads, distributionData]);

  const getFunnelColor = (funnel: string) => {
    const colors = {
      'TOF': 'bg-green-500',
      'MOF': 'bg-yellow-500',
      'BOF': 'bg-red-500',
      'Unprocessed': 'bg-gray-500',
      'Unknown': 'bg-gray-500'
    };
    return colors[funnel as keyof typeof colors] || 'bg-gray-500';
  };

  const getFunnelTextColor = (funnel: string) => {
    const colors = {
      'TOF': 'text-green-700',
      'MOF': 'text-yellow-700',
      'BOF': 'text-red-700',
      'Unprocessed': 'text-gray-700',
      'Unknown': 'text-gray-700'
    };
    return colors[funnel as keyof typeof colors] || 'text-gray-700';
  };

  const totalAds = distributionData 
    ? distributionData.reduce((sum, item) => sum + item.count, 0)
    : (ads?.length || 0);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Funnel Distribution
      </h3>
      
      {/* Bar Chart */}
      <div className="space-y-4 mb-6">
        {funnelData.map((item) => (
          <div key={item.name} className="flex items-center">
            <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300">
              {item.name}
            </div>
            <div className="flex-1 ml-4">
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 mr-3">
                  <div
                    className={`h-4 rounded-full ${getFunnelColor(item.name)}`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 w-16">
                  {item.percentage}%
                </div>
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-12 text-right">
              {item.count}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {funnelData.map((item) => (
          <div key={`card-${item.name}`} className="text-center">
            <div className={`text-2xl font-bold ${getFunnelTextColor(item.name)}`}>
              {item.count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {item.name}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Total Ads: {totalAds}
      </div>
    </div>
  );
}