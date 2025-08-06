import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { Comment } from '@/lib/supabase-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
        brandId,
        adIds,
        sentiment,
        cluster,
        angel,
        searchQuery,
        startDate,
        endDate
    } = body;

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    const { data: comments, error } = await supabase.rpc('get_filtered_data', {
        brand_id_param: brandId,
        ad_ids_param: adIds && adIds.length > 0 ? adIds : null,
        sentiment_param: sentiment || null,
        cluster_param: cluster || null,
        angel_param: angel || null,
        search_query_param: searchQuery || null,
        start_date_param: startDate || null,
        end_date_param: endDate || null
    });

    if (error) {
        console.error('Error calling get_filtered_data function:', error);
        throw new Error('Failed to fetch filtered data');
    }
    
    const safeComments = comments || [];

    // Prepare Comments sheet  
    const commentsSheet = safeComments.map((c: Comment) => {
      return {
        CommentID: c.comment_id,
        AdID: c.ad_id,
        Message: c.message,
        Sentiment: c.sentiment,
        Cluster: c.meta_cluster || '',
        AngelType: c['Angel Type'] || c.angle_type || '',
        CreatedTime: c.created_time,
      };
    });

    // Build workbook
    const wb = XLSX.utils.book_new();
    const wsComments = XLSX.utils.json_to_sheet(commentsSheet);
    XLSX.utils.book_append_sheet(wb, wsComments, 'Filtered Comments');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `filtered-comments.xlsx`;

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error exporting comments:', error);
    return NextResponse.json({ error: 'Failed to export comments' }, { status: 500 });
  }
}
  