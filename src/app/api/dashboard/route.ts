import { NextResponse } from 'next/server';
import { fetchAds, fetchComments, fetchDashboardMetrics, fetchAdsByBrand, fetchCommentsByBrand } from '@/lib/supabase-service';
import { Ad } from '@/app/components/TopPerformingAds';

// Helper function to filter comments by date range
function filterCommentsByDateRange(comments: any[], startDate: Date, endDate: Date) {
  // Special case for lifetime filter (if start date is around Jan 1, 1970)
  const isLifetimeFilter = startDate.getFullYear() < 1980;
  
  if (isLifetimeFilter) {
    // For lifetime filter, only filter by end date (current date)
    return comments.filter(comment => {
      if (!comment.created_time) return false;
      const commentDate = new Date(comment.created_time);
      return commentDate <= endDate;
    });
  }
  
  // Regular date range filtering
  return comments.filter(comment => {
    if (!comment.created_time) return false;
    const commentDate = new Date(comment.created_time);
    return commentDate >= startDate && commentDate <= endDate;
  });
}

// Helper function to filter ads by date range
function filterAdsByDateRange(ads: any[], startDate: Date, endDate: Date) {
  // Special case for lifetime filter (if start date is around Jan 1, 1970)
  const isLifetimeFilter = startDate.getFullYear() < 1980;
  
  if (isLifetimeFilter) {
    // For lifetime filter, only filter by end date (current date)
    return ads.filter(ad => {
      if (!ad.created_at) return false;
      const adDate = new Date(ad.created_at);
      return adDate <= endDate;
    });
  }
  
  // Regular date range filtering
  return ads.filter(ad => {
    if (!ad.created_at) return false;
    const adDate = new Date(ad.created_at);
    return adDate >= startDate && adDate <= endDate;
  });
}

// Helper function to filter comments by sentiment
function filterCommentsBySentiment(comments: any[], sentiment: string) {
  if (sentiment === 'all') return comments;
  return comments.filter(comment => comment.sentiment === sentiment);
}

// Helper function to filter by search query
function filterBySearchQuery(comments: any[], ads: any[], query: string) {
  const lowerQuery = query.toLowerCase();
  
  // Filter comments that contain the search query in content or theme
  const filteredComments = comments.filter(comment => 
    (comment.content && comment.content.toLowerCase().includes(lowerQuery)) ||
    (comment.theme && comment.theme.toLowerCase().includes(lowerQuery))
  );
  
  // Filter ads that contain the search query in name or content
  const filteredAds = ads.filter(ad => 
    (ad.ad_name && ad.ad_name.toLowerCase().includes(lowerQuery)) ||
    (ad.ad_creative_body && ad.ad_creative_body.toLowerCase().includes(lowerQuery)) ||
    (ad.brand && ad.brand.toLowerCase().includes(lowerQuery))
  );
  
  // If we're filtering ads, only include comments from those ads
  if (filteredAds.length > 0) {
    const adIds = filteredAds.map(ad => ad.ad_id);
    return {
      comments: filteredComments.concat(
        comments.filter(comment => adIds.includes(comment.ad_id))
      ),
      ads: filteredAds
    };
  }
  
  return {
    comments: filteredComments,
    ads: ads
  };
}

