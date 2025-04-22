// App configuration with environment variables

// Base URL of the application, defaults to localhost in development
export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper function to get the full URL for a report
export function getReportUrl(reportId: string): string {
  return `${BASE_URL}/reports/${reportId}`;
} 