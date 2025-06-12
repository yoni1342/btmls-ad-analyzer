'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';
import PositiveIcon from './PositiveIcon';
import NegativeIcon from './NegativeIcon';
import NeutralIcon from './NeutralIcon';

export type Ad = {
  id: string;
  adAccountId: string;
  brandName: string;
  adImage?: string;
  adText?: string;
  platform: string;
  performance: number;
  commentsCount: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  createdAt?: string;
};

type TopPerformingAdsProps = {
  ads: Ad[];
  loading?: boolean;
};

export default function TopPerformingAds({ ads, loading = false }: TopPerformingAdsProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'performance', desc: true },
  ]);

  const columnHelper = createColumnHelper<Ad>();
  
  const columns = useMemo(
    () => [
      columnHelper.accessor('adImage', {
        header: '',
        cell: (info) => (
          <div className="relative w-12 h-12 rounded overflow-hidden">
            {info.getValue() ? (
              <Image
                src={info.getValue() || '/placeholder-ad.png'}
                alt="Ad thumbnail"
                fill
                sizes="48px"
                style={{ objectFit: 'cover' }}
                className="rounded"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                Ad
              </div>
            )}
          </div>
        ),
        enableSorting: false,
      }),
      columnHelper.accessor('brandName', {
        header: 'Brand',
        cell: (info) => (
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('adText', {
        header: 'Ad Content',
        cell: (info) => (
          <div className="max-w-sm truncate">
            {info.getValue() || 'No content available'}
          </div>
        ),
        enableSorting: false,
      }),
      columnHelper.accessor('platform', {
        header: 'Platform',
        cell: (info) => (
          <div className="px-2 py-1 rounded-full text-xs inline-flex items-center bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('commentsCount', {
        header: 'Comments',
        cell: (info) => {
          const value = info.getValue();
          return value !== undefined && value !== null ? value.toLocaleString() : '0';
        },
      }),
      columnHelper.accessor('performance', {
        header: 'Performance',
        cell: (info) => {
          const value = info.getValue();
          
          if (value === undefined || value === null) {
            return <span className="text-gray-500">N/A</span>;
          }
          
          let color = 'text-gray-500';
          let icon = <MinusCircle size={16} className="mr-1" />;
          
          if (value > 70) {
            color = 'text-green-500';
            icon = <ArrowUpCircle size={16} className="mr-1" />;
          } else if (value < 30) {
            color = 'text-red-500';
            icon = <ArrowDownCircle size={16} className="mr-1" />;
          }
          
          return (
            <div className={`flex items-center ${color}`}>
              {icon}
              <span>{value}%</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('positivePercentage', {
        header: 'Positive',
        cell: (info) => {
          const value = info.getValue();
          if (value === undefined || value === null) {
            return <span className="text-gray-500">N/A</span>;
          }
          
          return (
            <div className="flex items-center">
              <PositiveIcon />
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mx-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${value}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium">{value}%</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('negativePercentage', {
        header: 'Negative',
        cell: (info) => {
          const value = info.getValue();
          if (value === undefined || value === null) {
            return <span className="text-gray-500">N/A</span>;
          }
          
          return (
            <div className="flex items-center">
              <NegativeIcon />
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mx-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${value}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium">{value}%</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('neutralPercentage', {
        header: 'Neutral',
        cell: (info) => {
          const value = info.getValue();
          if (value === undefined || value === null) {
            return <span className="text-gray-500">N/A</span>;
          }
          
          return (
            <div className="flex items-center">
              <NeutralIcon />
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mx-2">
                <div
                  className="bg-gray-400 h-2 rounded-full"
                  style={{ width: `${value}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium">{value}%</span>
            </div>
          );
        },
      }),
    ],
    [columnHelper]
  );

  const table = useReactTable({
    data: ads,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 overflow-hidden animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        {[...Array(5)].map((_, index) => (
          <div key={index} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-md mb-2"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performing Ads</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Ranked by engagement and sentiment</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none flex items-center'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-sm text-center text-gray-500 dark:text-gray-400"
                >
                  No ads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 