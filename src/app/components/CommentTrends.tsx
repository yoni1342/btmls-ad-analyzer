'use client';

import { Line, Bar } from 'react-chartjs-2';
import ChartCard from './ChartCard';
import type { ChartOptions, AnimationSpec } from 'chart.js';

type TimeSeriesData = {
  labels: string[];
  datasets: {
    name: string;
    data: number[];
    color?: string;
  }[];
};

type CommentTrendsProps = {
  data: TimeSeriesData;
  title?: string;
  subtitle?: string;
  chartType?: 'line' | 'bar' | 'stacked-bar';
  showLegend?: boolean;
  height?: string;
  className?: string;
  loading?: boolean;
};

export default function CommentTrends({
  data,
  title = 'Comment Trends',
  subtitle = 'Comment volume over time',
  chartType = 'line',
  showLegend = true,
  height = 'h-80',
  className = '',
  loading = false
}: CommentTrendsProps) {
  // Default colors if not provided
  const defaultColors = [
    { main: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.1)' }, // blue
    { main: 'rgb(16, 185, 129)', background: 'rgba(16, 185, 129, 0.1)' }, // green
    { main: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.1)' },   // red
    { main: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' }, // amber
    { main: 'rgb(139, 92, 246)', background: 'rgba(139, 92, 246, 0.1)' }, // purple
  ];

  // Line chart data
  const lineChartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset, index) => {
      const colorIndex = index % defaultColors.length;
      const color = dataset.color ? 
        { main: dataset.color, background: `${dataset.color}33` } : // Add 20% opacity
        defaultColors[colorIndex];
      
      return {
        label: dataset.name,
        data: dataset.data,
        borderColor: color.main,
        backgroundColor: color.background,
        borderWidth: 2,
        pointBackgroundColor: color.main,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3, // Smooth curves
        fill: true,
      };
    }),
  };

  // Bar chart data
  const barChartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset, index) => {
      const colorIndex = index % defaultColors.length;
      const color = dataset.color ? 
        { main: dataset.color, background: `${dataset.color}CC` } : // Add 80% opacity
        { 
          main: defaultColors[colorIndex].main, 
          background: defaultColors[colorIndex].main.replace('rgb', 'rgba').replace(')', ', 0.8)')
        };
      
      return {
        label: dataset.name,
        data: dataset.data,
        backgroundColor: color.background,
        borderColor: color.main,
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: color.main,
        ...(chartType === 'stacked-bar' ? { stack: 'stack1' } : {})
      };
    }),
  };

  // Chart options for line chart
  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        padding: 12,
        boxPadding: 6,
        titleColor: 'rgba(255, 255, 255, 0.95)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          precision: 0,
          color: 'rgba(107, 114, 128, 0.8)',
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
          maxRotation: 45,
          minRotation: 0,
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    animations: {
      tension: {
        duration: 1000,
        easing: 'linear',
      } as AnimationSpec<'line'>
    }
  };

  // Chart options for bar chart
  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        padding: 12,
        boxPadding: 6,
        titleColor: 'rgba(255, 255, 255, 0.95)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          precision: 0,
          color: 'rgba(107, 114, 128, 0.8)',
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
          maxRotation: 45,
          minRotation: 0,
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    }
  };

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      height={height}
      className={className}
      loading={loading}
    >
      {chartType === 'line' ? (
        <Line data={lineChartData} options={lineOptions} />
      ) : (
        <Bar data={barChartData} options={barOptions} />
      )}
    </ChartCard>
  );
} 