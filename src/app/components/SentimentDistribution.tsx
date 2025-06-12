'use client';

import { useState } from 'react';
import { Pie, Doughnut } from 'react-chartjs-2';
import ChartCard from './ChartCard';
import PositiveIcon from './PositiveIcon';
import NegativeIcon from './NegativeIcon';
import NeutralIcon from './NeutralIcon';

type SentimentDistributionProps = {
  positive: number;
  negative: number;
  neutral: number;
  visualizationType?: 'pie' | 'doughnut' | 'horizontal-bars';
  title?: string;
  subtitle?: string;
  className?: string;
  loading?: boolean;
};

export default function SentimentDistribution({
  positive,
  negative,
  neutral,
  visualizationType = 'doughnut',
  title = 'Sentiment Distribution',
  subtitle = 'Breakdown of positive, negative, and neutral sentiment',
  className = '',
  loading = false
}: SentimentDistributionProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Colors for each sentiment
  const colors = {
    positive: {
      background: 'rgba(16, 185, 129, 0.8)', // green-500
      border: 'rgb(16, 185, 129)',
      hoverBackground: 'rgba(16, 185, 129, 0.9)',
      text: 'text-green-500'
    },
    negative: {
      background: 'rgba(239, 68, 68, 0.8)', // red-500
      border: 'rgb(239, 68, 68)',
      hoverBackground: 'rgba(239, 68, 68, 0.9)',
      text: 'text-red-500'
    },
    neutral: {
      background: 'rgba(156, 163, 175, 0.8)', // gray-400
      border: 'rgb(156, 163, 175)',
      hoverBackground: 'rgba(156, 163, 175, 0.9)',
      text: 'text-gray-500'
    }
  };

  const labels = ['Positive', 'Negative', 'Neutral'];
  const data = [positive, negative, neutral];
  const total = positive + negative + neutral || 1; // Avoid division by zero
  const percentages = data.map(value => ((value / total) * 100).toFixed(1) + '%');

  // Chart data
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: [
          colors.positive.background,
          colors.negative.background,
          colors.neutral.background
        ],
        borderColor: [
          colors.positive.border,
          colors.negative.border,
          colors.neutral.border
        ],
        borderWidth: 1,
        hoverBackgroundColor: [
          colors.positive.hoverBackground,
          colors.negative.hoverBackground,
          colors.neutral.hoverBackground
        ],
        hoverBorderWidth: 2
      }
    ]
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const percentage = ((value / total) * 100).toFixed(1) + '%';
                return {
                  text: `${label}: ${percentage}`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.8)', // gray-900 with opacity
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = ((value / total) * 100).toFixed(1) + '%';
            return `${label}: ${value} (${percentage})`;
          }
        }
      }
    },
    cutout: visualizationType === 'doughnut' ? '65%' : undefined,
    radius: '90%'
  };

  // Render horizontal bars if that visualization is selected
  if (visualizationType === 'horizontal-bars') {
    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        className={className}
        loading={loading}
      >
        <div className="flex flex-col space-y-4 h-full justify-center">
          {labels.map((label, index) => (
            <div
              key={label}
              className="relative"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex justify-between mb-1 items-center">
                <span className={`text-sm font-medium flex items-center ${index === 0 ? colors.positive.text : index === 1 ? colors.negative.text : colors.neutral.text}`}>
                  {index === 0 ? <PositiveIcon /> : index === 1 ? <NegativeIcon /> : <NeutralIcon />}
                  <span className="ml-2">{label}</span>
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {data[index]} ({percentages[index]})
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${hoveredIndex === index ? 'opacity-90' : 'opacity-80'}`}
                  style={{
                    width: `${(data[index] / total) * 100}%`,
                    backgroundColor: index === 0 ? colors.positive.background : index === 1 ? colors.negative.background : colors.neutral.background,
                    transition: 'width 0.3s ease, opacity 0.2s ease'
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    );
  }

  // Render pie or doughnut chart
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      className={className}
      loading={loading}
    >
      <div className="relative h-full flex items-center justify-center">
        {visualizationType === 'pie' ? (
          <Pie data={chartData} options={chartOptions} />
        ) : (
          <Doughnut data={chartData} options={chartOptions} />
        )}
        
        {visualizationType === 'doughnut' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold">
              {data.reduce((sum, val) => sum + val, 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
          </div>
        )}
      </div>
    </ChartCard>
  );
} 