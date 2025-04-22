import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getReportUrl } from '@/config';

// Directory to store reports
const REPORTS_DIR = path.join(process.cwd(), 'data', 'reports');

// Report metadata interface
interface Report {
  id: string;
  title: string;
  brand: string;
  created: string;
  adCount: number;
}

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Get list of reports
export async function GET() {
  try {
    // Read report index file or create one if it doesn't exist
    const indexPath = path.join(REPORTS_DIR, 'index.json');
    
    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(indexPath, JSON.stringify({ reports: [] }));
      return NextResponse.json({ reports: [] });
    }
    
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    // Add report URLs to each report
    const reportsWithUrls = indexData.reports.map((report: Report) => ({
      ...report,
      reportUrl: getReportUrl(report.id)
    }));
    
    return NextResponse.json({ reports: reportsWithUrls });
  } catch (error) {
    console.error('Error getting reports:', error);
    return NextResponse.json({ error: 'Failed to get reports' }, { status: 500 });
  }
}

// Create a new report
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.title || !body.data) {
      return NextResponse.json(
        { error: 'Missing required fields: title and data' },
        { status: 400 }
      );
    }
    
    // Validate data has the expected structure
    if (!body.data.brand || !Array.isArray(body.data.ads)) {
      return NextResponse.json(
        { error: 'Data must include "brand" and "ads" array' },
        { status: 400 }
      );
    }
    
    // Generate a unique ID
    const reportId = uuidv4();
    
    // Create report metadata
    const reportMetadata = {
      id: reportId,
      title: body.title,
      brand: body.data.brand,
      created: new Date().toISOString(),
      adCount: body.data.ads.length
    };
    
    // Save the report data
    const reportDataPath = path.join(REPORTS_DIR, `${reportId}.json`);
    fs.writeFileSync(reportDataPath, JSON.stringify(body.data, null, 2));
    
    // Update the index file
    const indexPath = path.join(REPORTS_DIR, 'index.json');
    let indexData;
    
    if (fs.existsSync(indexPath)) {
      indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } else {
      indexData = { reports: [] };
    }
    
    indexData.reports.push(reportMetadata);
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    
    // Get the full URL for the report
    const reportUrl = getReportUrl(reportId);
    
    // Return both the report ID and URL
    return NextResponse.json({ reportId, reportUrl });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
} 