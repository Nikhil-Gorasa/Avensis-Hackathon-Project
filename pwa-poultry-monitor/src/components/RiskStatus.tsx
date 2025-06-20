import React from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface RiskStatusProps {
  riskLevel: 'low' | 'medium' | 'high';
  issues: string[];
  lastUpdated: string;
}

const RiskStatus: React.FC<RiskStatusProps> = ({ riskLevel, issues, lastUpdated }) => {
  const getStatusConfig = (level: string) => {
    switch (level) {
      case 'low':
        return {
          icon: <CheckCircleIcon className="h-8 w-8 text-green-500" />,
          color: 'bg-green-50 border-green-200',
          textColor: 'text-green-700',
          title: 'Healthy Environment',
          description: 'All parameters are within optimal ranges.'
        };
      case 'medium':
        return {
          icon: <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />,
          color: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-700',
          title: 'Attention Required',
          description: 'Some parameters need adjustment.'
        };
      case 'high':
        return {
          icon: <XCircleIcon className="h-8 w-8 text-red-500" />,
          color: 'bg-red-50 border-red-200',
          textColor: 'text-red-700',
          title: 'Immediate Action Required',
          description: 'Critical parameters detected.'
        };
      default:
        return {
          icon: <CheckCircleIcon className="h-8 w-8 text-gray-500" />,
          color: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-700',
          title: 'Status Unknown',
          description: 'Unable to determine environment status.'
        };
    }
  };

  const config = getStatusConfig(riskLevel);

  return (
    <div className={`rounded-lg border p-6 ${config.color} transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {config.icon}
          <div>
            <h2 className={`text-xl font-bold ${config.textColor}`}>
              {config.title}
            </h2>
            <p className="text-gray-600 text-sm">
              {config.description}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Last Updated</p>
          <p className="text-sm font-medium text-gray-700">{lastUpdated}</p>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Issues Requiring Attention:
          </h3>
          <ul className="space-y-2">
            {issues.map((issue, index) => (
              <li 
                key={index}
                className={`text-sm rounded-md p-2 flex items-center space-x-2 ${
                  riskLevel === 'high' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {riskLevel !== 'low' && (
        <div className="mt-4 p-4 bg-white bg-opacity-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Recommended Actions:
          </h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            {riskLevel === 'high' ? (
              <>
                <li>Check ventilation system immediately</li>
                <li>Verify temperature control equipment</li>
                <li>Inspect for water leaks or humidity sources</li>
                <li>Consider temporary relocation if necessary</li>
              </>
            ) : (
              <>
                <li>Monitor affected parameters more frequently</li>
                <li>Adjust environmental controls as needed</li>
                <li>Schedule maintenance check if issues persist</li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RiskStatus; 