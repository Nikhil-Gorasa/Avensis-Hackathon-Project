import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { PoultryMetrics } from '../types';

interface MetricsCardProps {
  metrics: PoultryMetrics;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ metrics }) => {
  const { t } = useTranslation();

  const getStatus = (value: number, min: number, max: number) => {
    if (value < min) return 'tooLow';
    if (value > max) return 'tooHigh';
    return 'optimal';
  };

  const metricsConfig = [
    {
      key: 'temperature_C',
      icon: '🌡️',
      label: t('metrics.temperature'),
      value: metrics.temperature_C,
      unit: t('units.temperature'),
      min: 20,
      max: 25,
      safeRange: t('ranges.temperature', { min: 20, max: 25 })
    },
    {
      key: 'humidity_percent',
      icon: '💧',
      label: t('metrics.humidity'),
      value: metrics.humidity_percent,
      unit: t('units.humidity'),
      min: 50,
      max: 70,
      safeRange: t('ranges.humidity', { min: 50, max: 70 })
    },
    {
      key: 'ammonia_ppm',
      icon: '☁️',
      label: t('metrics.ammonia'),
      value: metrics.ammonia_ppm,
      unit: t('units.ammonia'),
      min: 0,
      max: 15,
      safeRange: t('ranges.ammonia', { min: 0, max: 15 })
    },
    {
      key: 'ph',
      icon: '🧪',
      label: t('metrics.ph'),
      value: metrics.ph,
      unit: t('units.ph'),
      min: 6.5,
      max: 7.5,
      safeRange: t('ranges.ph', { min: 6.5, max: 7.5 })
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <AnimatePresence>
        {metricsConfig.map((metric) => {
          const status = getStatus(
            metric.value,
            metric.min,
            metric.max
          );

          const percentage = ((metric.value - metric.min) / (metric.max - metric.min)) * 100;
          const safeZoneStart = 0;
          const safeZoneEnd = 100;
          const indicatorPosition = Math.max(0, Math.min(100, percentage));

          return (
            <motion.div
              key={metric.key}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{metric.icon}</span>
                  <h3 className="text-gray-700 font-medium">
                    {metric.label}
                  </h3>
                </div>
                <motion.span
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                    status === 'optimal' ? 'bg-green-100 text-green-800' :
                    status === 'tooHigh' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {t(`status.${status}`)}
                </motion.span>
              </div>

              <motion.div 
                className="mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="flex items-baseline">
                  <motion.span
                    key={metric.value}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-bold text-gray-900"
                  >
                    {metric.value.toFixed(1)}
                  </motion.span>
                  <span className="ml-1 text-gray-500 text-lg">
                    {metric.unit}
                  </span>
                </div>
              </motion.div>

              <motion.div 
                className="mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="flex justify-between items-center text-sm text-gray-500 mb-1">
                  <span>{t('metrics.safeRange')}:</span>
                  <span>{metric.safeRange}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="relative w-full h-full">
                    <div className="absolute inset-0 flex">
                      <motion.div 
                        className="bg-gray-200 h-full"
                        initial={{ flex: 1 }}
                        animate={{ flex: safeZoneStart }}
                        transition={{ type: "spring", stiffness: 100 }}
                      />
                      <motion.div 
                        className="bg-green-200 h-full"
                        initial={{ flex: 0 }}
                        animate={{ flex: safeZoneEnd - safeZoneStart }}
                        transition={{ type: "spring", stiffness: 100 }}
                      />
                      <motion.div 
                        className="bg-gray-200 h-full"
                        initial={{ flex: 1 }}
                        animate={{ flex: 100 - safeZoneEnd }}
                        transition={{ type: "spring", stiffness: 100 }}
                      />
                    </div>
                    <motion.div
                      className="absolute h-full w-2 bg-black transform -translate-x-1/2"
                      initial={{ left: `${indicatorPosition}%` }}
                      animate={{ left: `${indicatorPosition}%` }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default MetricsCard; 