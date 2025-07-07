'use client';

import { useState } from 'react';
import Link from 'next/link';

type BrandSelectorProps = {
  brands: { id: string; brand_name: string }[];
  selectedBrand?: { id: string; brand_name: string };
  onSelectBrand: (brand: { id: string; brand_name: string }) => void;
  displayAs?: 'dropdown' | 'cards' | 'list';
};

export default function BrandSelector({
  brands,
  selectedBrand,
  onSelectBrand,
  displayAs = 'cards'
}: BrandSelectorProps) {

  const handleSelectBrand = (brandId: string) => {
  if (brandId === '') {
  onSelectBrand({ id: '', brand_name: 'All Brands' });
  return;
  }
  const brand = brands.find(b => b.id.toString() === brandId);
  if (brand) {
  onSelectBrand({ ...brand });
  }
  };

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
          value={selectedBrand?.id || ''}
          onChange={(e) => handleSelectBrand(e.target.value)}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">All Brands</option>
          {brands.map(brand => (
            <option key={brand.id} value={brand.id}>{brand.brand_name}</option>
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
            <li key={brand.id}>
              <Link
                href={`/brands?id=${encodeURIComponent(brand.id)}`}
                className={`block px-3 py-2 rounded-md ${
                  selectedBrand?.id === brand.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleSelectBrand(brand.id)}
              >
                {brand.brand_name}
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
          key={brand.id}
          href={`/brands?id=${encodeURIComponent(brand.id)}`}
          onClick={() => handleSelectBrand(brand.id)}
          className={`block p-4 rounded-xl shadow-md transition-transform hover:scale-105 ${
            selectedBrand?.id === brand.id
              ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900 dark:border-blue-700'
              : 'bg-white dark:bg-slate-800'
          }`}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-2xl">{brand.brand_name.charAt(0)}</span>
            </div>
            <h3 className="font-medium">{brand.brand_name}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
}