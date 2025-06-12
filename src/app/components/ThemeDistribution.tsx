'use client';

import { Bar } from 'react-chartjs-2';
import ChartCard from './ChartCard';

type Theme = {
  name: string;
  count: number;
  color?: string;
};

type ThemeDistributionProps = {
  themes: Theme[];
  title?: string;
  subtitle?: string;
  maxItems?: number;
  className?: string;
  loading?: boolean;
};

export default function ThemeDistribution({
  themes,
  title = 'Theme Distribution',
  subtitle = 'Most common themes in comments',
  maxItems = 10,
  className = '',
  loading = false
}: ThemeDistributionProps) {
  // Sort themes by count (descending) and limit to maxItems
  const sortedThemes = [...themes]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);
  
  // Default colors if not provided
  const defaultColors = [
    'rgba(59, 130, 246, 0.8)',  // blue
    'rgba(16, 185, 129, 0.8)',  // green
    'rgba(139, 92, 246, 0.8)',  // purple
    'rgba(245, 158, 11, 0.8)',  // amber
    'rgba(239, 68, 68, 0.8)',   // red
    'rgba(14, 165, 233, 0.8)',  // sky
    'rgba(236, 72, 153, 0.8)',  // pink
    'rgba(168, 85, 247, 0.8)',  // indigo
    'rgba(251, 146, 60, 0.8)',  // orange
    'rgba(6, 182, 212, 0.8)',   // cyan
  ];

  // Generate chart data
  const labels = sortedThemes.map(theme => theme.name);
  const data = sortedThemes.map(theme => theme.count);
  const backgroundColor = sortedThemes.map((theme, index) => 
    theme.color || defaultColors[index % defaultColors.length]
  );
  const borderColor = backgroundColor.map(color => 
    color.replace('0.8', '1')
  );

  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor,
        borderColor,
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      }
    ]
  };

  // Chart options
  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        padding: 12,
        callbacks: {
          title: (tooltipItems: any) => {
            return tooltipItems[0].label;
          },
          label: (context: any) => {
            const value = context.raw || 0;
            return `Count: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
        }
      },
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          precision: 0,
          color: 'rgba(107, 114, 128, 0.8)',
        }
      }
    },
    animation: {
      duration: 1000
    }
  };

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      className={className}
      loading={loading}
    >
      <Bar data={chartData} options={options} />
    </ChartCard>
  );
} 