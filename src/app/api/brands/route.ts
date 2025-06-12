import { NextResponse } from 'next/server';
import { fetchBrands, fetchAdsByBrand, fetchCommentsByBrand } from '@/lib/supabase-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  try {
    // If no brand ID is provided, return the list of all brands
    if (!id) {
      const brands = await fetchBrands();
      
      return NextResponse.json({
        brands,
        count: brands.length,
        timestamp: new Date().toISOString()
      });
    }
    
    // If brand ID is provided, return details for that brand
    const ads = await fetchAdsByBrand(id);
    const comments = await fetchCommentsByBrand(id);
    
    // Calculate sentiment distribution
    const positiveCount = comments.filter(c => c.sentiment === 'positive').length;
    const negativeCount = comments.filter(c => c.sentiment === 'negative').length;
    const neutralCount = comments.length - positiveCount - negativeCount;
    
    const positivePercent = comments.length ? (positiveCount / comments.length) * 100 : 0;
    const negativePercent = comments.length ? (negativeCount / comments.length) * 100 : 0;
    const neutralPercent = comments.length ? (neutralCount / comments.length) * 100 : 0;
    
    // Count comments by theme
    const themeCount = comments.reduce((counts, comment) => {
      if (comment.theme) {
        counts[comment.theme] = (counts[comment.theme] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);
    
    // Sort themes by count
    const sortedThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // Return brand data
    return NextResponse.json({
      brand: id,
      summary: {
        totalAds: ads.length,
        totalComments: comments.length,
        sentimentDistribution: {
          positive: positivePercent,
          negative: negativePercent,
          neutral: neutralPercent
        },
        topThemes: sortedThemes.map(([theme, count]) => ({
          theme,
          count,
          percentage: (count / comments.length) * 100
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in brands API route:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch brand data'
    }, {
      status: 500
    });
  }
} 