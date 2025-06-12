'use client';

import { ReactNode } from 'react';

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  height?: string;
  className?: string;
  actions?: ReactNode;
};

export default function ChartCard({
  title,
  subtitle,
  children,
  loading = false,
  height = 'h-80',
  className = '',
  actions
}: ChartCardProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex space-x-2">
            {actions}
          </div>
        )}
      </div>
      
      {loading ? (
        <div className={`${height} flex items-center justify-center`}>
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <div className={height}>
          {children}
        </div>
      )}
    </div>
  );
} 