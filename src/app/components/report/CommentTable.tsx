'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  getFilteredRowModel,
  PaginationState,
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
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  
  const toggleExpand = (id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Extract unique sentiment and theme values for filters
  const sentiments = useMemo(() => 
    Array.from(new Set(comments.map(c => c.sentiment || 'Unknown'))),
    [comments]
  );
  
  const themes = useMemo(() => 
    Array.from(new Set(comments.map(c => c.theme || 'Unknown'))),
    [comments]
  );

  const columnHelper = createColumnHelper<Comment>();

  const columns = useMemo(() => [
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
  ], [expanded, toggleExpand]);

  // Create properly typed column filters
  const columnFilters = useMemo(() => {
    const filters = [];
    if (sentimentFilter) {
      filters.push({ id: 'sentiment', value: sentimentFilter });
    }
    if (themeFilter) {
      filters.push({ id: 'theme', value: themeFilter });
    }
    return filters;
  }, [sentimentFilter, themeFilter]);

  const table = useReactTable({
    data: comments,
    columns,
    state: {
      columnFilters,
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: false,
  });

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [sentimentFilter, themeFilter]);

  const handlePageSizeChange = (newPageSize: number) => {
    try {
      setPagination(prev => ({
        pageIndex: 0,  // Reset to first page when changing page size
        pageSize: newPageSize,
      }));
    } catch (error) {
      console.error("Error changing page size:", error);
    }
  };

  // Safe calculation for page counts and indices
  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  
  const totalFilteredRows = table.getFilteredRowModel().rows.length;
  const startIndex = totalFilteredRows > 0 ? currentPageIndex * pagination.pageSize + 1 : 0;
  const endIndex = Math.min((currentPageIndex + 1) * pagination.pageSize, totalFilteredRows);

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
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No comments found
                </td>
              </tr>
            )}
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
            Page {currentPageIndex + 1} of {pageCount}
          </span>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Show
            <select
              value={pagination.pageSize}
              onChange={e => handlePageSizeChange(Number(e.target.value))}
              className="mx-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            >
              {[10, 25, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
            entries
          </span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing {startIndex} - {endIndex} of {totalFilteredRows} comments
        </div>
      </div>
    </div>
  );
} 