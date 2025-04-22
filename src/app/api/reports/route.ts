import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getReportUrl } from '@/config';
import { supabase } from '@/lib/supabase';

// Report metadata interface
interface Report {
  id: string;
  title: string;
  brand: string;
  created: string;
  adCount: number;
}

// Get all reports
export async function GET() {
  try {
    // Fetch report metadata from Supabase
    const { data: reports, error } = await supabase
      .from('report_metadata')
      .select('*')
      .order('created', { ascending: false });
    
    if (error) {
      throw new Error(`Error fetching reports: ${error.message}`);
    }
    
    // Add report URLs to each report
    const reportsWithUrls = reports.map(report => ({
      ...report,
      reportUrl: getReportUrl(report.id)
    }));
    
    return NextResponse.json({ reports: reportsWithUrls });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
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
      adcount: body.data.ads.length
    };
    
    // Insert report metadata into Supabase
    const { error: metadataError } = await supabase
      .from('report_metadata')
      .insert(reportMetadata);
    
    if (metadataError) {
      throw new Error(`Error inserting report metadata: ${metadataError.message}`);
    }
    
    // Insert report data into Supabase
    const { error: dataError } = await supabase
      .from('reports')
      .insert({
        id: reportId,
        data: body.data
      });
    
    if (dataError) {
      throw new Error(`Error inserting report data: ${dataError.message}`);
    }
    
    // Get the full URL for the report
    const reportUrl = getReportUrl(reportId);
    
    // Return both the report ID and URL
    return NextResponse.json({ reportId, reportUrl });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
} 