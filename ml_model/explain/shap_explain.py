import shap
import joblib
import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt
import os

class PoultryModelExplainer:
    def __init__(self):
        try:
            # Load models and configurations
            self.classifier = joblib.load("model/severity_model.pkl")
            self.scaler = joblib.load("model/scaler.pkl")
            self.anomaly_detector = joblib.load("model/anomaly_detector.pkl")
            
            with open("model/feature_config.json", "r") as f:
                self.feature_config = json.load(f)
            
            # Initialize SHAP explainer
            self.explainer = shap.TreeExplainer(self.classifier)
            
            # Create output directory if it doesn't exist
            os.makedirs("explain/outputs", exist_ok=True)
        except Exception as e:
            print(f"Error initializing PoultryModelExplainer: {str(e)}")
            raise
        
    def prepare_features(self, reading):
        try:
            # Create DataFrame with base features
            df = pd.DataFrame([reading])
            
            # First map from UI names to internal names
            ui_to_internal = {
                'temperature (°C)': 'temperature_C',
                'humidity (%)': 'humidity_%',
                'ammonia (ppm)': 'ammonia_ppm',
                'pH': 'ph'
            }
            
            # Rename columns to match model's expected format
            df = df.rename(columns=ui_to_internal)
            
            # Add engineered features
            df['temp_humidity_interaction'] = df['temperature_C'] * df['humidity_%'] / 100
            df['ammonia_temp_ratio'] = df['ammonia_ppm'] / df['temperature_C']
            
            # Ensure all required features are present
            required_features = self.feature_config["feature_names"] + self.feature_config["engineered_features"]
            missing_features = set(required_features) - set(df.columns)
            if missing_features:
                raise ValueError(f"Missing required features: {missing_features}")
            
            # Return features in the correct order
            return df[required_features]
        except Exception as e:
            print(f"Error preparing features: {str(e)}")
            print("Expected features:", required_features)
            print("Available features:", list(df.columns))
            raise
        
    def explain_prediction(self, reading):
        try:
            # Prepare features
            X = self.prepare_features(reading)
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Get predictions
            severity_proba = self.classifier.predict_proba(X_scaled)[0]
            severity_idx = np.argmax(severity_proba)
            severity = self.classifier.classes_[severity_idx]
            
            # Get anomaly score
            anomaly_score = self.anomaly_detector.score_samples(X_scaled)[0]
            is_anomaly = self.anomaly_detector.predict(X_scaled)[0] == -1
            
            # Get SHAP values
            shap_values = self.explainer.shap_values(X)
            
            # Create and save feature importance plot with better formatting
            plt.figure(figsize=(10, 6))
            shap.summary_plot(
                shap_values, 
                X,
                plot_type="bar",
                show=False,
                feature_names=[
                    "Temperature",
                    "Humidity",
                    "Ammonia",
                    "pH",
                    "Temp-Humidity",
                    "Ammonia-Temp"
                ]
            )
            plt.title("Feature Importance Analysis", pad=20)
            plt.tight_layout()
            plt.savefig("explain/outputs/feature_importance.png", bbox_inches='tight', dpi=300, facecolor='white')
            plt.close()
            
            # Create probabilities dictionary
            probabilities = {
                class_name: float(prob)
                for class_name, prob in zip(self.classifier.classes_, severity_proba)
            }
            
            return {
                "prediction": severity,
                "probabilities": probabilities,
                "is_anomaly": bool(is_anomaly),
                "anomaly_score": float(anomaly_score)
            }
        except Exception as e:
            print(f"Error in explain_prediction: {str(e)}")
            raise

if __name__ == "__main__":
    # Test sample
    sample_data = {
        "temperature (°C)": 32,
        "humidity (%)": 65,
        "ammonia (ppm)": 22,
        "pH": 8.2
    }
    
    explainer = PoultryModelExplainer()
    explanation = explainer.explain_prediction(sample_data)
    
    print("\n🔍 Model Explanation Results:")
    print(f"Prediction: {explanation['prediction']}")
    print(f"Probabilities: {explanation['probabilities']}")
    print(f"Anomaly Detected: {'Yes' if explanation['is_anomaly'] else 'No'}")
    print(f"Anomaly Score: {explanation['anomaly_score']:.3f}")
    print("\n✅ Explanation visualizations saved in explain/outputs/")