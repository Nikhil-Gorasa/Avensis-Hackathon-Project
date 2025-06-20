import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { BellIcon, ChartPieIcon, LanguageIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';
import './i18n';
import MetricsCard from './components/MetricsCard';
import RiskStatus from './components/RiskStatus';
import Dashboard from './components/Dashboard';
import LanguageSelector from './components/LanguageSelector';
import { getPredictionWithExplanation, type ModelPrediction } from './services/mlService';
import type { PoultryMetrics, RiskLevel } from './types';

interface ShapValue {
  feature: string;
  contribution: 'positive' | 'negative';
  importance: number;
}

// Language Toggle Button Component
function LanguageToggle() {
  const [showSelector, setShowSelector] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        onClick={() => setShowSelector(true)}
        className="fixed bottom-8 left-8 p-3 rounded-full shadow-lg bg-white hover:bg-gray-50 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 z-50"
        title={t('languageSelector.title')}
      >
        <LanguageIcon className="h-6 w-6 text-primary-600" />
      </button>
      {showSelector && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black bg-opacity-50">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <button
                onClick={() => setShowSelector(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">{t('languageSelector.close')}</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <LanguageSelector onLanguageSelected={() => setShowSelector(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Main content component
function MainContent() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<PoultryMetrics>({
    temperature_C: 23,
    humidity_percent: 65,
    ammonia_ppm: 7,
    ph: 7.0
  });

  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [currentPrediction, setPrediction] = useState<ModelPrediction | null>(null);
  const navigate = useNavigate();

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

      // Get ML prediction
      const mlPrediction = await getPredictionWithExplanation(newMetrics);
      setPrediction(mlPrediction);

      // Show notification for high risk
      if (mlPrediction.anomaly.anomaly_score > 0.7 && !showNotification) {
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
    const interval = setInterval(fetchMetrics, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Calculate risk level and critical issues
  const anomalyScore = currentPrediction?.anomaly?.anomaly_score ?? 0;
  const riskLevel: RiskLevel = anomalyScore > 0.7 ? 'high' : anomalyScore > 0.4 ? 'medium' : 'low';
  
  const criticalIssues = currentPrediction?.shapValues
    ?.filter((shap: ShapValue) => shap.contribution === 'positive' && shap.importance > 0.5)
    .map((shap: ShapValue) => shap.feature) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md backdrop-blur-sm bg-white/90 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              {t('header.title')}
            </h1>
          </div>
        </div>
      </header>

      {/* Analysis Report Section */}
      {currentPrediction && (
        <div className="bg-white/50 backdrop-blur-sm border-b border-gray-200 transition-all duration-500 ease-in-out">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Health Score */}
              <div className="bg-white rounded-2xl shadow-lg p-6 transform transition-all duration-500 hover:scale-[1.02]">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2 animate-pulse bg-primary-500"></div>
                  {t('analysis.systemHealth')}
                </h3>
                <div className="flex items-center">
                  <div className={`text-5xl font-bold transition-colors duration-500 ${
                    currentPrediction.anomaly.anomaly_score < 0.4 ? 'text-green-500' : 
                    currentPrediction.anomaly.anomaly_score < 0.7 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {Math.round(100 - (currentPrediction.anomaly.anomaly_score * 100))}%
                  </div>
                  <div className="ml-4 flex flex-col">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-500 ${
                      currentPrediction.anomaly.anomaly_score < 0.4 ? 'bg-green-100 text-green-800' : 
                      currentPrediction.anomaly.anomaly_score < 0.7 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {t(`riskLevels.${riskLevel}`)}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {t('analysis.lastUpdated')}: {new Date(lastUpdated).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk Analysis */}
              <div className="bg-white rounded-2xl shadow-lg p-6 md:col-span-2 transform transition-all duration-500 hover:scale-[1.02]">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2 animate-pulse bg-primary-500"></div>
                  {t('analysis.riskAnalysis')}
                </h3>
                {criticalIssues.length > 0 ? (
                  <div>
                    <p className="text-red-600 font-medium mb-2 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                      {t('analysis.criticalParameters')}:
                    </p>
                    <ul className="list-none space-y-2">
                      {criticalIssues.map((issue, index) => (
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
                      {t('analysis.allParametersNormal')}
                    </p>
                  </div>
                )}
                <div className="mt-6 space-y-3">
                  {currentPrediction.shapValues.map((shap, index) => (
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
                  {t('alerts.criticalConditions')}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{t('alerts.attentionRequired')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <MetricsCard metrics={metrics} />
          <RiskStatus
            riskLevel={riskLevel}
            issues={criticalIssues}
            lastUpdated={new Date(lastUpdated).toLocaleString()}
          />
        </div>
      </main>

      <footer className="bg-white/50 backdrop-blur-sm mt-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            {t('analysis.lastUpdated')}: {new Date(lastUpdated).toLocaleString()} • {t('analysis.autoUpdate')}
            {isLoading && (
              <span className="ml-2 inline-flex items-center">
                • {t('analysis.refreshing')}
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
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center p-4 border border-transparent rounded-full shadow-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 hover:scale-110 hover:rotate-12"
        >
          <ChartPieIcon className="h-8 w-8" />
        </button>
      </div>

      {/* Language Toggle Button */}
      <LanguageToggle />
    </div>
  );
}

// Dashboard page component with i18n
function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<PoultryMetrics>({
    temperature_C: 23,
    humidity_percent: 65,
    ammonia_ppm: 7,
    ph: 7.0
  });
  const [currentPrediction, setPrediction] = useState<ModelPrediction | null>(null);

  const fetchData = async () => {
    try {
      const variation = () => (Math.random() - 0.5) * 2;
      const newMetrics: PoultryMetrics = {
        temperature_C: Math.max(15, Math.min(30, metrics.temperature_C + variation())),
        humidity_percent: Math.max(30, Math.min(90, metrics.humidity_percent + variation() * 5)),
        ammonia_ppm: Math.max(0, Math.min(25, metrics.ammonia_ppm + variation() * 2)),
        ph: Math.max(5.5, Math.min(8.5, metrics.ph + variation() * 0.2))
      };
      setMetrics(newMetrics);

      // Get ML prediction
      const mlPrediction = await getPredictionWithExplanation(newMetrics);
      setPrediction(mlPrediction);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Calculate overall status
  const anomalyScore = currentPrediction?.anomaly?.anomaly_score ?? 0;
  const healthScore = 100 - (anomalyScore * 100);
  const riskLevel = anomalyScore > 0.7 ? t('riskLevels.high') : 
                   anomalyScore > 0.4 ? t('riskLevels.medium') : t('riskLevels.low');
  const criticalIssues = currentPrediction?.shapValues
    ?.filter((shap: ShapValue) => shap.contribution === 'positive' && shap.importance > 0.5)
    .map((shap: ShapValue) => shap.feature) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md backdrop-blur-sm bg-white/90 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                aria-label="Back to home"
              >
                <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                {t('header.title')}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Summary Report Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Health Score */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.systemHealth')}</h3>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.statusReport')}</h3>
              {criticalIssues.length > 0 ? (
                <div>
                  <p className="text-red-600 font-medium mb-2">{t('dashboard.criticalIssuesDetected')}:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {criticalIssues.map((issue: string, index: number) => (
                      <li key={index} className="text-gray-700">
                        {t('dashboard.requiresAttention', { parameter: issue })}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-green-600">
                  {t('dashboard.allParametersNormal')}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {t('analysis.lastUpdated')}: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard currentMetrics={metrics} prediction={currentPrediction} />
      </main>

      {/* Language Toggle Button */}
      <LanguageToggle />
    </div>
  );
}

// App component with language selection
function App() {
  const [isLanguageSelected, setIsLanguageSelected] = useState(() => {
    return localStorage.getItem('language_selected') === 'true';
  });

  if (!isLanguageSelected) {
    return <LanguageSelector onLanguageSelected={() => setIsLanguageSelected(true)} />;
  }

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
