'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateReportPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!title.trim()) {
      setError('Please enter a report title');
      return;
    }

    if (!jsonData && !file) {
      setError('Please either paste JSON data or upload a JSON file');
      return;
    }

    try {
      setLoading(true);
      
      let dataToSend;
      
      // If we have a file, read it
      if (file) {
        const text = await file.text();
        try {
          // Validate JSON
          JSON.parse(text);
          dataToSend = text;
        } catch (err) {
          setError('The uploaded file does not contain valid JSON');
          setLoading(false);
          return;
        }
      } else {
        // Use pasted JSON
        try {
          // Validate JSON
          JSON.parse(jsonData);
          dataToSend = jsonData;
        } catch (err) {
          setError('The pasted data is not valid JSON');
          setLoading(false);
          return;
        }
      }
      
      // Send to API
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          data: JSON.parse(dataToSend)
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create report: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Redirect to the new report using the URL from the API
      router.push(result.reportUrl);
    } catch (err) {
      console.error('Error creating report:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/json' && !selectedFile.name.endsWith('.json')) {
        setError('Please upload a JSON file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Create New Report</h1>
      
      {error && (
        <div className="bg-red-50 p-4 mb-6 rounded-lg border border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-6">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Report Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter a descriptive title for your report"
          />
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">Data Source</h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label htmlFor="jsonData" className="block text-sm font-medium text-gray-700 mb-1">
                Paste JSON Data
              </label>
              <textarea
                id="jsonData"
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                className="w-full h-64 p-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder='{"brand": "Example", "ads": [...]}'
                disabled={!!file}
              />
            </div>
            
            <div className="flex-1">
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                Or Upload JSON File
              </label>
              <div className="mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md h-64">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H8m36-12h-4m4 0H20"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".json,application/json"
                        onChange={handleFileChange}
                        disabled={!!jsonData}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">JSON files only</p>
                </div>
                {file && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-900 font-semibold">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                Creating...
              </>
            ) : (
              'Create Report'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 