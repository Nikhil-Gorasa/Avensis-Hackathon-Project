import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import type { PoultryMetrics } from '../types';

const SAFE_RANGES = {
  temperature: { min: 20, max: 25, unit: '°C' },
  humidity: { min: 50, max: 70, unit: '%' },
  ammonia: { min: 0, max: 15, unit: 'ppm' },
  ph: { min: 6.5, max: 7.5, unit: '' }
};

interface MetricsCardProps {
  metrics: PoultryMetrics;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ metrics }) => {
  const getStatusConfig = (value: number, type: keyof typeof SAFE_RANGES) => {
    const range = SAFE_RANGES[type];
    if (value < range.min) {
      return {
        color: 'border-blue-500 bg-blue-50',
        icon: <ArrowDownIcon className="h-5 w-5 text-blue-500" />,
        message: 'Too Low'
      };
    } else if (value > range.max) {
      return {
        color: 'border-red-500 bg-red-50',
        icon: <ArrowUpIcon className="h-5 w-5 text-red-500" />,
        message: 'Too High'
      };
    }
    return {
      color: 'border-green-500 bg-green-50',
      icon: null,
      message: 'Optimal'
    };
  };

  const renderMetricCard = (
    label: string,
    value: number,
    type: keyof typeof SAFE_RANGES,
    icon: string
  ) => {
    const { color, icon: statusIcon, message } = getStatusConfig(value, type);
    const range = SAFE_RANGES[type];

    return (
      <div className={`metric-card ${color} relative overflow-hidden group hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300`}>
        <div className="absolute top-0 right-0 p-2 text-xs font-medium rounded-bl-lg bg-opacity-90 text-gray-600">
          {message}
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-2">{icon}</span>
            <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
          </div>
          {statusIcon}
        </div>

        <div className="metric-value flex items-baseline">
          <span className="text-4xl font-bold text-gray-900">{value.toFixed(1)}</span>
          <span className="text-lg ml-1 text-gray-600">{range.unit}</span>
        </div>

        <div className="mt-4 space-y-2">
          <div className="safe-range flex justify-between items-center">
            <span className="text-sm text-gray-600">Safe Range:</span>
            <span className="font-medium text-gray-800">
              {range.min} - {range.max} {range.unit}
            </span>
          </div>
          
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-red-500"
              style={{
                clipPath: `polygon(
                  ${(range.min / (range.max * 1.5)) * 100}% 0,
                  ${(range.max / (range.max * 1.5)) * 100}% 0,
                  ${(range.max / (range.max * 1.5)) * 100}% 100%,
                  ${(range.min / (range.max * 1.5)) * 100}% 100%
                )`
              }}
            />
            <div 
              className="h-full w-2 bg-black transform -translate-y-full"
              style={{
                marginLeft: `${(value / (range.max * 1.5)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {renderMetricCard('Temperature', metrics.temperature_C, 'temperature', '🌡️')}
      {renderMetricCard('Humidity', metrics.humidity_percent, 'humidity', '💧')}
      {renderMetricCard('Ammonia Level', metrics.ammonia_ppm, 'ammonia', '☁️')}
      {renderMetricCard('pH Level', metrics.ph, 'ph', '⚗️')}
    </div>
  );
};

export default MetricsCard; 