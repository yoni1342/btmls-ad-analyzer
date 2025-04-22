import { NextResponse } from 'next/server';
import { getReportUrl } from '@/config';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  context: any
) {
  try {
    const id = context.params.id;
    
    // Validate ID format (basic validation to prevent path traversal)
    if (!id || /[^a-zA-Z0-9-]/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid report ID format' },
        { status: 400 }
      );
    }
    
    // Fetch report data from Supabase
    const { data: reportData, error } = await supabase
      .from('reports')
      .select('data')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Supabase returns PGRST116 for "no rows returned"
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }
      throw new Error(`Error fetching report: ${error.message}`);
    }
    
    if (!reportData) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // Get the report URL
    const reportUrl = getReportUrl(id);
    
    // Add the report URL to the response
    return NextResponse.json({ 
      ...reportData.data,
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