'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

interface Ad {
  ad_id: string;
  ad_name?: string;
  ad_title?: string;
  ad_text?: string;
  angle_type?: string;
  target_audience?: string;
  post_link?: string;
  funnel?: string;
  total_comments?: number; // Total unfiltered comment count for this ad
}

type AdTableProps = {
  ads: Ad[];
  selectedAdIds?: string[];
  onSelectedAdIdsChange?: (ids: string[]) => void;
};

export default function AdTable({ ads, selectedAdIds: controlledSelectedAdIds, onSelectedAdIdsChange }: AdTableProps) {
  // Load persisted selected ads from localStorage
  const loadPersistedSelectedAds = (): string[] => {
    if (typeof window !== 'undefined') {
      try {
        const persisted = localStorage.getItem('selectedAdIds');
        return persisted ? JSON.parse(persisted) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Support both controlled and uncontrolled selection
  const [uncontrolledSelectedAdIds, setUncontrolledSelectedAdIds] = useState<string[]>(() =>
    controlledSelectedAdIds ?? loadPersistedSelectedAds()
  );
  const selectedAdIds = controlledSelectedAdIds ?? uncontrolledSelectedAdIds;
  
  // Enhanced setSelectedAdIds with persistence
  const setSelectedAdIds = (newIds: string[] | ((prev: string[]) => string[])) => {
    const ids = typeof newIds === 'function' ? newIds(selectedAdIds) : newIds;
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('selectedAdIds', JSON.stringify(ids));
      } catch {
        // Silently handle localStorage errors
      }
    }
    
    if (onSelectedAdIdsChange) {
      onSelectedAdIdsChange(ids);
    } else {
      setUncontrolledSelectedAdIds(ids);
    }
  };

  // Static display order - set once on mount and never changes during session
  const [displayAds, setDisplayAds] = useState<Ad[]>(() => {
    // On component mount, immediately check for persisted selections and reorder
    const persistedSelections = loadPersistedSelectedAds();
    
    if (persistedSelections.length === 0) {
      return ads;
    }
    
    const selectedAds = ads.filter(ad => persistedSelections.includes(ad.ad_id));
    const unselectedAds = ads.filter(ad => !persistedSelections.includes(ad.ad_id));
    return [...selectedAds, ...unselectedAds];
  });

  // Handle ads data changes (but preserve order during session)
  useEffect(() => {
    // Only update displayAds if it's completely empty (safety check)
    if (displayAds.length === 0 && ads.length > 0) {
      setDisplayAds(ads);
    }
  }, [ads, displayAds.length]);

  const router = useRouter();
  
  const columnHelper = createColumnHelper<Ad>();

  const columns = [
    {
      id: 'select',
      header: () => (
        <div
          className="flex items-center justify-center py-2 px-4 cursor-pointer"
          onClick={e => {
            e.stopPropagation();
            const allSelected = displayAds.length > 0 && selectedAdIds.length === displayAds.length;
            if (!allSelected) {
              setSelectedAdIds(displayAds.map(ad => ad.ad_id));
            } else {
              setSelectedAdIds([]);
            }
          }}
        >
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={displayAds.length > 0 && selectedAdIds.length === displayAds.length}
            onChange={() => {}} // Handled by container click
            className="pointer-events-none" // Prevent direct input interaction
          />
        </div>
      ),
      cell: ({ row }: any) => (
        <div
          className="flex items-center justify-center py-2 px-4 cursor-pointer"
          onClick={e => {
            e.stopPropagation();
            const id = row.original.ad_id;
            const isCurrentlyChecked = selectedAdIds.includes(id);
            if (!isCurrentlyChecked) {
              setSelectedAdIds([...selectedAdIds, id]);
            } else {
              setSelectedAdIds(selectedAdIds.filter(selectedId => selectedId !== id));
            }
          }}
        >
          <input
            type="checkbox"
            checked={selectedAdIds.includes(row.original.ad_id)}
            onChange={() => {}} // Handled by container click
            className="pointer-events-none" // Prevent direct input interaction
          />
        </div>
      ),
    },
    columnHelper.accessor('ad_id', {
      header: 'Ad ID',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('ad_title', {
      header: 'Ad Title',
      cell: info => (
        <div className="max-w-xs truncate" title={info.getValue() || ''}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('ad_text', {
      header: 'Ad Text',
      cell: info => (
        <div className="max-w-xs truncate" title={info.getValue() || ''}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('angle_type', {
      header: 'Angle Type',
      cell: info => {
        const angleType = info.getValue() || 'Unknown';
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            {angleType}
          </span>
        );
      },
    }),
    columnHelper.accessor('funnel', {
      header: 'Funnel',
      cell: info => {
        const funnel = info.getValue() || 'Unknown';
        const colorMap = {
          'TOF': 'bg-green-100 text-green-800',
          'MOF': 'bg-yellow-100 text-yellow-800',
          'BOF': 'bg-red-100 text-red-800',
          'Unknown': 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${colorMap[funnel as keyof typeof colorMap] || colorMap.Unknown}`}>
            {funnel}
          </span>
        );
      },
    }),
    columnHelper.accessor('post_link', {
      header: 'Post Link',
      cell: info => info.getValue() ? (
        <a
          href={info.getValue()}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-1 px-2 rounded text-xs"
        >
          View Post
        </a>
      ) : 'No link',
    }),
    columnHelper.accessor('total_comments', {
      header: 'Comments',
      cell: info => (info.getValue() || 0) + ' comments',
    })
  ];

  const table = useReactTable({
    data: displayAds,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
    // Prevent automatic pagination reset on data changes
    autoResetPageIndex: false,
  });

  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = selectedAdIds.length > 0 && selectedAdIds.length < displayAds.length;
    }
  }, [selectedAdIds.length, displayAds.length]);

  return (
    <div>
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
              <tr
                key={row.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedAdIds.includes(row.original.ad_id) ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                							onClick={() => router.push(`/brands/ad/${row.original.ad_id}`)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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

    </div>
  );
} 
