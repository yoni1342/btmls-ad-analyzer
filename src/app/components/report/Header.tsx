export type HeaderProps = {
  brand: string;
  totalAds: number;
  totalComments: number;
};

export default function Header({ brand, totalAds, totalComments }: HeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <h1 className="text-2xl font-bold">{brand} Ad Analytics</h1>
        <div className="mt-2 md:mt-0">
          <button
            onClick={() => window.print()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Export Report
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Ads</div>
          <div className="text-3xl font-bold">{totalAds}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Comments</div>
          <div className="text-3xl font-bold">{totalComments}</div>
        </div>
      </div>
    </div>
  );
} 