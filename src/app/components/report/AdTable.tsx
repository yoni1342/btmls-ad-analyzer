'use client';

import { useState, useRef, useEffect } from 'react';
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
  image_url?: string;
  video_url?: string;
  post_link?: string;
  comments?: any[];
}

type AdTableProps = {
  ads: Ad[];
  selectedAdIds?: string[];
  onSelectedAdIdsChange?: (ids: string[]) => void;
};

export default function AdTable({ ads, selectedAdIds: controlledSelectedAdIds, onSelectedAdIdsChange }: AdTableProps) {
  // Support both controlled and uncontrolled selection
  const [uncontrolledSelectedAdIds, setUncontrolledSelectedAdIds] = useState<string[]>([]);
  const selectedAdIds = controlledSelectedAdIds ?? uncontrolledSelectedAdIds;
  const setSelectedAdIds = onSelectedAdIdsChange ?? setUncontrolledSelectedAdIds;

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

  const columnHelper = createColumnHelper<Ad>();

  const columns = [
    {
      id: 'select',
      header: () => <input
        ref={checkboxRef}
        type="checkbox"
        checked={ads.length > 0 && selectedAdIds.length === ads.length}
        onChange={e => {
          if (e.target.checked) {
            setSelectedAdIds(ads.map(ad => ad.ad_id));
          } else {
            setSelectedAdIds([]);
          }
        }}
      />,
      cell: ({ row }: any) => (
        <input
          type="checkbox"
          checked={selectedAdIds.includes(row.original.ad_id)}
          onChange={e => {
            const id = row.original.ad_id;
            if (e.target.checked) {
              setSelectedAdIds([...selectedAdIds, id]);
            } else {
              setSelectedAdIds(selectedAdIds.filter(selectedId => selectedId !== id));
            }
          }}
          onClick={e => e.stopPropagation()}
        />
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
    columnHelper.accessor('image_url', {
      header: 'Image',
      cell: info => {
        const imageUrl = info.getValue();
        return imageUrl ? (
          <button
            onClick={() => setLightboxImage(imageUrl)}
            className="w-16 h-16 bg-gray-100 rounded overflow-hidden inline-flex items-center justify-center"
          >
            <img 
              src={imageUrl} 
              alt="Ad thumbnail" 
              className="max-h-full max-w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=No+Image';
              }}
            />
          </button>
        ) : 'No image';
      },
    }),
    columnHelper.accessor('video_url', {
      header: 'Video',
      cell: info => {
        const videoUrl = info.getValue();
        return videoUrl ? (
          <button
            onClick={() => setVideoModalUrl(videoUrl)}
            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs"
          >
            Play Video
          </button>
        ) : 'No video';
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
    columnHelper.accessor('comments', {
      header: 'Comments',
      cell: info => (info.getValue()?.length || 0) + ' comments',
    })
  ];

  const table = useReactTable({
    data: ads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = selectedAdIds.length > 0 && selectedAdIds.length < ads.length;
    }
  }, [selectedAdIds.length, ads.length]);

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
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedAdIds.includes(row.original.ad_id) ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                onClick={() => {
                  const id = row.original.ad_id;
                  if (selectedAdIds.includes(id)) {
                    setSelectedAdIds(selectedAdIds.filter(selectedId => selectedId !== id));
                  } else {
                    setSelectedAdIds([...selectedAdIds, id]);
                  }
                }}
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

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setLightboxImage(null)}>
          <div className="max-w-3xl max-h-[90vh] p-4 bg-white rounded-lg">
            <img src={lightboxImage} alt="Ad" className="max-h-full max-w-full" />
            <button 
              className="absolute top-4 right-4 bg-white rounded-full p-2"
              onClick={() => setLightboxImage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {videoModalUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setVideoModalUrl(null)}>
          <div className="max-w-3xl max-h-[90vh] p-4 bg-white rounded-lg">
            <video 
              src={videoModalUrl} 
              controls 
              autoPlay
              className="max-h-full max-w-full"
            />
            <button 
              className="absolute top-4 right-4 bg-white rounded-full p-2"
              onClick={(e) => {
                e.stopPropagation();
                setVideoModalUrl(null);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 