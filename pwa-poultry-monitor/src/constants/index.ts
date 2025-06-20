import type { SafeRanges } from '../types';

export const SAFE_RANGES: SafeRanges = {
  temperature_C: { min: 20, max: 25 },
  humidity_percent: { min: 50, max: 70 },
  ammonia_ppm: { min: 5, max: 15 },
  ph: { min: 6.5, max: 7.5 }
};

export const RISK_SUGGESTIONS = {
  Low: [
    'Continue monitoring current conditions',
    'Maintain regular cleaning schedule',
    'Ensure proper ventilation'
  ],
  Medium: [
    'Increase ventilation rate',
    'Check water quality',
    'Monitor feed consumption',
    'Clean litter more frequently'
  ],
  High: [
    'Immediately improve ventilation',
    'Reduce stocking density if possible',
    'Check for water leaks',
    'Clean or replace litter',
    'Consider supplemental heating/cooling'
  ],
  Critical: [
    'Evacuate birds if conditions persist',
    'Emergency ventilation required',
    'Contact veterinarian',
    'Implement emergency management procedures',
    'Document all actions taken'
  ]
}; 