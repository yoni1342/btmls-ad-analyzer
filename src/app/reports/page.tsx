'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Report = {
  id: string;
  title: string;
  brand: string;
  created: string;
  adCount: number;
  reportUrl: string;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/reports');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch reports: ${response.statusText}`);
        }
        
        const data = await response.json();
        setReports(data.reports);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Reports</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Ad Analytics Reports</h1>
        <Link 
          href="/reports/create" 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
        >
          Create New Report
        </Link>
      </div>
      
      {reports.length === 0 ? (
        <div className="bg-gray-50 p-10 text-center rounded-lg border border-gray-200">
          <h2 className="text-xl font-medium text-gray-600 mb-4">No Reports Available</h2>
          <p className="text-gray-500 mb-6">Get started by creating your first ad analytics report.</p>
          <Link 
            href="/reports/create" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            Create Report
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Link 
              key={report.id} 
              href={report.reportUrl}
              className="block bg-white p-6 rounded-lg shadow-sm hover:shadow-md border border-gray-100 transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2 truncate">{report.title}</h2>
              <p className="text-gray-600 mb-4">{report.brand}</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Created: {new Date(report.created).toLocaleDateString()}</span>
                <span>{report.adCount} {report.adCount === 1 ? 'ad' : 'ads'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 