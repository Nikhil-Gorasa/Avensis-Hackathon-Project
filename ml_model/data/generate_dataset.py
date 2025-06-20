# Install dependencies as needed:
# pip install kagglehub[pandas-datasets]
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_dataset():
    # Generate 5000 records of synthetic data
    n_records = 5000
    
    # Generate timestamps
    start_time = datetime.now()
    timestamps = [start_time + timedelta(minutes=i*10) for i in range(n_records)]
    
    # Generate synthetic data with realistic patterns
    np.random.seed(42)
    
    # Temperature: Normal distribution around 25°C with daily patterns
    base_temp = 25 + np.sin(np.linspace(0, 4*np.pi, n_records)) * 2  # Daily pattern
    temperature = base_temp + np.random.normal(0, 1, n_records)
    
    # Humidity: Normal distribution around 60% with inverse relation to temperature
    base_humidity = 60 - (base_temp - 25) * 2  # Inverse relation with temperature
    humidity = base_humidity + np.random.normal(0, 5, n_records)
    humidity = np.clip(humidity, 30, 90)  # Realistic range
    
    # Ammonia: Log-normal distribution with occasional spikes
    base_ammonia = np.random.lognormal(2.5, 0.4, n_records)
    spikes = np.random.choice([0, 1], n_records, p=[0.95, 0.05])  # 5% chance of spikes
    ammonia = base_ammonia + spikes * np.random.uniform(10, 20, n_records)
    ammonia = np.clip(ammonia, 5, 40)  # Realistic range
    
    # pH: Normal distribution around 7 with small variations
    ph = np.random.normal(7, 0.3, n_records)
    ph = np.clip(ph, 6, 8)  # Realistic range
    
    # Create DataFrame
    df = pd.DataFrame({
        'timestamp': timestamps,
        'temperature (°C)': temperature,
        'humidity (%)': humidity,
        'ammonia (ppm)': ammonia,
        'pH': ph
    })
    
    # Add severity labels based on ammonia levels
    def get_severity(ammonia):
        if ammonia < 15:
            return 'Low'
        elif ammonia < 25:
            return 'Medium'
        else:
            return 'High'
    
    df['severity'] = df['ammonia (ppm)'].apply(get_severity)
    
    # Calculate additional features
    df['ammonia_temp_ratio'] = df['ammonia (ppm)'] / df['temperature (°C)']
    df['temp_humidity_interaction'] = df['temperature (°C)'] * df['humidity (%)'] / 100
    
    # Save the processed dataset
    df.to_csv('data/poultry_monitoring_data.csv', index=False)
    
    print(f"Generated dataset with {len(df)} entries")
    print("\nDataset Statistics:")
    print(df.describe())

if __name__ == "__main__":
    generate_dataset()