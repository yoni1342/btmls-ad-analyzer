'use client';

import { useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  getFilteredRowModel,
} from '@tanstack/react-table';

type Comment = {
  comment_id: string;
  message: string;
  theme?: string;
  sentiment?: string;
  ad_id?: string;
  ad_title?: string;
};

type CommentTableProps = {
  comments: Comment[];
};

export default function CommentTable({ comments }: CommentTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [themeFilter, setThemeFilter] = useState('');
  
  const toggleExpand = (id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Extract unique sentiment and theme values for filters
  const sentiments = Array.from(new Set(comments.map(c => c.sentiment || 'Unknown')));
  const themes = Array.from(new Set(comments.map(c => c.theme || 'Unknown')));

  const columnHelper = createColumnHelper<Comment>();

  const columns = [
    columnHelper.accessor('message', {
      header: 'Comment',
      cell: info => {
        const content = info.getValue();
        const id = info.row.original.comment_id;
        const isExpanded = expanded[id];
        
        return (
          <div>
            <div className={`${isExpanded ? '' : 'line-clamp-2'}`}>
              {content}
            </div>
            {content && content.length > 100 && (
              <button
                onClick={() => toggleExpand(id)}
                className="text-blue-500 text-xs mt-1"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('sentiment', {
      header: 'Sentiment',
      cell: info => {
        const sentiment = info.getValue();
        let bgColor = 'bg-gray-100';
        let textColor = 'text-gray-800';
        
        if (sentiment === 'Positive') {
          bgColor = 'bg-green-100';
          textColor = 'text-green-800';
        } else if (sentiment === 'Negative') {
          bgColor = 'bg-red-100';
          textColor = 'text-red-800';
        } else if (sentiment === 'Neutral') {
          bgColor = 'bg-yellow-100';
          textColor = 'text-yellow-800';
        }
        
        return (
          <span className={`px-2 py-1 ${bgColor} ${textColor} rounded-full text-xs`}>
            {sentiment || 'Unknown'}
          </span>
        );
      },
      filterFn: 'equals',
    }),
    columnHelper.accessor('theme', {
      header: 'Theme',
      cell: info => info.getValue() || 'Unknown',
      filterFn: 'equals',
    }),
    columnHelper.accessor('ad_title', {
      header: 'Related Ad',
      cell: info => (
        <div className="max-w-xs truncate" title={info.getValue() || ''}>
          {info.getValue() || info.row.original.ad_id || 'Unknown'}
        </div>
      ),
    }),
  ];

  // Create properly typed column filters
  const columnFilters = [];
  if (sentimentFilter) {
    columnFilters.push({ id: 'sentiment', value: sentimentFilter });
  }
  if (themeFilter) {
    columnFilters.push({ id: 'theme', value: themeFilter });
  }

  const table = useReactTable({
    data: comments,
    columns,
    state: {
      columnFilters,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Sentiment</label>
          <select
            value={sentimentFilter}
            onChange={e => setSentimentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Sentiments</option>
            {sentiments.map(sentiment => (
              <option key={sentiment} value={sentiment}>
                {sentiment}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Theme</label>
          <select
            value={themeFilter}
            onChange={e => setThemeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Themes</option>
            {themes.map(theme => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-700">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-30"
          >
            {'<<'}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-30"
          >
            {'<'}
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-30"
          >
            {'>'}
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-30"
          >
            {'>>'}
          </button>
        </div>
        <div>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Showing {table.getFilteredRowModel().rows.length} of {comments.length} comments
      </div>
    </div>
  );
} 