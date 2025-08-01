'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
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
  sentiment?: string;
  ad_id?: string;
  ad_title?: string;
  meta_cluster?: string;
  'Angel Type'?: string; // Legacy format
  angle_type?: string;   // New format for compatibility
  created_time?: string;
};

type Ad = {
  ad_id: string;
  ad_name?: string;
  ad_title?: string;
  ad_text?: string;
  angle_type?: string;
  image_url?: string;
  video_url?: string;
  post_link?: string;
};

type CommentTableProps = {
  comments: Comment[];
  ads?: Ad[];
  selectedAdIds?: string[]; // For future extensibility, not used for filtering here
  clusters?: any[];
  clusterComments?: any[];
  // Comment-specific filters managed by parent
  sentimentFilter: string;
  setSentimentFilter: (value: string) => void;
  clusterFilter: string;
  setClusterFilter: (value: string) => void;
  angleTypeFilter: string;
  setAngleTypeFilter: (value: string) => void;
};

export default function CommentTable({
  comments,
  ads = [],
  selectedAdIds,
  clusters = [],
  clusterComments = [],
  sentimentFilter,
  setSentimentFilter,
  clusterFilter,
  setClusterFilter,
  angleTypeFilter,
  setAngleTypeFilter
}: CommentTableProps) {
  const { selectedBrand, searchQuery, dateRange } = useAppStore();

  const filteredByAd = useMemo(() => {
    if (selectedAdIds && selectedAdIds.length > 0) {
      return comments.filter(c => selectedAdIds.includes(c.ad_id || ''));
    }
    return comments;
  }, [comments, selectedAdIds]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [showModal, setShowModal] = useState(false);

  /* Removed brandClusters - using clusters directly for filtering */
  
  const toggleExpand = (id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  /* Removed commentToMetaCluster utility; using clusters directly */

 // Compute filtered comments by Angel Type and meta-cluster
 const filteredByCluster = useMemo(() => {
   let result = filteredByAd;
   if (angleTypeFilter) {
     result = result.filter(c => {
       const angelType = c['Angel Type'] || c.angle_type || 'Unknown';
       return angelType === angleTypeFilter;
     });
   }
   if (clusterFilter) {
     result = result.filter(c => (c.meta_cluster || 'Unknown') === clusterFilter);
   }
   return result;
 }, [filteredByAd, angleTypeFilter, clusterFilter]);

   // Compute unique meta-cluster values for filter dropdown
   const metaClusters = useMemo(() =>
     Array.from(new Set(filteredByAd.map(c => (c.meta_cluster || 'Unknown')))),
     [filteredByAd]
   );

  const handleRowClick = (comment: Comment) => {
    setSelectedComment(comment);
    setShowModal(true);
  };

  const getAdForComment = (comment: Comment) => {
    if (!comment?.ad_id) return null;
    return ads.find(ad => ad.ad_id === comment.ad_id);
  };
  
  // (previous filteredByCluster removed)

  // Extract unique sentiment and theme values for filters
  const sentiments = useMemo(() =>
    Array.from(new Set(comments.map(c => c.sentiment || 'Unknown'))),
    [comments]
  );
  // (previous metaClusters removed)

   const angleTypes = useMemo(() =>
     Array.from(new Set(filteredByAd.map(c => (c['Angel Type'] || c.angle_type || 'Unknown')))),
     [filteredByAd]
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
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(id);
                }}
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
      header: () => (
        <div className="cursor-pointer">Sentiment</div>
      ),
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
      sortingFn: 'alphanumeric',
    }),
    columnHelper.accessor('meta_cluster', {
      header: () => <div className="cursor-pointer">Cluster</div>,
      cell: info => <>{info.getValue() || 'Unknown'}</>,
      filterFn: 'equals',
      sortingFn: 'alphanumeric',
    }),
    columnHelper.accessor((row) => row['Angel Type'] || row.angle_type, {
      id: 'angle_type',
      header: () => <div className="cursor-pointer">Angel Type</div>,
      cell: info => info.getValue() || 'Unknown',
      filterFn: 'equals',
      sortingFn: 'alphanumeric',
    }),
    columnHelper.accessor('ad_title', {
      header: 'Related Ad',
      cell: info => (
        <div className="max-w-xs truncate" title={info.getValue() || ''}>
          {info.getValue() || info.row.original.ad_id || 'Unknown'}
        </div>
      ),
    }),
    columnHelper.accessor('created_time', {
      header: () => (
        <div className="cursor-pointer">Date</div>
      ),
      cell: info => {
        const dateStr = info.getValue();
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleDateString();
      },
      sortingFn: 'datetime',
    }),
  ], [expanded, toggleExpand]);

  // Create properly typed column filters (exclude clusterFilter to use custom meta-cluster filtering)
  const columnFilters = useMemo(() => {
    const filters: { id: string; value: string }[] = [];
    if (sentimentFilter) {
      filters.push({ id: 'sentiment', value: sentimentFilter });
    }
    if (angleTypeFilter) {
      filters.push({ id: 'angle_type', value: angleTypeFilter });
    }
    return filters;
  }, [sentimentFilter, angleTypeFilter]);

  const table = useReactTable({
    data: filteredByCluster,
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
    enableSorting: true,
    enableColumnFilters: true,
  });

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [sentimentFilter, clusterFilter, angleTypeFilter]);

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

  // Modal component
  const AdDetailModal = () => {
    if (!selectedComment) return null;
    
    const ad = getAdForComment(selectedComment);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Comment Details
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-lg">{selectedComment.message}</p>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <div>Date: {selectedComment.created_time ? new Date(selectedComment.created_time).toLocaleString() : 'Unknown'}</div>
                <div>Sentiment: {selectedComment.sentiment || 'Unknown'}</div>
                <div>Cluster: {selectedComment.meta_cluster || 'Unknown'}</div>
                <div>Angel Type: {selectedComment['Angel Type'] || selectedComment.angle_type || 'Unknown'}</div>
              </div>
            </div>
            
            {ad ? (
              <div>
                <h4 className="text-lg font-medium mb-4">Related Ad</h4>
                <div className="space-y-4">
                  <div>
                    <span className="font-medium">Title:</span> {ad.ad_title || 'Untitled'}
                  </div>
                  <div>
                    <span className="font-medium">ID:</span> {ad.ad_id}
                  </div>
                  {ad.ad_name && (
                    <div>
                      <span className="font-medium">Name:</span> {ad.ad_name}
                    </div>
                  )}
                  {ad.angle_type && (
                    <div>
                      <span className="font-medium">Angle Type:</span> {ad.angle_type}
                    </div>
                  )}
                  {ad.ad_text && (
                    <div>
                      <span className="font-medium">Text:</span>
                      <p className="mt-1">{ad.ad_text}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {ad.image_url && (
                      <div>
                        <span className="font-medium">Image:</span>
                        <div className="mt-2">
                          <img src={ad.image_url} alt="Ad visual" className="rounded-md max-h-64 object-contain" />
                        </div>
                      </div>
                    )}
                    
                    {ad.video_url && (
                      <div>
                        <span className="font-medium">Video:</span>
                        <div className="mt-2">
                          <video 
                            controls 
                            className="rounded-md max-h-64 w-full"
                            src={ad.video_url}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {ad.post_link && (
                    <div className="mt-4">
                      <a 
                        href={ad.post_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        View Original Post
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-gray-500 dark:text-gray-400">
                No related ad information available
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Angle</label>
          <select
            value={angleTypeFilter}
            onChange={e => setAngleTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Angles</option>
            {angleTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Cluster</label>
          <select
            value={clusterFilter}
            onChange={e => setClusterFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Clusters</option>
            {metaClusters.map(mc => (
              <option key={mc} value={mc}>
                {mc}
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
                  <th 
                    key={header.id} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : (
                        <div className="flex items-center">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <span>
                            {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                          </span>
                        </div>
                      )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => handleRowClick(row.original)}
                >
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

      {/* Modal for showing ad details */}
      {showModal && <AdDetailModal />}
    </div>
  );
}
