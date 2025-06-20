import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { LanguageIcon } from '@heroicons/react/24/solid';
import type { PoultryMetrics } from '../types';
import type { ModelPrediction } from '../services/mlService';
import LanguageSelector from './LanguageSelector';

interface DashboardProps {
  currentMetrics: PoultryMetrics;
  prediction: ModelPrediction | null;
}

interface MetricHistory {
  timestamp: string;
  temperature_C: number;
  humidity_percent: number;
  ammonia_ppm: number;
  ph: number;
  anomaly_score: number;
}

const Dashboard: React.FC<DashboardProps> = ({ currentMetrics, prediction }) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<MetricHistory[]>([]);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  useEffect(() => {
    // Add current metrics to history
    const newPoint = {
      timestamp: new Date().toLocaleString(),
      ...currentMetrics,
      anomaly_score: prediction?.anomaly.anomaly_score || 0
    };
    
    setHistory(prev => {
      const newHistory = [...prev, newPoint];
      // Keep last 20 points
      return newHistory.slice(-20);
    });
  }, [currentMetrics, prediction]);

  const shapData = prediction?.shapValues.map(shap => ({
    feature: t(`metrics.${shap.feature.toLowerCase()}`),
    importance: Number(shap.importance.toFixed(3)),
    contribution: shap.contribution,
    impact: shap.contribution === 'positive' ? t('analysis.riskIndicators.highRisk') : t('analysis.riskIndicators.withinRange')
  })) || [];

  return (
    <div className="space-y-8">
      {/* Current Status and SHAP Values */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Status Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6 transform transition-all duration-500 hover:scale-[1.02]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 rounded-full mr-2 animate-pulse bg-primary-500"></div>
            {t('analysis.currentStatus')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t('metrics.temperature'), value: currentMetrics.temperature_C, unit: t('units.temperature'), feature: 'Temperature' },
              { label: t('metrics.humidity'), value: currentMetrics.humidity_percent, unit: t('units.humidity'), feature: 'Humidity' },
              { label: t('metrics.ammonia'), value: currentMetrics.ammonia_ppm, unit: t('units.ammonia'), feature: 'Ammonia' },
              { label: t('metrics.ph'), value: currentMetrics.ph, unit: t('units.ph'), feature: 'pH' }
            ].map((metric, index) => {
              const isHighRisk = prediction?.shapValues.find(
                s => s.feature === metric.feature && s.contribution === 'positive'
              );
              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl transition-all duration-300 ${
                    isHighRisk
                      ? 'bg-gradient-to-br from-red-50 to-red-100 shadow-md'
                      : 'bg-gradient-to-br from-green-50 to-green-100'
                  }`}
                >
                  <div className="text-sm text-gray-500 flex items-center">
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                      isHighRisk ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                    }`}></span>
                    {metric.label}
                  </div>
                  <div className="text-xl font-semibold mt-1 flex items-baseline">
                    {metric.value.toFixed(1)}
                    <span className="text-sm text-gray-500 ml-1">{metric.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SHAP Values */}
        <div className="bg-white rounded-2xl shadow-lg p-6 transform transition-all duration-500 hover:scale-[1.02]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 rounded-full mr-2 animate-pulse bg-primary-500"></div>
            {t('analysis.featureRiskAnalysis')}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shapData}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(239, 68, 68, 0.8)" />
                    <stop offset="100%" stopColor="rgba(239, 68, 68, 0.4)" />
                  </linearGradient>
                  <linearGradient id="safeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(34, 197, 94, 0.8)" />
                    <stop offset="100%" stopColor="rgba(34, 197, 94, 0.4)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="feature"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  label={{
                    value: t('analysis.riskContribution'),
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: '#6b7280' }
                  }}
                  domain={[0, 1]}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, t('analysis.riskContribution')]}
                  labelFormatter={(label) => `${t('metrics.feature')}: ${label}`}
                />
                <Bar
                  dataKey="importance"
                  radius={[4, 4, 0, 0]}
                >
                  {shapData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#${entry.contribution === 'positive' ? 'riskGradient' : 'safeGradient'})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {shapData.map((shap, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg transition-all duration-300 hover:shadow-md"
                style={{
                  background: `linear-gradient(to right, ${
                    shap.contribution === 'positive' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'
                  } ${shap.importance * 100}%, transparent ${shap.importance * 100}%)`
                }}
              >
                <span className="font-medium">{shap.feature}</span>
                <div className="flex items-center">
                  <span className="mr-3 font-semibold">{(shap.importance * 100).toFixed(1)}%</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    shap.contribution === 'positive'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {shap.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metrics History Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 transform transition-all duration-500 hover:scale-[1.02]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 rounded-full mr-2 animate-pulse bg-primary-500"></div>
            {t('charts.parameterTrends')}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <defs>
                  <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(239, 68, 68, 0.8)" />
                    <stop offset="100%" stopColor="rgba(239, 68, 68, 0.1)" />
                  </linearGradient>
                  <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
                  </linearGradient>
                  <linearGradient id="ammoniaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(234, 179, 8, 0.8)" />
                    <stop offset="100%" stopColor="rgba(234, 179, 8, 0.1)" />
                  </linearGradient>
                  <linearGradient id="phGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(34, 197, 94, 0.8)" />
                    <stop offset="100%" stopColor="rgba(34, 197, 94, 0.1)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="temperature_C"
                  stroke="url(#temperatureGradient)"
                  strokeWidth={2}
                  dot={false}
                  name={`${t('metrics.temperature')} (${t('units.temperature')})`}
                />
                <Line
                  type="monotone"
                  dataKey="humidity_percent"
                  stroke="url(#humidityGradient)"
                  strokeWidth={2}
                  dot={false}
                  name={`${t('metrics.humidity')} (${t('units.humidity')})`}
                />
                <Line
                  type="monotone"
                  dataKey="ammonia_ppm"
                  stroke="url(#ammoniaGradient)"
                  strokeWidth={2}
                  dot={false}
                  name={`${t('metrics.ammonia')} (${t('units.ammonia')})`}
                />
                <Line
                  type="monotone"
                  dataKey="ph"
                  stroke="url(#phGradient)"
                  strokeWidth={2}
                  dot={false}
                  name={`${t('metrics.ph')}`}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Anomaly Score History */}
        <div className="bg-white rounded-2xl shadow-lg p-6 transform transition-all duration-500 hover:scale-[1.02]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 rounded-full mr-2 animate-pulse bg-primary-500"></div>
            {t('charts.riskContribution')}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <defs>
                  <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(220, 38, 38, 0.8)" />
                    <stop offset="100%" stopColor="rgba(220, 38, 38, 0.1)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, t('analysis.riskContribution')]}
                />
                <Line
                  type="monotone"
                  dataKey="anomaly_score"
                  stroke="url(#anomalyGradient)"
                  strokeWidth={2}
                  dot={false}
                  name={t('analysis.riskContribution')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Language Selection Button */}
      <div className="fixed bottom-8 left-8">
        <button
          onClick={() => setShowLanguageSelector(true)}
          className="inline-flex items-center p-4 border border-transparent rounded-full shadow-xl text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 hover:scale-110"
        >
          <LanguageIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Language Selector Modal */}
      {showLanguageSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <LanguageSelector onLanguageSelected={() => setShowLanguageSelector(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 