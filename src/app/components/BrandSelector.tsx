'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchBrands } from '@/lib/supabase-service';

type BrandSelectorProps = {
  selectedBrand?: string;
  onSelectBrand?: (brand: string) => void;
  displayAs?: 'dropdown' | 'cards' | 'list';
};

export default function BrandSelector({
  selectedBrand,
  onSelectBrand,
  displayAs = 'cards'
}: BrandSelectorProps) {
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        setLoading(true);
        const brandsData = await fetchBrands();
        setBrands(brandsData);
      } catch (err) {
        setError('Failed to load brands');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadBrands();
  }, []);

  const handleSelectBrand = (brand: string) => {
    if (onSelectBrand) {
      onSelectBrand(brand);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          <span>Loading brands...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md text-red-500">
        {error}
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
        No brands available.
      </div>
    );
  }

  if (displayAs === 'dropdown') {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Select Brand
        </label>
        <select
          value={selectedBrand || ''}
          onChange={(e) => handleSelectBrand(e.target.value)}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">All Brands</option>
          {brands.map(brand => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
      </div>
    );
  }

  if (displayAs === 'list') {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
        <h3 className="text-lg font-medium mb-3">Brands</h3>
        <ul className="space-y-1">
          {brands.map(brand => (
            <li key={brand}>
              <Link
                href={`/brands?id=${encodeURIComponent(brand)}`}
                className={`block px-3 py-2 rounded-md ${
                  selectedBrand === brand
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleSelectBrand(brand)}
              >
                {brand}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Default: cards display
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {brands.map(brand => (
        <Link
          key={brand}
          href={`/brands?id=${encodeURIComponent(brand)}`}
          onClick={() => handleSelectBrand(brand)}
          className={`block p-4 rounded-xl shadow-md transition-transform hover:scale-105 ${
            selectedBrand === brand
              ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900 dark:border-blue-700'
              : 'bg-white dark:bg-slate-800'
          }`}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-2xl">{brand.charAt(0)}</span>
            </div>
            <h3 className="font-medium">{brand}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
} 