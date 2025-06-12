'use client';

import { useState, useEffect } from 'react';
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
import { Pie, Bar } from 'react-chartjs-2';
import Header from '@/app/components/report/Header';
import AdTable from '@/app/components/report/AdTable';
import CommentTable from '@/app/components/report/CommentTable';
import MediaGrid from '@/app/components/report/MediaGrid';
import React from 'react';
import { fetchCommentClusters, fetchClusterCommentMappings } from '@/lib/supabase-service';

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

interface Ad {
  ad_id: string;
  ad_name?: string;
  ad_title?: string;
  ad_text?: string;
  angle_type?: string;
  target_audience?: string;
  image_url?: string;
  video_url?: string;
  post_link?: string;
  comments?: Comment[];
}

interface Comment {
  comment_id: string;
  message: string;
  theme?: string;
  sentiment?: string;
  "Cluster name"?: string;
  "Cluster Description"?: string;
}

interface ReportData {
  brand: string;
  ads: Ad[];
}

type ReportPageProps = {
  data: ReportData;
};

export default function ReportPage({ data }: ReportPageProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [clusterComments, setClusterComments] = useState<any[]>([]);
  
  // Process the data
  const ads = data.ads || [];
  
  // Collect all comments across ads
  const allComments = ads.flatMap(ad => 
    (ad.comments || []).map(comment => ({
      ...comment,
      ad_id: ad.ad_id,
      ad_title: ad.ad_title,
      angle_type: ad.angle_type
    }))
  );
  
  // Filter comments by selected ads if any are selected
  const filteredComments = selectedAdIds.length > 0
    ? allComments.filter(comment => selectedAdIds.includes(comment.ad_id))
    : allComments;
  
  // Extract angle types for pie chart
  const angleTypes = Array.from(new Set(ads.map(ad => ad.angle_type || 'Unknown')));
  const angleTypeData = {
    labels: angleTypes,
    datasets: [
      {
        data: angleTypes.map(type => 
          ads.filter(ad => (ad.angle_type || 'Unknown') === type).length
        ),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Extract sentiment data for pie chart
  const sentiments = Array.from(new Set(allComments.map(comment => comment.sentiment || 'Unknown')));
  const sentimentData = {
    labels: sentiments,
    datasets: [
      {
        data: sentiments.map(sentiment => 
          allComments.filter(comment => (comment.sentiment || 'Unknown') === sentiment).length
        ),
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',  // Positive - Green
          'rgba(255, 99, 132, 0.7)',  // Negative - Red
          'rgba(255, 206, 86, 0.7)',  // Neutral - Yellow
          'rgba(153, 102, 255, 0.7)',  // Other
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Extract themes for bar chart
  const clustersData = Array.from(
    new Set(allComments.map(comment => comment["Cluster name"] || comment.theme || 'Unknown'))
  )
  .filter(cluster => cluster !== 'Unknown')  // Filter out Unknown values
  .sort((a, b) => {
    // Count occurrences of each cluster
    const countA = allComments.filter(comment => 
      (comment["Cluster name"] || comment.theme) === a
    ).length;
    
    const countB = allComments.filter(comment => 
      (comment["Cluster name"] || comment.theme) === b
    ).length;
    
    return countB - countA; // Sort by count descending
  })
  .slice(0, 5); // Take top 5
  
  const clusterData = {
    labels: clustersData,
    datasets: [
      {
        label: 'Comment Count',
        data: clustersData.map(cluster => 
          allComments.filter(comment => (comment["Cluster name"] || comment.theme || 'Unknown') === cluster).length
        ),
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  // Calculate ads with most comments
  const adCommentCounts = ads.map(ad => ({
    ad_id: ad.ad_id,
    ad_title: ad.ad_title || ad.ad_id,
    count: (ad.comments || []).length
  }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 5); // Top 5 ads by comment count
  
  const adCommentData = {
    labels: adCommentCounts.map(item => item.ad_title),
    datasets: [
      {
        label: 'Comment Count',
        data: adCommentCounts.map(item => item.count),
        backgroundColor: 'rgba(153, 102, 255, 0.7)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  // CSV export helpers
  function convertToCSV(objArray: any[], columns: string[]): string {
    const header = columns.join(',');
    const rows = objArray.map(row =>
      columns.map(field => {
        let value = row[field];
        if (typeof value === 'string') {
          // Escape quotes and commas
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        return value ?? '';
      }).join(',')
    );
    return [header, ...rows].join('\r\n');
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Export handlers
  const handleExportAds = () => {
    const columns = ['ad_id', 'ad_name', 'ad_title', 'ad_text', 'angle_type', 'target_audience', 'image_url', 'video_url', 'post_link'];
    const csv = convertToCSV(ads, columns);
    downloadCSV(csv, 'ads.csv');
  };

  const handleExportComments = () => {
    const columns = ['comment_id', 'ad_id', 'ad_title', 'message', 'created_time', 'theme', 'sentiment', 'Cluster name', 'Cluster Description'];
    const csv = convertToCSV(allComments, columns);
    downloadCSV(csv, 'comments.csv');
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const clustersData = await fetchCommentClusters();
        setClusters(clustersData);
        const clusterCommentsData = await fetchClusterCommentMappings();
        setClusterComments(clusterCommentsData);
      } catch (err) {
        console.error('Error fetching clusters or cluster-comment mappings:', err);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="report-page">
      <Header 
        brand={data.brand || 'Brand'} 
        totalAds={ads.length} 
        totalComments={allComments.length} 
      />
      {/* Export buttons */}
      <div className="mb-4 flex gap-2">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow"
          onClick={handleExportAds}
        >
          Export Ads CSV
        </button>
        <button
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow"
          onClick={handleExportComments}
        >
          Export Comments CSV
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
        <>
          <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Angle Type Distribution</h3>
              <div className="h-64">
                <Pie data={angleTypeData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Comment Sentiment</h3>
              <div className="h-64">
                <Pie data={sentimentData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Top Comment Clusters/Themes</h3>
              <div className="h-64">
                <Bar 
                  data={clusterData} 
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          afterLabel: function(context) {
                            const index = context.dataIndex;
                            const cluster = clustersData[index];
                            const comment = allComments.find(c => (c["Cluster name"] || c.theme) === cluster);
                            return comment?.["Cluster Description"] ? `Description: ${comment["Cluster Description"]}` : '';
                          }
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Ads with Most Comments</h3>
              <div className="h-64">
                <Bar 
                  data={adCommentData} 
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
          </div>
        </>
      )}
      
      {selectedTab === 'ads' && (
        <>
          <h2 className="text-xl font-semibold mb-4">All Ads</h2>
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
            <AdTable ads={ads} selectedAdIds={selectedAdIds} onSelectedAdIdsChange={setSelectedAdIds} />
          </div>
        </>
      )}
      
      {selectedTab === 'comments' && (
        <>
          <h2 className="text-xl font-semibold mb-4">All Comments</h2>
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
            <CommentTable comments={filteredComments} ads={ads} clusters={clusters} clusterComments={clusterComments} />
          </div>
        </>
      )}
      
      {selectedTab === 'media' && (
        <>
          <h2 className="text-xl font-semibold mb-4">Media Gallery</h2>
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow">
            <MediaGrid ads={ads} />
          </div>
        </>
      )}
    </div>
  );
} 