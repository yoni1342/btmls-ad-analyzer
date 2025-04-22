import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getReportUrl } from '@/config';

// Directory where reports are stored
const REPORTS_DIR = path.join(process.cwd(), 'data', 'reports');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the ID from params (which is now a Promise in Next.js 15)
    const { id } = await params;
    
    // Validate ID format (basic validation to prevent path traversal)
    if (!id || /[^a-zA-Z0-9-]/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid report ID format' },
        { status: 400 }
      );
    }
    
    // Path to the report file
    const reportPath = path.join(REPORTS_DIR, `${id}.json`);
    
    // Check if report exists
    if (!fs.existsSync(reportPath)) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // Read and parse the report data
    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    // Get the report URL
    const reportUrl = getReportUrl(id);
    
    // Add the report URL to the response
    return NextResponse.json({ 
      ...reportData,
      _metadata: {
        reportUrl
      }
    });
  } catch (error) {
    console.error(`Error fetching report:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
} 