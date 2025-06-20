import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { PoultryMetrics, AnomalyDetection } from '../types';

interface DashboardProps {
  historicalData: (PoultryMetrics & { anomaly?: AnomalyDetection })[];
}

const Dashboard: React.FC<DashboardProps> = ({ historicalData }) => {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Environmental Metrics Over Time</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                stroke="#6B7280"
              />
              <YAxis yAxisId="left" stroke="#6B7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6B7280" />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleString()}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  padding: '1rem'
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: '1rem'
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="temperature_C"
                stroke="#EF4444"
                name="Temperature (°C)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="humidity_percent"
                stroke="#3B82F6"
                name="Humidity (%)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ammonia_ppm"
                stroke="#22C55E"
                name="Ammonia (ppm)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ph"
                stroke="#A855F7"
                name="pH"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {historicalData.some(data => data.anomaly) && (
        <div className="rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Anomaly Detection</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  stroke="#6B7280"
                />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.5rem',
                    padding: '1rem'
                  }}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '1rem'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="anomaly.anomaly_score"
                  stroke="#F59E0B"
                  name="Anomaly Score"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 