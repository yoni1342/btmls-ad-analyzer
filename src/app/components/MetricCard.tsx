'use client';

type MetricCardProps = {
  title: string;
  value: number | string;
  change?: number;
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'currency';
  loading?: boolean;
};

export default function MetricCard({
  title,
  value,
  change,
  icon,
  format = 'number',
  loading = false
}: MetricCardProps) {
  
  const formattedValue = () => {
    if (loading) return '—';
    
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      default:
        return value.toLocaleString();
    }
  };

  const getChangeColor = (changeValue: number) => {
    if (changeValue === 0) return 'text-gray-500';
    if (title.toLowerCase().includes('negative') || title.toLowerCase().includes('neutral')) {
      // For negative metrics like "Negative Sentiment", lower is better
      return changeValue < 0 ? 'text-green-500' : 'text-red-500';
    }
    // For other metrics, higher is better
    return changeValue > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getChangeSymbol = (changeValue: number) => {
    if (changeValue === 0) return '•';
    if (title.toLowerCase().includes('negative') || title.toLowerCase().includes('neutral')) {
      return changeValue < 0 ? '↓' : '↑';
    }
    return changeValue > 0 ? '↑' : '↓';
  };

  const renderChange = () => {
    if (change === undefined || loading) return null;
    
    // If no previous data and value is zero, show "N/A"
    if (change === 0 && value === 0) {
      return (
        <div className="flex items-center mt-1">
          <span className="text-sm font-medium text-gray-500">—</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            vs previous period
          </span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center mt-1">
        <span className={`text-sm font-medium ${getChangeColor(change)}`}>
          {getChangeSymbol(change)} {Math.abs(change).toFixed(1)}%
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
          vs previous period
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-bold">
            {loading ? (
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            ) : (
              formattedValue()
            )}
          </h3>
          
          {renderChange()}
        </div>
        
        {icon && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
} 