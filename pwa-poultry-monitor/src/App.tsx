import { useState, useEffect } from 'react';
import { BellIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import MetricsCard from './components/MetricsCard';
import RiskStatus from './components/RiskStatus';
import type { PoultryMetrics, RiskLevel } from './types';

function App() {
  const [metrics, setMetrics] = useState<PoultryMetrics>({
    temperature_C: 23,
    humidity_percent: 65,
    ammonia_ppm: 10,
    ph: 7.0
  });

  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const assessRisk = () => {
    const issues = [];
    let riskLevel: RiskLevel = 'low';

    if (metrics.temperature_C < 20 || metrics.temperature_C > 25) {
      issues.push(`Temperature is ${metrics.temperature_C < 20 ? 'too low' : 'too high'} (${metrics.temperature_C}°C)`);
      riskLevel = metrics.temperature_C < 18 || metrics.temperature_C > 27 ? 'high' : 'medium';
    }

    if (metrics.humidity_percent < 50 || metrics.humidity_percent > 70) {
      issues.push(`Humidity is ${metrics.humidity_percent < 50 ? 'too low' : 'too high'} (${metrics.humidity_percent}%)`);
      riskLevel = metrics.humidity_percent < 40 || metrics.humidity_percent > 80 ? 'high' : 'medium';
    }

    if (metrics.ammonia_ppm > 15) {
      issues.push(`Ammonia levels are high (${metrics.ammonia_ppm} ppm)`);
      riskLevel = metrics.ammonia_ppm > 20 ? 'high' : 'medium';
    }

    if (metrics.ph < 6.5 || metrics.ph > 7.5) {
      issues.push(`pH level is ${metrics.ph < 6.5 ? 'too acidic' : 'too alkaline'} (${metrics.ph})`);
      riskLevel = metrics.ph < 6.0 || metrics.ph > 8.0 ? 'high' : 'medium';
    }

    return { riskLevel, issues };
  };

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      // Simulate API call with random variations
      const variation = () => (Math.random() - 0.5) * 2;
      const newMetrics: PoultryMetrics = {
        temperature_C: Math.max(15, Math.min(30, metrics.temperature_C + variation())),
        humidity_percent: Math.max(30, Math.min(90, metrics.humidity_percent + variation() * 5)),
        ammonia_ppm: Math.max(0, Math.min(25, metrics.ammonia_ppm + variation() * 2)),
        ph: Math.max(5.5, Math.min(8.5, metrics.ph + variation() * 0.2))
      };

      setMetrics(newMetrics);
      setLastUpdated(new Date().toLocaleTimeString());

      // Show notification for high risk
      const { riskLevel } = assessRisk();
      if (riskLevel === 'high' && !showNotification) {
        setShowNotification(true);
        // Auto-hide notification after 5 seconds
        setTimeout(() => setShowNotification(false), 5000);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const { riskLevel, issues } = assessRisk();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Poultry Environment Monitor
            </h1>
            <button
              onClick={fetchMetrics}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`-ml-1 mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showNotification && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <BellIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Alert: Critical Conditions Detected
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    One or more environmental parameters have reached critical levels.
                    Immediate attention is required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <MetricsCard metrics={metrics} />
          
          <RiskStatus
            riskLevel={riskLevel}
            issues={issues}
            lastUpdated={lastUpdated}
          />
        </div>
      </main>

      <footer className="bg-white mt-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Last updated: {lastUpdated} • Auto-refreshes every 30 seconds
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
