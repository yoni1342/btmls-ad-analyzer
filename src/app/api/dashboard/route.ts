import { NextResponse } from 'next/server';

// Import the dashboards map from the shared store
import { dashboards } from './dashboardStore';

// Sample dashboard data
const defaultDashboardData = {
  title: "Sales Performance Dashboard",
  metrics: [
    { id: "total_sales", label: "Total Sales", value: 124500, change: 12.5 },
    { id: "conversion_rate", label: "Conversion Rate", value: 3.2, change: -0.5 },
    { id: "avg_order", label: "Average Order Value", value: 85.4, change: 2.3 },
    { id: "customers", label: "Total Customers", value: 1450, change: 5.7 }
  ],
  timeSeriesData: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    datasets: [
      {
        name: "Revenue",
        data: [12000, 19000, 15000, 20000, 25000, 22000, 30000, 29000, 32000, 35000, 40000, 41000]
      },
      {
        name: "Profit",
        data: [5000, 8000, 6000, 9000, 12000, 10000, 15000, 14000, 16000, 18000, 21000, 22000]
      }
    ]
  },
  tableData: {
    headers: ["Product", "Units Sold", "Revenue", "Profit"],
    rows: [
      { id: 1, values: ["Product A", 1245, "$15,560", "$6,224"] },
      { id: 2, values: ["Product B", 986, "$12,325", "$4,930"] },
      { id: 3, values: ["Product C", 1752, "$21,900", "$8,760"] },
      { id: 4, values: ["Product D", 657, "$8,212", "$3,285"] },
      { id: 5, values: ["Product E", 1120, "$14,000", "$5,600"] }
    ]
  },
  pieChartData: {
    labels: ["Product A", "Product B", "Product C", "Product D", "Product E"],
    values: [25, 20, 35, 13, 22]
  }
};

export async function GET(request: Request) {
  // Get the dashboard ID from the URL query params
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  // If no ID is provided or the ID is 'default', return the sample data
  if (!id || id === 'default') {
    return NextResponse.json({
      id: 'default',
      data: defaultDashboardData,
      timestamp: new Date().toISOString()
    });
  }
  
  // Try to find the dashboard with the given ID
  const dashboardData = dashboards.get(id);
  
  // If the dashboard is not found, return a 404 error
  if (!dashboardData) {
    return NextResponse.json({
      error: 'Dashboard not found'
    }, {
      status: 404
    });
  }
  
  // Return the dashboard data
  return NextResponse.json({
    id,
    data: dashboardData,
    timestamp: new Date().toISOString()
  });
} 