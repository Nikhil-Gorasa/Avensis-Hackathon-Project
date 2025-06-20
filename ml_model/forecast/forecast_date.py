import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
import joblib
import json
import os
from datetime import datetime, timedelta

def generate_synthetic_timeseries(n_samples=1000):
    # Generate timestamps
    base_time = datetime.now() - timedelta(days=n_samples/24)
    timestamps = [base_time + timedelta(hours=i) for i in range(n_samples)]
    
    # Generate synthetic data with daily and weekly patterns plus noise
    time_points = np.linspace(0, 4*np.pi, n_samples)
    
    # Temperature: Daily cycle (20-35°C) + weekly trend + noise
    temp = 27.5 + 7.5 * np.sin(time_points) + 2 * np.sin(time_points/7) + np.random.normal(0, 1, n_samples)
    
    # Humidity: Inverse relationship with temperature (40-80%) + noise
    humidity = 60 - 20 * np.sin(time_points) + 5 * np.sin(time_points/7) + np.random.normal(0, 2, n_samples)
    
    # Ammonia: Gradual buildup and ventilation cycles (5-20 ppm) + noise
    ammonia = 12.5 + 7.5 * np.sin(time_points/2) + 2 * np.sin(time_points*2) + np.random.normal(0, 1, n_samples)
    
    # pH: Subtle variations (6.5-7.5) + noise
    ph = 7 + 0.5 * np.sin(time_points/3) + np.random.normal(0, 0.1, n_samples)
    
    # Create DataFrame
    df = pd.DataFrame({
        'timestamp': timestamps,
        'temperature_C': np.clip(temp, 20, 35),
        'humidity_%': np.clip(humidity, 40, 80),
        'ammonia_ppm': np.clip(ammonia, 5, 20),
        'ph': np.clip(ph, 6.5, 7.5)
    })
    
    return df

class PoultryForecaster:
    def __init__(self, sequence_length=24, prediction_length=24):
        self.sequence_length = sequence_length
        self.prediction_length = prediction_length
        self.scalers = {}
        self.model = None
        
        # Load feature configuration
        with open("model/feature_config.json", "r") as f:
            self.feature_config = json.load(f)
        
        # Create models directory if it doesn't exist
        os.makedirs("forecast/models", exist_ok=True)
    
    def create_sequences(self, data):
        X, y = [], []
        for i in range(len(data) - self.sequence_length - self.prediction_length + 1):
            X.append(data[i:(i + self.sequence_length)])
            y.append(data[(i + self.sequence_length):(i + self.sequence_length + self.prediction_length)])
        return np.array(X), np.array(y)
    
    def build_model(self, n_features):
        model = tf.keras.Sequential([
            tf.keras.layers.LSTM(64, input_shape=(self.sequence_length, n_features), return_sequences=True),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.LSTM(32),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(self.prediction_length * n_features)
        ])
        model.compile(optimizer='adam', loss='mse')
        return model
    
    def train(self, data, epochs=50, validation_split=0.2):
        # Scale features
        self.scalers = {}
        scaled_data = np.zeros_like(data)
        
        for i, feature in enumerate(self.feature_config["feature_names"]):
            scaler = MinMaxScaler()
            scaled_data[:, i] = scaler.fit_transform(data[:, i].reshape(-1, 1)).ravel()
            self.scalers[feature] = scaler
        
        # Create sequences
        X, y = self.create_sequences(scaled_data)
        
        # Reshape y to match model output
        y = y.reshape(y.shape[0], -1)
        
        # Build and train model
        self.model = self.build_model(data.shape[1])
        history = self.model.fit(
            X, y,
            epochs=epochs,
            validation_split=validation_split,
            verbose=1
        )
        
        return history
    
    def save_models(self):
        # Save LSTM model
        self.model.save("forecast/models/lstm_model.keras")
        
        # Save scalers
        joblib.dump(self.scalers, "forecast/models/scalers.pkl")
    
    def predict_future(self, sequence):
        # Load models if not initialized
        if self.model is None:
            self.model = tf.keras.models.load_model("forecast/models/lstm_model.keras")
            self.scalers = joblib.load("forecast/models/scalers.pkl")
        
        # Scale input sequence
        scaled_sequence = np.zeros_like(sequence)
        for i, feature in enumerate(self.feature_config["feature_names"]):
            scaled_sequence[:, i] = self.scalers[feature].transform(sequence[:, i].reshape(-1, 1)).ravel()
        
        # Make prediction
        scaled_pred = self.model.predict(scaled_sequence.reshape(1, self.sequence_length, -1))
        scaled_pred = scaled_pred.reshape(self.prediction_length, -1)
        
        # Inverse transform predictions
        predictions = []
        for i in range(self.prediction_length):
            row = {}
            for j, feature in enumerate(self.feature_config["feature_names"]):
                value = self.scalers[feature].inverse_transform(
                    scaled_pred[i, j].reshape(-1, 1)
                )[0, 0]
                row[feature] = value
            predictions.append(row)
        
        return predictions

if __name__ == "__main__":
    print("Generating synthetic time series data...")
    df = generate_synthetic_timeseries()
    
    print("Training forecasting model...")
    forecaster = PoultryForecaster()
    history = forecaster.train(df[forecaster.feature_config["feature_names"]].values)
    
    print(f"Final loss: {history.history['loss'][-1]:.4f}")
    print(f"Final validation loss: {history.history['val_loss'][-1]:.4f}")
    
    print("Saving models...")
    forecaster.save_models()
    print("Done!")