import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// In a real application, this would be a database
// For demonstration, we'll use an in-memory store - moved to a separate file
import { dashboards } from '@/lib/dashboard-store';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate the data (basic validation)
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid dashboard data' }, { status: 400 });
    }
    
    // Generate a unique ID for the dashboard
    const dashboardId = uuidv4();
    
    // Store the dashboard data
    dashboards.set(dashboardId, {
      ...data,
      createdAt: new Date().toISOString()
    });
    
    // In a real application, you would store this in a database
    console.log(`Created dashboard with ID: ${dashboardId}`);
    
    // Return the dashboard ID
    return NextResponse.json({ 
      success: true, 
      dashboardId, 
      message: 'Dashboard created successfully',
      url: `/dashboard?id=${dashboardId}`
    });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json({ 
      error: 'Failed to create dashboard' 
    }, { 
      status: 500 
    });
  }
} 