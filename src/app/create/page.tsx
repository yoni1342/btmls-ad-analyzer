'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateDashboard() {
  const router = useRouter();
  const [jsonData, setJsonData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate JSON
      let parsedData;
      try {
        parsedData = JSON.parse(jsonData);
      } catch (err) {
        throw new Error('Invalid JSON format. Please check your input.');
      }
      
      // Send data to API
      const response = await fetch('/api/dashboard/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create dashboard');
      }
      
      // Redirect to the newly created dashboard
      router.push(result.url);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExampleData = () => {
    const exampleData = {
      title: "Product Analysis Dashboard",
      metrics: [
        { id: "total_products", label: "Total Products", value: 125, change: 5.2 },
        { id: "avg_price", label: "Average Price", value: 89.99, change: 2.1 },
        { id: "inventory", label: "Inventory Items", value: 1892, change: -3.5 },
        { id: "categories", label: "Categories", value: 12, change: 0 }
      ],
      timeSeriesData: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"],
        datasets: [
          {
            name: "Units Sold",
            data: [120, 145, 132, 165, 178, 190, 208, 215]
          },
          {
            name: "Returns",
            data: [12, 15, 10, 14, 20, 17, 19, 21]
          }
        ]
      },
      tableData: {
        headers: ["Category", "Products", "Avg. Price", "Stock"],
        rows: [
          { id: 1, values: ["Electronics", 45, "$120.50", 524] },
          { id: 2, values: ["Clothing", 32, "$45.75", 768] },
          { id: 3, values: ["Home Goods", 28, "$65.25", 321] },
          { id: 4, values: ["Sports", 20, "$78.95", 279] }
        ]
      },
      pieChartData: {
        labels: ["Electronics", "Clothing", "Home Goods", "Sports", "Other"],
        values: [45, 32, 28, 20, 5]
      }
    };
    
    setJsonData(JSON.stringify(exampleData, null, 2));
  };
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Create New Dashboard</h1>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8">
        <p className="mb-6">
          Enter your dashboard data in JSON format. The data should include metrics, time series data,
          table data, and pie chart data. After creating the dashboard, you'll get a unique URL that
          you can share with others.
        </p>
        
        <div className="flex justify-end mb-4">
          <button
            onClick={handleExampleData}
            className="text-blue-500 hover:text-blue-600 text-sm"
          >
            Load Example Data
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="jsonData" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dashboard Data (JSON)
            </label>
            <textarea
              id="jsonData"
              rows={20}
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 font-mono text-sm"
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder='{"title": "My Dashboard", ...}'
              required
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 bg-blue-500 text-white rounded-md ${
                loading 
                  ? 'opacity-75 cursor-not-allowed' 
                  : 'hover:bg-blue-600'
              }`}
            >
              {loading ? 'Creating...' : 'Create Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}