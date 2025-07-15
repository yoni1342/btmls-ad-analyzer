'use client';

import AdTable from './report/AdTable';
import CommentTable from './report/CommentTable';
import MediaGrid from './report/MediaGrid';
import MetricCard from './MetricCard';
import SentimentDistribution from './SentimentDistribution';
import CommentTrends from './CommentTrends';
import FunnelDistribution from './FunnelDistribution';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type DashboardProps = {
  data: DashboardData | null;
  loading: boolean;
  error?: string | null;
  showExtendedAnalysis?: boolean;
};

type Metric = {
  id: string;
  label: string;
  value: number;
  change: number;
};

type DashboardData = {
  title: string;
  metrics: Metric[];
  timeSeriesData: {
    labels: string[];
    datasets: {
      name: string;
      data: number[];
    }[];
  };
  tableData: {
    headers: string[];
    rows: {
      id: number;
      values: (string | number)[];
    }[];
  };
  pieChartData: {
    labels: string[];
    values: number[];
  };
  topAds: any[]; // Changed from Ad type since we removed TopPerformingAds
   ads: any[];
   allComments: any[];
 extendedAnalysis?: {
    angleTypeData?: any;
    clusterData?: any;
    adCommentData?: any;
  };
};

export default function Dashboard({ 
  data,
  loading,
  error,
  showExtendedAnalysis = false
}: DashboardProps) {

  if (loading) {
    return (
      <div className="dashboard animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md mb-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 p-6 rounded-xl text-red-600 dark:text-red-400">
          <div className="flex items-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium">Error Loading Dashboard</h3>
          </div>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.metrics || !data.timeSeriesData) {
    return (
      <div className="dashboard">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 p-6 rounded-xl text-blue-600 dark:text-blue-400">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No dashboard data available. Try selecting a different filter or brand.</p>
          </div>
        </div>
      </div>
    );
  }

  // Extract sentiment metrics
  const positiveMetric = data.metrics.find(m => m.id.includes('positive'))?.value || 0;
  const negativeMetric = data.metrics.find(m => m.id.includes('negative'))?.value || 0;
  const neutralMetric = data.metrics.find(m => m.id.includes('neutral'))?.value || 0;

  // Prepare comment trends data
  const commentDatasets = data.timeSeriesData.datasets;
  const commentTrendsData = {
    labels: data.timeSeriesData.labels,
    datasets: commentDatasets.map(dataset => ({
      name: dataset.name,
      data: dataset.data,
      color: dataset.name.toLowerCase().includes('positive')
        ? 'rgb(16, 185, 129)' // green
        : dataset.name.toLowerCase().includes('negative')
          ? 'rgb(239, 68, 68)' // red
          : 'rgb(59, 130, 246)' // blue
    }))
  };

  return (
    <div className="dashboard">
      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {data.metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            title={metric.label}
            value={metric.value}
            change={metric.change}
            format={metric.id.includes('sentiment') || metric.id.includes('percentage') ? 'percentage' : 'number'}
            icon={
              metric.id.includes('ads') ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 7H7v6h6V7z" />
                  <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                </svg>
              ) : metric.id.includes('comment') ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              ) : metric.id.includes('positive') ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" transform="rotate(180 10 10)" />
                </svg>
              )
            }
          />
        ))}
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Comment Trends Chart */}
        <CommentTrends
          data={data.timeSeriesData}
          chartType="line"
          loading={loading}
          showLegend={showExtendedAnalysis}
          subtitle="Comment volume and sentiment over time"
        />
        
        {/* Sentiment Distribution Chart */}
        { /* Pass actual total comments count to doughnut center */ }
        {(() => {
          const totalCommentsMetric = data.metrics.find(m => m.id === 'total_comments')?.value || 0;
          return (
            <SentimentDistribution
              positive={positiveMetric}
              negative={negativeMetric}
              neutral={neutralMetric}
              totalCount={totalCommentsMetric}
              title="Sentiment Distribution"
              subtitle="Overall sentiment breakdown of all comments"
            />
          );
        })()}
      </div>

      {/* Funnel Distribution Chart - Full Width */}
      {data.ads && data.ads.length > 0 && (
        <div className="mb-6">
          <FunnelDistribution ads={data.ads} />
        </div>
      )}
      
      {/* Extended Analysis Section - only shown when showExtendedAnalysis is true */}
      {showExtendedAnalysis && (
        <div>
          <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Advanced Analytics</h3>
          
          {data.extendedAnalysis && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Angle Type Distribution */}
                {data.extendedAnalysis.angleTypeData && (
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
                    <h4 className="text-base font-medium mb-4">Angle Type Distribution</h4>
                    <div className="h-64">
                      <Pie
                        data={data.extendedAnalysis.angleTypeData}
                        options={{ responsive: true, maintainAspectRatio: false }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Comment Cluster Analysis */}
                {data.extendedAnalysis.clusterData && (
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
                    <h4 className="text-base font-medium mb-4">Top Comment Clusters</h4>
                    <div className="h-64">
                      <Bar
                        data={data.extendedAnalysis.clusterData}
                        options={{
                          indexAxis: 'y',
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Ads with Most Comments */}
              {data.extendedAnalysis.adCommentData && (
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
                  <h4 className="text-base font-medium mb-4">Ads with Most Comments</h4>
                  <div className="h-64">
                    <Bar
                      data={data.extendedAnalysis.adCommentData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
         
         </div>
       </div>
       )}
      

    </div>
  );
} 