import type { PoultryMetrics, AnomalyDetection } from '../types';

// Define optimal ranges for each metric
const OPTIMAL_RANGES = {
  temperature: {
    min: 20,
    max: 25,
    baseline: 22.5
  },
  humidity: {
    min: 50,
    max: 70,
    baseline: 60
  },
  ammonia: {
    min: 5,
    max: 10,
    baseline: 7.5
  },
  ph: {
    min: 6.5,
    max: 7.5,
    baseline: 7
  }
};

export interface ModelPrediction {
  anomaly: AnomalyDetection;
  shapValues: {
    feature: string;
    importance: number;
    contribution: 'positive' | 'negative';
  }[];
}

export async function getPredictionWithExplanation(metrics: PoultryMetrics): Promise<ModelPrediction> {
  try {
    // TODO: Replace with actual API call
    // const response = await fetch(`${ML_API_ENDPOINT}/predict`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(metrics)
    // });
    // const data = await response.json();
    
    // Simulated response for development
    const anomalyScore = calculateAnomalyScore(metrics);
    const shapValues = calculateShapValues(metrics);
    
    return {
      anomaly: {
        is_anomaly: anomalyScore > 0.7,
        anomaly_score: anomalyScore,
        features: {
          temperature: metrics.temperature_C,
          humidity: metrics.humidity_percent,
          ammonia: metrics.ammonia_ppm,
          ph: metrics.ph
        }
      },
      shapValues
    };
  } catch (error) {
    console.error('Error getting ML prediction:', error);
    throw error;
  }
}

// Calculate anomaly score based on how far metrics are from optimal ranges
function calculateAnomalyScore(metrics: PoultryMetrics): number {
  const weights = {
    temperature: 0.3,
    humidity: 0.25,
    ammonia: 0.25,
    ph: 0.2
  };

  const tempDeviation = calculateDeviation(
    metrics.temperature_C,
    OPTIMAL_RANGES.temperature.min,
    OPTIMAL_RANGES.temperature.max
  );
  const humidityDeviation = calculateDeviation(
    metrics.humidity_percent,
    OPTIMAL_RANGES.humidity.min,
    OPTIMAL_RANGES.humidity.max
  );
  const ammoniaDeviation = calculateDeviation(
    metrics.ammonia_ppm,
    OPTIMAL_RANGES.ammonia.min,
    OPTIMAL_RANGES.ammonia.max
  );
  const phDeviation = calculateDeviation(
    metrics.ph,
    OPTIMAL_RANGES.ph.min,
    OPTIMAL_RANGES.ph.max
  );

  return (
    weights.temperature * tempDeviation +
    weights.humidity * humidityDeviation +
    weights.ammonia * ammoniaDeviation +
    weights.ph * phDeviation
  );
}

function calculateDeviation(value: number, min: number, max: number): number {
  if (value < min) {
    return (min - value) / min;
  }
  if (value > max) {
    return (value - max) / max;
  }
  return 0;
}

// Calculate SHAP values based on deviation from optimal ranges
function calculateShapValues(metrics: PoultryMetrics): {
  feature: string;
  importance: number;
  contribution: 'positive' | 'negative';
}[] {
  const shapValues = [
    {
      feature: 'Temperature',
      value: metrics.temperature_C,
      baseline: OPTIMAL_RANGES.temperature.baseline,
      range: {
        min: OPTIMAL_RANGES.temperature.min,
        max: OPTIMAL_RANGES.temperature.max
      }
    },
    {
      feature: 'Humidity',
      value: metrics.humidity_percent,
      baseline: OPTIMAL_RANGES.humidity.baseline,
      range: {
        min: OPTIMAL_RANGES.humidity.min,
        max: OPTIMAL_RANGES.humidity.max
      }
    },
    {
      feature: 'Ammonia',
      value: metrics.ammonia_ppm,
      baseline: OPTIMAL_RANGES.ammonia.baseline,
      range: {
        min: OPTIMAL_RANGES.ammonia.min,
        max: OPTIMAL_RANGES.ammonia.max
      }
    },
    {
      feature: 'pH Level',
      value: metrics.ph,
      baseline: OPTIMAL_RANGES.ph.baseline,
      range: {
        min: OPTIMAL_RANGES.ph.min,
        max: OPTIMAL_RANGES.ph.max
      }
    }
  ];

  return shapValues.map(feature => {
    const deviation = Math.abs(feature.value - feature.baseline);
    const rangeSize = (feature.range.max - feature.range.min) / 2;
    const importance = Math.min(deviation / rangeSize, 1);
    
    // Determine if the value is contributing positively or negatively to risk
    const contribution = 
      (feature.value < feature.range.min || feature.value > feature.range.max) 
        ? 'positive' as const  // Outside optimal range increases risk
        : 'negative' as const; // Within optimal range decreases risk

    return {
      feature: feature.feature,
      importance,
      contribution
    };
  }).sort((a, b) => b.importance - a.importance);
} 