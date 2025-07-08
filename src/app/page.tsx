'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center px-4 py-20 max-w-xl animate-fadeIn">
        <img src="/logo.png" alt="Ad Analyzer Logo" className="mx-auto mb-8 w-24 h-24 animate-pulse" />
        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
          Ad Analyzer
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
          Unlock deep insights from your ad comments with AI-powered sentiment analysis.
        </p>
        <Link
          href="/auth?mode=signup"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform hover:-translate-y-1 transition-all duration-300"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
