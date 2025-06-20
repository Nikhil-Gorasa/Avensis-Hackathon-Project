export interface PoultryMetrics {
  temperature_C: number;
  humidity_percent: number;
  ammonia_ppm: number;
  ph: number;
}

export interface SafeRanges {
  temperature_C: { min: number; max: number };
  humidity_percent: { min: number; max: number };
  ammonia_ppm: { min: number; max: number };
  ph: { min: number; max: number };
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskAssessment {
  level: RiskLevel;
  suggestions: string[];
}

export interface AnomalyDetection {
  is_anomaly: boolean;
  anomaly_score: number;
  features: {
    [key: string]: number;
  };
} 