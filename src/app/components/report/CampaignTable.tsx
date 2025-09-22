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

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  objective: string;
  start_time?: string;
  created_at: string;
  updated_at: string;
  account_id: string;
  topline_id?: string;
}

type CampaignTableProps = {
  campaigns: Campaign[];
  selectedCampaignIds?: string[];
  onSelectedCampaignIdsChange?: (ids: string[]) => void;
};

export default function CampaignTable({ campaigns, selectedCampaignIds: controlledSelectedCampaignIds, onSelectedCampaignIdsChange }: CampaignTableProps) {
  // Load persisted selected campaigns from localStorage
  const loadPersistedSelectedCampaigns = (): string[] => {
    if (typeof window !== 'undefined') {
      try {
        const persisted = localStorage.getItem('selectedCampaignIds');
        return persisted ? JSON.parse(persisted) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Support both controlled and uncontrolled selection
  const [uncontrolledSelectedCampaignIds, setUncontrolledSelectedCampaignIds] = useState<string[]>(() =>
    controlledSelectedCampaignIds ?? loadPersistedSelectedCampaigns()
  );
  const selectedCampaignIds = controlledSelectedCampaignIds ?? uncontrolledSelectedCampaignIds;
  
  // Enhanced setSelectedCampaignIds with persistence
  const setSelectedCampaignIds = (newIds: string[] | ((prev: string[]) => string[])) => {
    const ids = typeof newIds === 'function' ? newIds(selectedCampaignIds) : newIds;
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('selectedCampaignIds', JSON.stringify(ids));
      } catch {
        // Silently handle localStorage errors
      }
    }
    
    if (onSelectedCampaignIdsChange) {
      onSelectedCampaignIdsChange(ids);
    } else {
      setUncontrolledSelectedCampaignIds(ids);
    }
  };

  // Static display order - set once on mount and never changes during session
  const [displayCampaigns, setDisplayCampaigns] = useState<Campaign[]>(() => {
    // On component mount, immediately check for persisted selections and reorder
    const persistedSelections = loadPersistedSelectedCampaigns();
    
    if (persistedSelections.length === 0) {
      return campaigns;
    }
    
    const selectedCampaigns = campaigns.filter(campaign => persistedSelections.includes(campaign.campaign_id));
    const unselectedCampaigns = campaigns.filter(campaign => !persistedSelections.includes(campaign.campaign_id));
    return [...selectedCampaigns, ...unselectedCampaigns];
  });

  // Handle campaigns data changes (but preserve order during session)
  useEffect(() => {
    // Update displayCampaigns when campaigns data changes (due to filtering)
    // But maintain selection-based ordering if we have selections
    if (campaigns.length > 0) {
      if (selectedCampaignIds.length > 0) {
        // Maintain order: selected campaigns first, then unselected
        const selectedCampaigns = campaigns.filter(campaign => selectedCampaignIds.includes(campaign.campaign_id));
        const unselectedCampaigns = campaigns.filter(campaign => !selectedCampaignIds.includes(campaign.campaign_id));
        setDisplayCampaigns([...selectedCampaigns, ...unselectedCampaigns]);
      } else {
        // No selections, just use the campaigns as-is
        setDisplayCampaigns(campaigns);
      }
    } else {
      // No campaigns data, clear display
      setDisplayCampaigns([]);
    }
  }, [campaigns, selectedCampaignIds]);

  const router = useRouter();
  
  const columnHelper = createColumnHelper<Campaign>();

  const columns = [
    {
      id: 'select',
      header: () => (
        <div
          className="flex items-center justify-center py-2 px-4 cursor-pointer"
          onClick={e => {
            e.stopPropagation();
            const allSelected = displayCampaigns.length > 0 && selectedCampaignIds.length === displayCampaigns.length;
            if (!allSelected) {
              setSelectedCampaignIds(displayCampaigns.map(campaign => campaign.campaign_id));
            } else {
              setSelectedCampaignIds([]);
            }
          }}
        >
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={displayCampaigns.length > 0 && selectedCampaignIds.length === displayCampaigns.length}
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
            const id = row.original.campaign_id;
            const isCurrentlyChecked = selectedCampaignIds.includes(id);
            if (!isCurrentlyChecked) {
              setSelectedCampaignIds([...selectedCampaignIds, id]);
            } else {
              setSelectedCampaignIds(selectedCampaignIds.filter(selectedId => selectedId !== id));
            }
          }}
        >
          <input
            type="checkbox"
            checked={selectedCampaignIds.includes(row.original.campaign_id)}
            onChange={() => {}} // Handled by container click
            className="pointer-events-none" // Prevent direct input interaction
          />
        </div>
      ),
    },
    columnHelper.accessor('campaign_id', {
      header: 'Campaign ID',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('campaign_name', {
      header: 'Campaign Name',
      cell: info => (
        <div className="max-w-xs truncate" title={info.getValue() || ''}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => {
        const status = info.getValue() || 'unknown';
        const colorMap = {
          'active': 'bg-green-100 text-green-800',
          'paused': 'bg-yellow-100 text-yellow-800',
          'draft': 'bg-gray-100 text-gray-800',
          'completed': 'bg-blue-100 text-blue-800',
          'archived': 'bg-red-100 text-red-800',
          'unknown': 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs capitalize ${colorMap[status as keyof typeof colorMap] || colorMap.unknown}`}>
            {status}
          </span>
        );
      },
    }),
    columnHelper.accessor('objective', {
      header: 'Objective',
      cell: info => {
        const objective = info.getValue() || 'Not set';
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs capitalize">
            {objective.replace('_', ' ')}
          </span>
        );
      },
    }),
    columnHelper.accessor('start_time', {
      header: 'Start Time',
      cell: info => {
        const startTime = info.getValue();
        return startTime ? new Date(startTime).toLocaleDateString() : 'Not set';
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      cell: info => new Date(info.getValue()).toLocaleDateString(),
    })
  ];

  const table = useReactTable({
    data: displayCampaigns,
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
      checkboxRef.current.indeterminate = selectedCampaignIds.length > 0 && selectedCampaignIds.length < displayCampaigns.length;
    }
  }, [selectedCampaignIds.length, displayCampaigns.length]);

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
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedCampaignIds.includes(row.original.campaign_id) ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
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