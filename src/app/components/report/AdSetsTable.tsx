'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

interface AdSet {
  ad_set_id: string;
  ad_set_name: string;
  campaign_id: string;
  campaign_name: string;
  status: string;
  effective_status: string;
  optimization_goal: string;
  bid_strategy: string;
  daily_budget?: number;
  lifetime_budget?: number;
  budget_remaining?: number;
  start_time?: string;
  end_time?: string;
  created_time: string;
  lifetime_imps?: number;
  destination_type?: string;
}

type AdSetsTableProps = {
  adSets: AdSet[];
  selectedAdSetIds?: string[];
  onSelectedAdSetIdsChange?: (ids: string[]) => void;
};

export default function AdSetsTable({ adSets, selectedAdSetIds: controlledSelectedAdSetIds, onSelectedAdSetIdsChange }: AdSetsTableProps) {
  // Load persisted selected ad sets from localStorage
  const loadPersistedSelectedAdSets = (): string[] => {
    if (typeof window !== 'undefined') {
      try {
        const persisted = localStorage.getItem('selectedAdSetIds');
        return persisted ? JSON.parse(persisted) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Support both controlled and uncontrolled selection
  const [uncontrolledSelectedAdSetIds, setUncontrolledSelectedAdSetIds] = useState<string[]>(() =>
    controlledSelectedAdSetIds ?? loadPersistedSelectedAdSets()
  );
  const selectedAdSetIds = controlledSelectedAdSetIds ?? uncontrolledSelectedAdSetIds;
  
  // Enhanced setSelectedAdSetIds with persistence
  const setSelectedAdSetIds = (newIds: string[] | ((prev: string[]) => string[])) => {
    const ids = typeof newIds === 'function' ? newIds(selectedAdSetIds) : newIds;
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('selectedAdSetIds', JSON.stringify(ids));
      } catch {
        // Silently handle localStorage errors
      }
    }
    
    if (onSelectedAdSetIdsChange) {
      onSelectedAdSetIdsChange(ids);
    } else {
      setUncontrolledSelectedAdSetIds(ids);
    }
  };

  // Static display order - set once on mount and never changes during session
  const [displayAdSets, setDisplayAdSets] = useState<AdSet[]>(() => {
    // On component mount, immediately check for persisted selections and reorder
    const persistedSelections = loadPersistedSelectedAdSets();
    
    if (persistedSelections.length === 0) {
      return adSets;
    }
    
    const selectedAdSets = adSets.filter(adSet => persistedSelections.includes(adSet.ad_set_id));
    const unselectedAdSets = adSets.filter(adSet => !persistedSelections.includes(adSet.ad_set_id));
    return [...selectedAdSets, ...unselectedAdSets];
  });

  // Handle ad sets data changes (but preserve order during session)
  useEffect(() => {
    // Update displayAdSets when adSets data changes (due to filtering)
    // But maintain selection-based ordering if we have selections
    if (adSets.length > 0) {
      if (selectedAdSetIds.length > 0) {
        // Maintain order: selected ad sets first, then unselected
        const selectedAdSets = adSets.filter(adSet => selectedAdSetIds.includes(adSet.ad_set_id));
        const unselectedAdSets = adSets.filter(adSet => !selectedAdSetIds.includes(adSet.ad_set_id));
        setDisplayAdSets([...selectedAdSets, ...unselectedAdSets]);
      } else {
        // No selections, just use the ad sets as-is
        setDisplayAdSets(adSets);
      }
    } else {
      // No ad sets data, clear display
      setDisplayAdSets([]);
    }
  }, [adSets, selectedAdSetIds]);

  const router = useRouter();
  
  const columnHelper = createColumnHelper<AdSet>();

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const columns = [
    {
      id: 'select',
      header: () => (
        <div
          className="flex items-center justify-center py-2 px-4 cursor-pointer"
          onClick={e => {
            e.stopPropagation();
            const allSelected = displayAdSets.length > 0 && selectedAdSetIds.length === displayAdSets.length;
            if (!allSelected) {
              setSelectedAdSetIds(displayAdSets.map(adSet => adSet.ad_set_id));
            } else {
              setSelectedAdSetIds([]);
            }
          }}
        >
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={displayAdSets.length > 0 && selectedAdSetIds.length === displayAdSets.length}
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
            const id = row.original.ad_set_id;
            const isCurrentlyChecked = selectedAdSetIds.includes(id);
            if (!isCurrentlyChecked) {
              setSelectedAdSetIds([...selectedAdSetIds, id]);
            } else {
              setSelectedAdSetIds(selectedAdSetIds.filter(selectedId => selectedId !== id));
            }
          }}
        >
          <input
            type="checkbox"
            checked={selectedAdSetIds.includes(row.original.ad_set_id)}
            onChange={() => {}} // Handled by container click
            className="pointer-events-none" // Prevent direct input interaction
          />
        </div>
      ),
    },
    columnHelper.accessor('ad_set_id', {
      header: 'Ad Set ID',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('ad_set_name', {
      header: 'Ad Set Name',
      cell: info => (
        <div className="max-w-xs truncate" title={info.getValue() || ''}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('campaign_name', {
      header: 'Campaign',
      cell: info => (
        <div className="max-w-xs truncate" title={info.getValue() || ''}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('effective_status', {
      header: 'Status',
      cell: info => {
        const status = info.getValue() || 'unknown';
        const colorMap = {
          'active': 'bg-green-100 text-green-800',
          'paused': 'bg-yellow-100 text-yellow-800',
          'deleted': 'bg-red-100 text-red-800',
          'pending_review': 'bg-orange-100 text-orange-800',
          'disapproved': 'bg-red-100 text-red-800',
          'preapproved': 'bg-blue-100 text-blue-800',
          'unknown': 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs capitalize ${colorMap[status.toLowerCase() as keyof typeof colorMap] || colorMap.unknown}`}>
            {status.replace('_', ' ')}
          </span>
        );
      },
    }),
    columnHelper.accessor('optimization_goal', {
      header: 'Optimization',
      cell: info => {
        const goal = info.getValue() || 'Not set';
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
            {goal.replace(/_/g, ' ').toUpperCase()}
          </span>
        );
      },
    }),
    columnHelper.accessor('bid_strategy', {
      header: 'Bid Strategy',
      cell: info => {
        const strategy = info.getValue() || 'Not set';
        return (
          <span className="text-xs capitalize">
            {strategy.replace('_', ' ')}
          </span>
        );
      },
    }),
    columnHelper.accessor('daily_budget', {
      header: 'Daily Budget',
      cell: info => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('lifetime_budget', {
      header: 'Lifetime Budget',
      cell: info => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('budget_remaining', {
      header: 'Budget Remaining',
      cell: info => {
        const remaining = info.getValue();
        if (!remaining) return 'N/A';
        const colorClass = remaining > 0 ? 'text-green-600' : 'text-red-600';
        return (
          <span className={colorClass}>
            {formatCurrency(remaining)}
          </span>
        );
      },
    }),
    columnHelper.accessor('lifetime_imps', {
      header: 'Impressions',
      cell: info => {
        const imps = info.getValue();
        if (!imps) return '0';
        return new Intl.NumberFormat('en-US').format(imps);
      },
    }),
    columnHelper.accessor('created_time', {
      header: 'Created',
      cell: info => new Date(info.getValue()).toLocaleDateString(),
    })
  ];

  const table = useReactTable({
    data: displayAdSets,
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
      checkboxRef.current.indeterminate = selectedAdSetIds.length > 0 && selectedAdSetIds.length < displayAdSets.length;
    }
  }, [selectedAdSetIds.length, displayAdSets.length]);

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
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedAdSetIds.includes(row.original.ad_set_id) ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
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