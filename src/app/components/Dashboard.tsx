'use client';

import { useState, useEffect } from 'react';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type DashboardProps = {
  dashboardId?: string;
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
};

export default function Dashboard({ dashboardId = 'default' }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/dashboard?id=${dashboardId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dashboardId]);

  if (loading) return <div className="flex justify-center items-center h-80"><div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  if (error) return <div className="text-red-500 p-4 border border-red-300 rounded-md">{error}</div>;
  if (!data) return <div className="text-gray-500 p-4">No dashboard data available</div>;

  // Line chart data
  const lineChartData = {
    labels: data.timeSeriesData.labels,
    datasets: data.timeSeriesData.datasets.map((dataset, index) => ({
      label: dataset.name,
      data: dataset.data,
      borderColor: index === 0 ? 'rgb(53, 162, 235)' : 'rgb(255, 99, 132)',
      backgroundColor: index === 0 ? 'rgba(53, 162, 235, 0.5)' : 'rgba(255, 99, 132, 0.5)',
    })),
  };

  // Pie chart data
  const pieChartData = {
    labels: data.pieChartData.labels,
    datasets: [
      {
        data: data.pieChartData.values,
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

  return (
    <div className="dashboard p-6 bg-slate-50 dark:bg-slate-900 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{data.title}</h1>
        <button 
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('id', dashboardId);
            navigator.clipboard.writeText(url.toString());
            alert('Dashboard link copied to clipboard!');
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Share Dashboard
        </button>
      </div>
      
      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {data.metrics.map((metric) => (
          <div key={metric.id} className="bg-white dark:bg-slate-800 p-4 rounded-md shadow">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium text-sm">{metric.label}</h3>
            <div className="flex items-end mt-1">
              <span className="text-2xl font-bold">
                {metric.id.includes('rate') ? `${metric.value}%` : metric.value.toLocaleString()}
              </span>
              <span className={`ml-2 text-sm ${metric.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {metric.change >= 0 ? `+${metric.change}%` : `${metric.change}%`}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 rounded-md shadow">
          <h3 className="font-medium mb-4">Revenue & Profit Trends</h3>
          <div className="h-80">
            <Line 
              data={lineChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }} 
            />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-md shadow">
          <h3 className="font-medium mb-4">Sales Distribution</h3>
          <div className="h-80 flex justify-center items-center">
            <Pie 
              data={pieChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' }
                }
              }} 
            />
          </div>
        </div>
      </div>
      
      {/* Table Section */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-md shadow overflow-hidden">
        <h3 className="font-medium mb-4">Product Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {data.tableData.headers.map((header, index) => (
                  <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.tableData.rows.map((row) => (
                <tr key={row.id}>
                  {row.values.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 