// Helper function to calculate percentage change between two periods
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Default dashboard fetching function
async function getDefaultDashboardData(
  startDate?: Date, 
  endDate?: Date, 
  sentimentFilter?: string,
  searchQuery?: string
) {
  try {
    // Fetch global data
    let ads = await fetchAds();
    let comments = await fetchComments();
    
    console.log(`Initial data: ${ads.length} ads, ${comments.length} comments`);
    
    // Check if this is a lifetime filter
    const isLifetimeFilter = startDate && startDate.getFullYear() < 1980;
    if (isLifetimeFilter) {
      console.log('Lifetime filter detected - not filtering by start date');
    }
    
    // Calculate previous period data for comparison
    let previousStartDate, previousEndDate;
    if (startDate && endDate && !isLifetimeFilter) {
      const periodDuration = endDate.getTime() - startDate.getTime();
      previousStartDate = new Date(startDate.getTime() - periodDuration);
      previousEndDate = new Date(startDate.getTime() - 1); // Day before current period
    } else if (isLifetimeFilter && endDate) {
      // For lifetime filter, set previous period to same length of time before now
      const now = new Date();
      const periodDuration = now.getTime() - startDate.getTime();
      previousStartDate = new Date(0); // Start of time
      previousEndDate = new Date(startDate.getTime() - 1); // Day before lifetime started
    }
    
    // Get previous period comments
    let previousPeriodComments = [];
    if (previousStartDate && previousEndDate) {
      previousPeriodComments = filterCommentsByDateRange(comments, previousStartDate, previousEndDate);
      
      // Apply other filters to previous period data
      if (sentimentFilter && sentimentFilter !== 'all') {
        previousPeriodComments = filterCommentsBySentiment(previousPeriodComments, sentimentFilter);
      }
      
      if (searchQuery) {
        const filtered = filterBySearchQuery(previousPeriodComments, ads, searchQuery);
        previousPeriodComments = filtered.comments;
      }
    }
    
    // Apply filters to current period data
    let filteredComments = [...comments]; // Create a copy for filtering
    let filteredAds = [...ads]; // Create a copy for filtering
    
    if (startDate && endDate) {
      filteredComments = filterCommentsByDateRange(filteredComments, startDate, endDate);
      filteredAds = filterAdsByDateRange(filteredAds, startDate, endDate);
    }
    
    if (sentimentFilter && sentimentFilter !== 'all') {
      filteredComments = filterCommentsBySentiment(filteredComments, sentimentFilter);
    }
    
    if (searchQuery) {
      const filtered = filterBySearchQuery(filteredComments, filteredAds, searchQuery);
      filteredComments = filtered.comments;
      filteredAds = filtered.ads;
    }
    
    // Log total number of filtered ads before further processing
    console.log(`Total filtered ads before processing: ${filteredAds.length}`);
    
    // Get top ads based on comment count
    const adCommentCounts = filteredAds.reduce((counts, ad) => {
      const commentCount = filteredComments.filter(c => c.ad_id === ad.ad_id).length;
      counts.push({ ad, commentCount });
      return counts;
    }, [] as { ad: any; commentCount: number }[]);
    
    // Sort by comment count and get top 5
    const topAds = adCommentCounts
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, 5);
    
    // Calculate current period metrics
    const totalComments = filteredComments.length;
    
    // Normalize sentiment values to lowercase for consistent comparison
    const totalPositive = filteredComments.filter(c => 
      c.sentiment && c.sentiment.toLowerCase() === 'positive'
    ).length;
    
    const totalNegative = filteredComments.filter(c => 
      c.sentiment && c.sentiment.toLowerCase() === 'negative'
    ).length;
    
    const totalNeutral = filteredComments.length - totalPositive - totalNegative;
    
    // Calculate previous period metrics
    const prevTotalComments = previousPeriodComments.length;
    const prevTotalPositive = previousPeriodComments.filter(c => 
      c.sentiment && c.sentiment.toLowerCase() === 'positive'
    ).length;
    
    const prevTotalNegative = previousPeriodComments.filter(c => 
      c.sentiment && c.sentiment.toLowerCase() === 'negative'
    ).length;
    
    const prevTotalNeutral = prevTotalComments - prevTotalPositive - prevTotalNegative;
    
    // Calculate sentiment percentages
    const totalCommentsNonZero = totalComments || 1; // Avoid division by zero
    const positivePct = (totalPositive / totalCommentsNonZero) * 100;
    const negativePct = (totalNegative / totalCommentsNonZero) * 100;
    const neutralPct = (totalNeutral / totalCommentsNonZero) * 100;
    
    // Calculate previous period percentages
    const prevTotalCommentsNonZero = prevTotalComments || 1; // Avoid division by zero
    const prevPositivePct = (prevTotalPositive / prevTotalCommentsNonZero) * 100;
    const prevNegativePct = (prevTotalNegative / prevTotalCommentsNonZero) * 100;
    const prevNeutralPct = (prevTotalNeutral / prevTotalCommentsNonZero) * 100;
    
    // Calculate percentage changes
    const commentsChange = calculatePercentageChange(totalComments, prevTotalComments);
    const adsChange = calculatePercentageChange(filteredAds.length, 0); // Simplified for now
    const positivePctChange = calculatePercentageChange(positivePct, prevPositivePct);
    const negativePctChange = calculatePercentageChange(negativePct, prevNegativePct);
    const neutralPctChange = calculatePercentageChange(neutralPct, prevNeutralPct);
    
    // Sample time data
    // Determine time labels based on date range
    let timeLabels: string[] = [];
    if (startDate && endDate) {
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 31) {
        // Use daily labels for ranges less than or equal to 31 days
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          timeLabels.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (daysDiff <= 90) {
        // Use weekly labels for ranges between 31 and 90 days
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          timeLabels.push(`Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
          currentDate.setDate(currentDate.getDate() + 7);
        }
      } else if (daysDiff <= 180) {
        // Use bi-weekly labels for 6-month range
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          // Create a label showing the 2-week period
          const periodEnd = new Date(currentDate);
          periodEnd.setDate(periodEnd.getDate() + 13); // End date is 13 days after start (14 days total)
          if (periodEnd > endDate) {
            periodEnd.setTime(endDate.getTime()); // Don't go beyond the actual end date
          }
          
          // Format as "Jan 1 - Jan 14"
          const startStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const endStr = periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          timeLabels.push(`${startStr} - ${endStr}`);
          
          // Move to the next period
          currentDate.setDate(currentDate.getDate() + 14);
        }
      } else {
        // Use monthly labels for ranges over 180 days
        timeLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      }
    } else {
      // Default to monthly labels
      timeLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    }
    
    // Initialize time series data arrays
    const timeSeriesData = new Array(timeLabels.length).fill(0);
    const positiveByTime = new Array(timeLabels.length).fill(0);
    const negativeByTime = new Array(timeLabels.length).fill(0);
    
    // Fill time series data based on date range
    filteredComments.forEach(comment => {
      if (comment.created_time) {
        const date = new Date(comment.created_time);
        let index = 0;
        
        if (startDate && endDate) {
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff <= 31) {
            // Daily index
            index = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          } else if (daysDiff <= 90) {
            // Weekly index
            index = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
          } else {
            // Check if it's likely a lifetime filter (start date before 1980)
            if (startDate.getFullYear() < 1980) {
              // Use yearly index for lifetime data
              const dateYear = date.getFullYear();
              const startYear = Math.max(1970, startDate.getFullYear());
              index = dateYear - startYear;
            } else {
              // Monthly index for other cases
              index = date.getMonth();
            }
          }
        } else {
          // Default to monthly index
          index = date.getMonth();
        }
        
        // Ensure index is within bounds
        if (index >= 0 && index < timeSeriesData.length) {
          timeSeriesData[index]++;
          
          if (comment.sentiment === 'positive') {
            positiveByTime[index]++;
          } else if (comment.sentiment === 'negative') {
            negativeByTime[index]++;
          }
        }
      }
    });
    
    // Count comments by theme
    const themeCount = filteredComments.reduce((counts, comment) => {
      if (comment.theme) {
        counts[comment.theme] = (counts[comment.theme] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);
    
    // Get unique angle types for pie chart
    const angleTypes = Array.from(new Set(filteredAds.map(ad => (ad as any).angle_type || 'Unknown')));
    const angleTypeData = {
      labels: angleTypes,
      datasets: [
        {
          data: angleTypes.map(type => 
            filteredAds.filter(ad => ((ad as any).angle_type || 'Unknown') === type).length
          ),
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
    
    // Extract comment clusters/themes for bar chart
    const clusters = Array.from(
      new Set(filteredComments.map(comment => (comment as any)["Cluster name"] || comment.theme || 'Unknown'))
    )
    .filter(cluster => cluster !== 'Unknown')
    .sort((a, b) => {
      // Count occurrences of each cluster
      const countA = filteredComments.filter(comment => 
        ((comment as any)["Cluster name"] || comment.theme) === a
      ).length;
      
      const countB = filteredComments.filter(comment => 
        ((comment as any)["Cluster name"] || comment.theme) === b
      ).length;
      
      return countB - countA; // Sort by count descending
    })
    .slice(0, 5); // Take top 5
    
    const clusterData = {
      labels: clusters,
      datasets: [
        {
          label: 'Comment Count',
          data: clusters.map(cluster => 
            filteredComments.filter(comment => ((comment as any)["Cluster name"] || comment.theme || 'Unknown') === cluster).length
          ),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
    
    // Calculate ads with most comments
    const adsWithMostComments = filteredAds.map(ad => ({
      ad_id: ad.ad_id,
      ad_title: ad.ad_title || ad.ad_id,
      count: filteredComments.filter(comment => comment.ad_id === ad.ad_id).length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
    
    const adCommentData = {
      labels: adsWithMostComments.map(item => item.ad_title),
      datasets: [
        {
          label: 'Comment Count',
          data: adsWithMostComments.map(item => item.count),
          backgroundColor: 'rgba(153, 102, 255, 0.7)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
        },
      ],
    };

    // Prepare all comments for the comments tab
    const allComments = filteredAds.flatMap(ad => {
      const adComments = filteredComments.filter(c => c.ad_id === ad.ad_id);
      return adComments.map(comment => ({
        ...comment,
        ad_title: ad.ad_title,
        angle_type: (ad as any).angle_type
      }));
    });

    const sortedThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Format data for the dashboard
    return {
      title: "Ad Analytics Dashboard",
  metrics: [
        { id: "total_ads", label: "Total Ads", value: filteredAds.length, change: adsChange },
        { id: "total_comments", label: "Total Comments", value: totalComments, change: commentsChange },
        { id: "positive_sentiment", label: "Positive Sentiment", value: positivePct, change: positivePctChange },
        { id: "negative_sentiment", label: "Negative Sentiment", value: negativePct, change: negativePctChange },
        { id: "neutral_sentiment", label: "Neutral Sentiment", value: neutralPct, change: neutralPctChange }
  ],
  timeSeriesData: {
        labels: timeLabels,
    datasets: [
      {
            name: "Total Comments",
            data: timeSeriesData
          },
          {
            name: "Positive Sentiment",
            data: positiveByTime
          },
          {
            name: "Negative Sentiment",
            data: negativeByTime
      }
    ]
  },
  tableData: {
        headers: ["Ad Name", "Brand", "Comments", "Positive %", "Negative %"],
        rows: topAds.map((item, index) => {
          const adComments = filteredComments.filter(c => c.ad_id === item.ad.ad_id);
          const positiveCount = adComments.filter(c => c.sentiment === 'positive').length;
          const negativeCount = adComments.filter(c => c.sentiment === 'negative').length;
          const positivePercent = adComments.length ? (positiveCount / adComments.length) * 100 : 0;
          const negativePercent = adComments.length ? (negativeCount / adComments.length) * 100 : 0;
          
          return {
            id: index + 1,
            values: [
              item.ad.ad_name || `Ad ${item.ad.ad_id.slice(0, 8)}`,
              item.ad.brand || 'Unknown',
              item.commentCount,
              `${positivePercent.toFixed(1)}%`,
              `${negativePercent.toFixed(1)}%`
            ]
          };
        })
  },
  pieChartData: {
        labels: sortedThemes.map(([theme]) => theme),
        values: sortedThemes.map(([_, count]) => count)
      },
      // New formatted data for TopPerformingAds component
      topAds: topAds.map(item => {
        const adComments = filteredComments.filter(c => c.ad_id === item.ad.ad_id);
        const positiveCount = adComments.filter(c => c.sentiment === 'positive').length;
        const negativeCount = adComments.filter(c => c.sentiment === 'negative').length;
        const neutralCount = adComments.length - positiveCount - negativeCount;
        
        const positivePercent = adComments.length ? (positiveCount / adComments.length) * 100 : 0;
        const negativePercent = adComments.length ? (negativeCount / adComments.length) * 100 : 0;
        const neutralPercent = adComments.length ? (neutralCount / adComments.length) * 100 : 0;
        
        // Calculate performance score (can be based on various factors)
        const performance = Math.min(
          Math.round(positivePercent + (item.commentCount / (topAds[0].commentCount || 1)) * 30),
          100
        );
        
        return {
          id: item.ad.ad_id,
          adAccountId: item.ad.ad_account_id,
          brandName: item.ad.brand || 'Unknown',
          adImage: item.ad.media_url,
          adText: item.ad.ad_creative_body || item.ad.ad_name,
          platform: item.ad.platform || 'Facebook',
          performance,
          commentsCount: item.commentCount,
          positivePercentage: Math.round(positivePercent),
          negativePercentage: Math.round(negativePercent),
          neutralPercentage: Math.round(neutralPercent),
          createdAt: item.ad.created_time
        } as Ad;
      }),
      extendedAnalysis: {
        angleTypeData,
        clusterData,
        adCommentData
      },
      ads: filteredAds,
      allComments
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}

// Update brand-specific dashboard data to accept the same filters
async function getBrandDashboardData(
  brand: string,
  startDate?: Date, 
  endDate?: Date, 
  sentimentFilter?: string,
  searchQuery?: string
) {
  try {
    // Fetch brand-specific data
    let ads = await fetchAdsByBrand(brand);
    let comments = await fetchCommentsByBrand(brand);
    
    console.log(`Initial brand data: ${ads.length} ads, ${comments.length} comments for brand ${brand}`);
    
    // Check if this is a lifetime filter
    const isLifetimeFilter = startDate && startDate.getFullYear() < 1980;
    if (isLifetimeFilter) {
      console.log('Lifetime filter detected for brand - not filtering by start date');
    }
    
    // Debug: Log comments and their sentiment values
    console.log(`Fetched ${comments.length} comments for brand ${brand}`);
    console.log('Sentiment distribution:');
    const sentimentCounts = comments.reduce((acc, comment) => {
      const sentiment = comment.sentiment || 'undefined';
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(sentimentCounts);
    
    // If there are no comments with sentiment, normalize the sentiment values
    if (!comments.some(c => c.sentiment)) {
      console.log('No sentiment values found in comments. Normalizing to lowercase...');
      // Try to normalize the sentiment values - they might be capitalized
      comments = comments.map(comment => {
        if (comment.sentiment) {
          // Convert to lowercase for consistency
          const normalizedSentiment = comment.sentiment.toLowerCase();
          return {
            ...comment,
            sentiment: normalizedSentiment
          };
        }
        return comment;
      });
    }
    
    // Calculate previous period data for comparison
    let previousStartDate, previousEndDate;
    if (startDate && endDate && !isLifetimeFilter) {
      const periodDuration = endDate.getTime() - startDate.getTime();
      previousStartDate = new Date(startDate.getTime() - periodDuration);
      previousEndDate = new Date(startDate.getTime() - 1); // Day before current period
    } else if (isLifetimeFilter && endDate) {
      // For lifetime filter, set previous period to same length of time before now
      const now = new Date();
      const periodDuration = now.getTime() - startDate.getTime();
      previousStartDate = new Date(0); // Start of time
      previousEndDate = new Date(startDate.getTime() - 1); // Day before lifetime started
    }
    
    // Get previous period comments
    let previousPeriodComments = [];
    if (previousStartDate && previousEndDate) {
      previousPeriodComments = filterCommentsByDateRange(comments, previousStartDate, previousEndDate);
      
      // Apply other filters to previous period data
      if (sentimentFilter && sentimentFilter !== 'all') {
        previousPeriodComments = filterCommentsBySentiment(previousPeriodComments, sentimentFilter);
      }
      
      if (searchQuery) {
        const filtered = filterBySearchQuery(previousPeriodComments, ads, searchQuery);
        previousPeriodComments = filtered.comments;
      }
    }
    
    // Apply filters to current period data
    let filteredComments = [...comments]; // Create a copy for filtering
    let filteredAds = [...ads]; // Create a copy for filtering
    
    if (startDate && endDate) {
      filteredComments = filterCommentsByDateRange(filteredComments, startDate, endDate);
      filteredAds = filterAdsByDateRange(filteredAds, startDate, endDate);
    }
    
    if (sentimentFilter && sentimentFilter !== 'all') {
      filteredComments = filterCommentsBySentiment(filteredComments, sentimentFilter);
    }
    
    if (searchQuery) {
      const filtered = filterBySearchQuery(filteredComments, filteredAds, searchQuery);
      filteredComments = filtered.comments;
      filteredAds = filtered.ads;
    }
    
    // Log total number of filtered ads before further processing
    console.log(`Total filtered ads before processing: ${filteredAds.length}`);
    
    // Get top ads based on comment count
    const adCommentCounts = filteredAds.reduce((counts, ad) => {
      const commentCount = filteredComments.filter(c => c.ad_id === ad.ad_id).length;
      counts.push({ ad, commentCount });
      return counts;
    }, [] as { ad: any; commentCount: number }[]);
    
    const topAds = adCommentCounts
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, 5);
    
    // Calculate current period metrics
    const totalComments = filteredComments.length;
    
    // Normalize sentiment values to lowercase for consistent comparison
    const totalPositive = filteredComments.filter(c => 
      c.sentiment && c.sentiment.toLowerCase() === 'positive'
    ).length;
    
    const totalNegative = filteredComments.filter(c => 
      c.sentiment && c.sentiment.toLowerCase() === 'negative'
    ).length;
    
    const totalNeutral = filteredComments.length - totalPositive - totalNegative;
    
    // Calculate previous period metrics
    const prevTotalComments = previousPeriodComments.length;
    const prevTotalPositive = previousPeriodComments.filter(c => 
      c.sentiment && c.sentiment.toLowerCase() === 'positive'
    ).length;
    
    const prevTotalNegative = previousPeriodComments.filter(c => 
      c.sentiment && c.sentiment.toLowerCase() === 'negative'
    ).length;
    
    const prevTotalNeutral = prevTotalComments - prevTotalPositive - prevTotalNegative;
    
    // Calculate sentiment percentages
    const totalCommentsNonZero = totalComments || 1; // Avoid division by zero
    const positivePct = (totalPositive / totalCommentsNonZero) * 100;
    const negativePct = (totalNegative / totalCommentsNonZero) * 100;
    const neutralPct = (totalNeutral / totalCommentsNonZero) * 100;
    
    // Calculate previous period percentages
    const prevTotalCommentsNonZero = prevTotalComments || 1; // Avoid division by zero
    const prevPositivePct = (prevTotalPositive / prevTotalCommentsNonZero) * 100;
    const prevNegativePct = (prevTotalNegative / prevTotalCommentsNonZero) * 100;
    const prevNeutralPct = (prevTotalNeutral / prevTotalCommentsNonZero) * 100;
    
    // Calculate percentage changes
    const commentsChange = calculatePercentageChange(totalComments, prevTotalComments);
    const adsChange = calculatePercentageChange(filteredAds.length, 0); // Simplified for now
    const positivePctChange = calculatePercentageChange(positivePct, prevPositivePct);
    const negativePctChange = calculatePercentageChange(negativePct, prevNegativePct);
    const neutralPctChange = calculatePercentageChange(neutralPct, prevNeutralPct);
    
    // Sample time data
    // Determine time labels based on date range
    let timeLabels: string[] = [];
    if (startDate && endDate) {
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 31) {
        // Use daily labels for ranges less than or equal to 31 days
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          timeLabels.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (daysDiff <= 90) {
        // Use weekly labels for ranges between 31 and 90 days
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          timeLabels.push(`Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
          currentDate.setDate(currentDate.getDate() + 7);
        }
      } else {
        // For lifetime filter or any date range over 90 days
        // Check if it's likely a lifetime filter (start date before 1980)
        if (startDate.getFullYear() < 1980) {
          // Use yearly labels for lifetime data
          const startYear = Math.max(1970, startDate.getFullYear());
          const endYear = endDate.getFullYear();
          
          for (let year = startYear; year <= endYear; year++) {
            timeLabels.push(`${year}`);
          }
        } else {
          // Use monthly labels for date ranges over 90 days
          timeLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        }
      }
    } else {
      // Default to monthly labels
      timeLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    }
    
    // Initialize time series data arrays
    const timeSeriesData = new Array(timeLabels.length).fill(0);
    const positiveByTime = new Array(timeLabels.length).fill(0);
    const negativeByTime = new Array(timeLabels.length).fill(0);
    
    // Fill time series data based on date range
    filteredComments.forEach(comment => {
      if (comment.created_time) {
        const date = new Date(comment.created_time);
        let index = 0;
        
        if (startDate && endDate) {
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff <= 31) {
            // Daily index
            index = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          } else if (daysDiff <= 90) {
            // Weekly index
            index = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
          } else {
            // Check if it's likely a lifetime filter (start date before 1980)
            if (startDate.getFullYear() < 1980) {
              // Use yearly index for lifetime data
              const dateYear = date.getFullYear();
              const startYear = Math.max(1970, startDate.getFullYear());
              index = dateYear - startYear;
            } else {
              // Monthly index for other cases
              index = date.getMonth();
            }
          }
        } else {
          // Default to monthly index
          index = date.getMonth();
        }
        
        // Ensure index is within bounds
        if (index >= 0 && index < timeSeriesData.length) {
          timeSeriesData[index]++;
          
          if (comment.sentiment === 'positive') {
            positiveByTime[index]++;
          } else if (comment.sentiment === 'negative') {
            negativeByTime[index]++;
          }
        }
      }
    });
    
    // Count comments by theme
    const themeCount = filteredComments.reduce((counts, comment) => {
      if (comment.theme) {
        counts[comment.theme] = (counts[comment.theme] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);
    
    // Get unique angle types for pie chart
    const angleTypes = Array.from(new Set(filteredAds.map(ad => (ad as any).angle_type || 'Unknown')));
    const angleTypeData = {
      labels: angleTypes,
      datasets: [
        {
          data: angleTypes.map(type => 
            filteredAds.filter(ad => ((ad as any).angle_type || 'Unknown') === type).length
          ),
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
    
    // Extract comment clusters/themes for bar chart
    const clusters = Array.from(
      new Set(filteredComments.map(comment => (comment as any)["Cluster name"] || comment.theme || 'Unknown'))
    )
    .filter(cluster => cluster !== 'Unknown')
    .sort((a, b) => {
      // Count occurrences of each cluster
      const countA = filteredComments.filter(comment => 
        ((comment as any)["Cluster name"] || comment.theme) === a
      ).length;
      
      const countB = filteredComments.filter(comment => 
        ((comment as any)["Cluster name"] || comment.theme) === b
      ).length;
      
      return countB - countA; // Sort by count descending
    })
    .slice(0, 5); // Take top 5
    
    const clusterData = {
      labels: clusters,
      datasets: [
        {
          label: 'Comment Count',
          data: clusters.map(cluster => 
            filteredComments.filter(comment => ((comment as any)["Cluster name"] || comment.theme || 'Unknown') === cluster).length
          ),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
    
    // Calculate ads with most comments
    const adsWithMostComments = filteredAds.map(ad => ({
      ad_id: ad.ad_id,
      ad_title: ad.ad_title || ad.ad_id,
      count: filteredComments.filter(comment => comment.ad_id === ad.ad_id).length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
    
    const adCommentData = {
      labels: adsWithMostComments.map(item => item.ad_title),
      datasets: [
        {
          label: 'Comment Count',
          data: adsWithMostComments.map(item => item.count),
          backgroundColor: 'rgba(153, 102, 255, 0.7)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
        },
      ],
    };

    // Prepare all comments for the comments tab
    const allComments = filteredAds.flatMap(ad => {
      const adComments = filteredComments.filter(c => c.ad_id === ad.ad_id);
      return adComments.map(comment => ({
        ...comment,
        ad_title: ad.ad_title,
        angle_type: (ad as any).angle_type
      }));
    });

    const sortedThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Format data for the dashboard
    return {
      title: `${brand} Analytics Dashboard`,
      metrics: [
        { id: "total_ads", label: "Total Ads", value: filteredAds.length, change: adsChange },
        { id: "total_comments", label: "Total Comments", value: totalComments, change: commentsChange },
        { id: "positive_sentiment", label: "Positive Sentiment", value: positivePct, change: positivePctChange },
        { id: "negative_sentiment", label: "Negative Sentiment", value: negativePct, change: negativePctChange },
        { id: "neutral_sentiment", label: "Neutral Sentiment", value: neutralPct, change: neutralPctChange }
      ],
      timeSeriesData: {
        labels: timeLabels,
        datasets: [
          {
            name: "Total Comments",
            data: timeSeriesData
          },
          {
            name: "Positive Sentiment",
            data: positiveByTime
          },
          {
            name: "Negative Sentiment",
            data: negativeByTime
          }
        ]
      },
      tableData: {
        headers: ["Ad Name", "Comments", "Positive %", "Negative %"],
        rows: topAds.map((item, index) => {
          const adComments = filteredComments.filter(c => c.ad_id === item.ad.ad_id);
          const positiveCount = adComments.filter(c => c.sentiment === 'positive').length;
          const negativeCount = adComments.filter(c => c.sentiment === 'negative').length;
          const positivePercent = adComments.length ? (positiveCount / adComments.length) * 100 : 0;
          const negativePercent = adComments.length ? (negativeCount / adComments.length) * 100 : 0;
          
          return {
            id: index + 1,
            values: [
              item.ad.ad_name || `Ad ${item.ad.ad_id.slice(0, 8)}`,
              item.commentCount,
              `${positivePercent.toFixed(1)}%`,
              `${negativePercent.toFixed(1)}%`
            ]
          };
        })
      },
      pieChartData: {
        labels: sortedThemes.map(([theme]) => theme),
        values: sortedThemes.map(([_, count]) => count)
      },
      topAds: topAds.map(item => {
        const adComments = filteredComments.filter(c => c.ad_id === item.ad.ad_id);
        const positiveCount = adComments.filter(c => c.sentiment === 'positive').length;
        const negativeCount = adComments.filter(c => c.sentiment === 'negative').length;
        const neutralCount = adComments.length - positiveCount - negativeCount;
        
        const positivePercentage = adComments.length ? Math.round((positiveCount / adComments.length) * 100) : 0;
        const negativePercentage = adComments.length ? Math.round((negativeCount / adComments.length) * 100) : 0;
        const neutralPercentage = adComments.length ? Math.round((neutralCount / adComments.length) * 100) : 0;
        
        // Calculate performance score based on sentiment and comment count
        const performance = Math.min(
          Math.round(positivePercentage + (item.commentCount / (topAds[0]?.commentCount || 1)) * 30),
          100
        );
        
        return {
          ...item.ad,
          commentCount: item.commentCount,
          positivePercentage,
          negativePercentage,
          neutralPercentage,
          performance
        };
      }),
      extendedAnalysis: {
        angleTypeData,
        clusterData,
        adCommentData
      },
      ads: filteredAds,
      allComments
    };
  } catch (error) {
    console.error(`Error fetching brand dashboard data for ${brand}:`, error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const dashboardId = url.searchParams.get('id') || 'default';
    const brand = url.searchParams.get('brand') || undefined;
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');
    const sentiment = url.searchParams.get('sentiment') || undefined;
    const searchQuery = url.searchParams.get('search') || undefined;
    
    // Parse date strings to Date objects if provided
    let startDate: Date | undefined = undefined;
    let endDate: Date | undefined = undefined;
    
    if (startDateStr) {
      startDate = new Date(startDateStr);
      console.log('Start Date:', startDate.toISOString());
    }
    
    if (endDateStr) {
      endDate = new Date(endDateStr);
      console.log('End Date:', endDate.toISOString());
    }
    
    // Fetch dashboard data based on ID
    let dashboardData;
    
    if (dashboardId === 'default') {
      dashboardData = await getDefaultDashboardData(startDate, endDate, sentiment, searchQuery);
      console.log('Total Ads:', dashboardData.metrics[0].value);
      console.log('Total Comments:', dashboardData.metrics[1].value);
    } else if (brand) {
      dashboardData = await getBrandDashboardData(brand, startDate, endDate, sentiment, searchQuery);
      console.log('Brand:', brand);
      console.log('Total Ads:', dashboardData.metrics[0].value);
      console.log('Total Comments:', dashboardData.metrics[1].value);
    } else {
      throw new Error('Invalid dashboard request parameters');
    }
    
    // Return the dashboard data
    return NextResponse.json({
      id: dashboardId,
      brand,
      filters: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        sentiment,
        search: searchQuery
      },
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in dashboard API route:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch dashboard data'
    }, {
      status: 500
    });
  }
} 