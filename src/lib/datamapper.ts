import { Ad, Comment } from './supabase-service';

type Metric = {
    id: string;
    label: string;
    value: number;
    change: number;
};

export interface DashboardData {
    title: string;
    metrics: Metric[];
    timeSeriesData: {
        labels: string[];
        datasets: {
            name: string;
            data: number[];
        }[];
    };
    tableData: {
        headers: string[];
        rows: {
            id: number;
            values: (string | number)[];
        }[];
    };
    pieChartData: {
        labels: string[];
        values: number[];
    };
    funnelDistribution?: {  // New field for funnel distribution
        name: string;
        count: number;
    }[];
    topAds: any[];
    ads: Ad[]; // For AdTable and MediaGrid
    allComments: Comment[]; // For CommentTable
    campaigns?: any[]; // For CampaignTable
    ad_sets?: any[]; // For AdSetsTable
    extendedAnalysis?: {
    angleTypeData?: any;
    clusterData?: any;
    adCommentData?: any;
    };
      untracked_info?: {
        untracked_ads_count: number;
        untracked_comments_count: number;
        untracked_ad_ids: string[];
        untracked_comment_ids: string[];
      };
      brand_status?: {
        is_ad_analyzing: boolean;
        is_comment_analyzing: boolean;
      };
    };

export function transformDataForDashboard(
  data: any,
  dateRange?: { start: Date; end: Date }
): DashboardData {
  const {
    daily_sentiment_counts,
    total_sentiment_counts,
    theme_distribution,
    funnel_distribution,
    top_performing_ads,
    key_metrics,
        untracked_info,
        brand_status,
        		ads,
        		comments,
        		campaigns,
        		ad_sets,
        } = data;

      const totalComments = key_metrics.total_comments || 1;
  const metrics: Metric[] = [
  { id: 'total_ads', label: 'Total Ads', value: key_metrics.total_ads, change: 0 },
  { id: 'total_comments', label: 'Total Comments', value: key_metrics.total_comments, change: 0 },
  { id: 'positive_sentiment', label: 'Positive Sentiment', value: (total_sentiment_counts.positive / totalComments) * 100, change: 0 },
  { id: 'negative_sentiment', label: 'Negative Sentiment', value: (total_sentiment_counts.negative / totalComments) * 100, change: 0 },
  { id: 'neutral_sentiment', label: 'Neutral Sentiment', value: (total_sentiment_counts.neutral / totalComments) * 100, change: 0 },
  ];

  const labels: string[] = [];
  if (dateRange) {
      let startDate = new Date(dateRange.start);
      let endDate = new Date(dateRange.end);
      if (startDate.getFullYear() < 1980 && daily_sentiment_counts && daily_sentiment_counts.length > 0) {
          const dateValues = daily_sentiment_counts.map((item: any) => new Date(item.created_date));
          startDate = new Date(Math.min(...dateValues.map((d: Date) => d.getTime())));
          endDate = new Date(Math.max(...dateValues.map((d: Date) => d.getTime())));
      }
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          labels.push(d.toLocaleDateString());
      }
  } else {
      [...Array(30)].forEach((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          labels.unshift(d.toLocaleDateString());
      });
  }

  const commentsByDate = (daily_sentiment_counts || []).reduce((acc: any, item: any) => {
      const date = new Date(item.created_date).toLocaleDateString();
      acc[date] = {
          positive: item.positive_count,
          negative: item.negative_count,
          neutral: item.neutral_count,
          total: item.positive_count + item.negative_count + item.neutral_count
      };
      return acc;
  }, {});

  const timeSeriesData = {
      labels,
      datasets: [
          {
              name: 'Comments',
              data: labels.map(label => commentsByDate[label]?.total || 0),
          },
          {
              name: 'Positive Sentiment',
              data: labels.map(label => commentsByDate[label]?.positive || 0),
              color: 'rgb(16, 185, 129)'
          },
          {
              name: 'Negative Sentiment',
              data: labels.map(label => commentsByDate[label]?.negative || 0),
              color: 'rgb(239, 68, 68)'
          },
          {
              name: 'Neutral Sentiment',
              data: labels.map(label => commentsByDate[label]?.neutral || 0),
              color: 'rgb(245, 158, 11)'
          },
      ],
  };

  return {
    title: 'Brand Analytics',
    metrics,
    timeSeriesData,
    tableData: { headers: [], rows: [] }, // This is not used in the dashboard
    pieChartData: {
      labels: ['Positive', 'Negative', 'Neutral'],
      values: [
        total_sentiment_counts.positive,
        total_sentiment_counts.negative,
        total_sentiment_counts.neutral,
      ],
    },
    funnelDistribution: funnel_distribution || [],
    topAds: top_performing_ads || [],
    ads: (ads || []).map((ad: any) => ({
      ...ad,
      ad_id: ad.ad_id || ad.id?.toString(), // Ensure string compatibility
      angle_type: ad["Angel Type"] || ad.angle_type, // Handle both old and new formats
      angel: ad["Angel"] || ad.angle, // Handle both old and new formats
      funnel: ad.funnel, // Include funnel field
      total_comments: ad.total_comments || 0 // Use unfiltered comment count from database
    })),
    allComments: comments || [],
    campaigns: campaigns || [],
    ad_sets: ad_sets || [],
    extendedAnalysis: {
    adCommentData: {
              labels: (top_performing_ads || []).map((ad: any) => ad.ad_id),
              datasets: [
                {
                  label: 'Comment Count',
                  data: (top_performing_ads || []).map((ad: any) => ad.comment_count),
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                },
              ],
            },
    // themeDistribution and angleTypeData are not handled yet
    },
        untracked_info,
        brand_status,
    };
    }
