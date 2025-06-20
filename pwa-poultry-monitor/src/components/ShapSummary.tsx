import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import type { ModelPrediction } from '../services/mlService';

interface ShapSummaryProps {
  prediction: ModelPrediction;
  isOpen: boolean;
  onClose: () => void;
}

const ShapSummary: React.FC<ShapSummaryProps> = ({ prediction, isOpen, onClose }) => {
  if (!isOpen) return null;

  const { anomaly, shapValues } = prediction;
  const maxImportance = Math.max(...shapValues.map(v => v.importance));

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 relative">
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ML Model Analysis Summary
          </h2>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Anomaly Score</span>
              <span className={`text-sm font-semibold ${
                anomaly.anomaly_score > 0.7 ? 'text-red-600' : 'text-green-600'
              }`}>
                {(anomaly.anomaly_score * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className={`h-full rounded-full ${
                  anomaly.anomaly_score > 0.7 ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${anomaly.anomaly_score * 100}%` }}
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Feature Importance (SHAP Values)
          </h3>

          <div className="space-y-4">
            {shapValues.map((shap) => (
              <div key={shap.feature} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {shap.feature}
                  </span>
                  <span className={`text-sm font-medium ${
                    shap.contribution === 'positive' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {shap.contribution === 'positive' ? 'Increasing Risk' : 'Decreasing Risk'}
                  </span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      shap.contribution === 'positive' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${(shap.importance / maxImportance) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Interpretation
            </h4>
            <p className="text-sm text-gray-600">
              {anomaly.is_anomaly ? (
                <>
                  The model has detected abnormal conditions. The most significant factors are:
                  <ul className="list-disc list-inside mt-2">
                    {shapValues.slice(0, 2).map(shap => (
                      <li key={shap.feature}>
                        {shap.feature}: {shap.contribution === 'positive' ? 'Higher' : 'Lower'} than optimal
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                'All parameters are within acceptable ranges. Continue monitoring for any changes.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShapSummary; 