'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Dashboard from '../components/Dashboard';

function DashboardContent() {
  const searchParams = useSearchParams();
  const dashboardId = searchParams.get('id') || 'default';
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Dashboard dashboardId={dashboardId} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 px-4">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
} 