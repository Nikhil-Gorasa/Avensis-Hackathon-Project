import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { BellIcon, ChartPieIcon } from '@heroicons/react/24/solid';
import MetricsCard from './components/MetricsCard';
import RiskStatus from './components/RiskStatus';
import Dashboard from './components/Dashboard';
import { getPredictionWithExplanation, type ModelPrediction } from './services/mlService';
import type { PoultryMetrics, RiskLevel } from './types';

interface RiskAssessment {
  riskLevel: RiskLevel;
  issues: string[];
}

// Main content component
function MainContent() {
  const [metrics, setMetrics] = useState<PoultryMetrics>({
    temperature_C: 23,
    humidity_percent: 65,
    ammonia_ppm: 10,
    ph: 7.0
  });

  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [prediction, setPrediction] = useState<ModelPrediction | null>(null);
  const navigate = useNavigate();

  const assessRisk = async (currentMetrics: PoultryMetrics): Promise<RiskAssessment> => {
    try {
      const mlPrediction = await getPredictionWithExplanation(currentMetrics);
      setPrediction(mlPrediction);

      const issues: string[] = [];
      let riskLevel: RiskLevel = mlPrediction.anomaly.anomaly_score > 0.7 ? 'high' : 
                                mlPrediction.anomaly.anomaly_score > 0.4 ? 'medium' : 'low';

      // Add issues based on SHAP values
      mlPrediction.shapValues
        .filter(shap => shap.importance > 0.5)
        .forEach(shap => {
          issues.push(`${shap.feature} is ${shap.contribution === 'positive' ? 'too high' : 'too low'}`);
        });

      return { riskLevel, issues };
    } catch (error) {
      console.error('Error in risk assessment:', error);
      return { riskLevel: 'low' as RiskLevel, issues: ['Unable to assess risk due to error'] };
    }
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
      setLastUpdated(new Date().toISOString());

      // Get ML prediction and assess risk
      const { riskLevel, issues } = await assessRisk(newMetrics);
      
      // Show notification for high risk
      if (riskLevel === 'high' && !showNotification) {
        setShowNotification(true);
        // Auto-hide notification after 5 seconds
        setTimeout(() => setShowNotification(false), 5000);
      }

      return { riskLevel, issues };
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return { riskLevel: 'low' as RiskLevel, issues: [] as string[] };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const { riskLevel, issues } = prediction ? 
    { riskLevel: prediction.anomaly.anomaly_score > 0.7 ? 'high' : prediction.anomaly.anomaly_score > 0.4 ? 'medium' : 'low' as RiskLevel,
      issues: prediction.shapValues
        .filter(shap => shap.importance > 0.5)
        .map(shap => `${shap.feature} is ${shap.contribution === 'positive' ? 'too high' : 'too low'}`) } :
    { riskLevel: 'low' as RiskLevel, issues: [] as string[] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md backdrop-blur-sm bg-white/90 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              Poultry Environment Monitor
            </h1>
          </div>
        </div>
      </header>

      {/* Analysis Report Section */}
      {prediction && (
        <div className="bg-white/50 backdrop-blur-sm border-b border-gray-200 transition-all duration-500 ease-in-out">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Health Score */}
              <div className="bg-white rounded-2xl shadow-lg p-6 transform transition-all duration-500 hover:scale-[1.02]">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2 animate-pulse bg-primary-500"></div>
                  System Health
                </h3>
                <div className="flex items-center">
                  <div className={`text-5xl font-bold transition-colors duration-500 ${
                    prediction.anomaly.anomaly_score < 0.4 ? 'text-green-500' : 
                    prediction.anomaly.anomaly_score < 0.7 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {Math.round(100 - (prediction.anomaly.anomaly_score * 100))}%
                  </div>
                  <div className="ml-4 flex flex-col">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-500 ${
                      prediction.anomaly.anomaly_score < 0.4 ? 'bg-green-100 text-green-800' : 
                      prediction.anomaly.anomaly_score < 0.7 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {riskLevel === 'low' ? 'Low Risk' : riskLevel === 'medium' ? 'Medium Risk' : 'High Risk'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">Updated {new Date(lastUpdated).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {/* Risk Analysis */}
              <div className="bg-white rounded-2xl shadow-lg p-6 md:col-span-2 transform transition-all duration-500 hover:scale-[1.02]">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2 animate-pulse bg-primary-500"></div>
                  Risk Analysis
                </h3>
                {issues.length > 0 ? (
                  <div>
                    <p className="text-red-600 font-medium mb-2 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                      Critical Parameters:
                    </p>
                    <ul className="list-none space-y-2">
                      {issues.map((issue, index) => (
                        <li key={index} className="flex items-center bg-red-50 rounded-lg p-3 text-gray-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-green-600 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                      All parameters are within acceptable ranges. System is operating normally.
                    </p>
                  </div>
                )}
                <div className="mt-6 space-y-3">
                  {prediction.shapValues.map((shap, index) => (
                    <div key={index} 
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
                        <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300 ${
                          shap.contribution === 'positive'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {shap.contribution === 'positive' ? 'High Risk' : 'Within Range'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showNotification && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 transform animate-slideIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <BellIcon className="h-5 w-5 text-red-400 animate-pulse" aria-hidden="true" />
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
            lastUpdated={new Date(lastUpdated).toLocaleString()}
          />
        </div>
      </main>

      <footer className="bg-white/50 backdrop-blur-sm mt-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Last updated: {new Date(lastUpdated).toLocaleString()} • Auto-updates every 3 seconds
            {isLoading && (
              <span className="ml-2 inline-flex items-center">
                • Refreshing
                <span className="ml-1 flex space-x-1">
                  <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              </span>
            )}
          </p>
        </div>
      </footer>

      {/* Floating Dashboard Button */}
      <div className="fixed bottom-8 right-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center p-4 border border-transparent rounded-full shadow-xl text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 hover:scale-110 hover:rotate-12"
        >
          <ChartPieIcon className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}

// Dashboard page component
function DashboardPage() {
  const [metrics, setMetrics] = useState<PoultryMetrics>({
    temperature_C: 23,
    humidity_percent: 65,
    ammonia_ppm: 10,
    ph: 7.0
  });
  const [prediction, setPrediction] = useState<ModelPrediction | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const mlPrediction = await getPredictionWithExplanation(metrics);
        setPrediction(mlPrediction);
      } catch (error) {
        console.error('Error fetching prediction:', error);
      }
    };
    fetchData();
  }, [metrics]);

  // Calculate overall status
  const anomalyScore = prediction?.anomaly?.anomaly_score ?? 0;
  const healthScore = 100 - (anomalyScore * 100);
  const riskLevel = anomalyScore > 0.7 ? 'High Risk' : 
                   anomalyScore > 0.4 ? 'Medium Risk' : 'Low Risk';
  const criticalIssues = prediction?.shapValues
    .filter(shap => shap.contribution === 'positive' && shap.importance > 0.5)
    .map(shap => shap.feature) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Analytics Dashboard
            </h1>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Back to Monitor
            </button>
          </div>
        </div>
      </header>

      {/* Summary Report Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Health Score */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">System Health</h3>
              <div className="flex items-center">
                <div className={`text-4xl font-bold ${
                  healthScore > 70 ? 'text-green-600' : 
                  healthScore > 40 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {Math.round(healthScore)}%
                </div>
                <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${
                  healthScore > 70 ? 'bg-green-100 text-green-800' : 
                  healthScore > 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {riskLevel}
                </span>
              </div>
            </div>

            {/* Critical Issues */}
            <div className="bg-gray-50 rounded-lg p-6 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Status Report</h3>
              {criticalIssues.length > 0 ? (
                <div>
                  <p className="text-red-600 font-medium mb-2">Critical Issues Detected:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {criticalIssues.map((issue, index) => (
                      <li key={index} className="text-gray-700">
                        {issue} requires attention
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-green-600">
                  All parameters are within acceptable ranges. System is operating normally.
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard currentMetrics={metrics} prediction={prediction} />
      </main>
    </div>
  );
}

// App component with routing
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainContent />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;
