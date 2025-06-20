import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import kagglehub
import json
import os

# Since we don't have access to the Kaggle dataset, let's create synthetic data
def generate_synthetic_data(n_samples=1000):
    np.random.seed(42)
    data = {
        'temperature_C': np.random.normal(30, 2, n_samples),
        'humidity_%': np.random.normal(60, 10, n_samples),
        'ammonia_ppm': np.random.normal(12, 5, n_samples),
    }
    return pd.DataFrame(data)

class PoultryHealthModel:
    def __init__(self):
        self.scaler = StandardScaler()
        self.classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        self.anomaly_detector = IsolationForest(
            contamination=0.1,
            random_state=42
        )
        self.feature_names = ["temperature_C", "humidity_%", "ammonia_ppm", "ph"]
        
    def generate_ph(self, row):
        base_ph = 7.0
        if row['temperature_C'] > 30:
            base_ph += np.random.uniform(0.5, 1.0)
        if row['humidity_%'] > 70:
            base_ph += np.random.uniform(0.3, 0.7)
        if row['ammonia_ppm'] > 15:
            base_ph += np.random.uniform(0.4, 0.8)
        return round(base_ph + np.random.normal(0, 0.2), 2)

    def preprocess_data(self, df):
        # Add pH values
        df['ph'] = df.apply(self.generate_ph, axis=1)
        
        # Feature engineering
        df['temp_humidity_interaction'] = df['temperature_C'] * df['humidity_%'] / 100
        df['ammonia_temp_ratio'] = df['ammonia_ppm'] / df['temperature_C']
        
        return df

    def label_severity(self, row):
        if (row["ammonia_ppm"] > 20) or (row["ph"] > 8.0) or (row["temperature_C"] > 35):
            return "High"
        elif (row["ammonia_ppm"] > 14) or (row["ph"] > 7.5) or (row["temperature_C"] > 32):
            return "Medium"
        else:
            return "Low"

    def train(self, df):
        # Preprocess data
        df = self.preprocess_data(df)
        df["severity_label"] = df.apply(self.label_severity, axis=1)
        
        # Prepare features
        features = self.feature_names + ['temp_humidity_interaction', 'ammonia_temp_ratio']
        X = df[features]
        y = df["severity_label"]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train models
        self.classifier.fit(X_train_scaled, y_train)
        self.anomaly_detector.fit(X_train_scaled)
        
        # Evaluate models
        cv_scores = cross_val_score(self.classifier, X_train_scaled, y_train, cv=5)
        y_pred = self.classifier.predict(X_test_scaled)
        
        # Save evaluation metrics
        metrics = {
            "cv_scores_mean": float(cv_scores.mean()),
            "cv_scores_std": float(cv_scores.std()),
            "classification_report": classification_report(y_test, y_pred, output_dict=True)
        }
        
        os.makedirs("model", exist_ok=True)
        with open("model/metrics.json", "w") as f:
            json.dump(metrics, f, indent=4)
        
        return metrics

    def save_models(self):
        os.makedirs("model", exist_ok=True)
        joblib.dump(self.classifier, "model/severity_model.pkl")
        joblib.dump(self.scaler, "model/scaler.pkl")
        joblib.dump(self.anomaly_detector, "model/anomaly_detector.pkl")
        
        # Save feature names for consistency
        with open("model/feature_config.json", "w") as f:
            json.dump({
                "feature_names": self.feature_names,
                "engineered_features": ['temp_humidity_interaction', 'ammonia_temp_ratio']
            }, f, indent=4)

if __name__ == "__main__":
    print("Generating synthetic training data...")
    df = generate_synthetic_data(n_samples=1000)
    
    print("Training models...")
    model = PoultryHealthModel()
    metrics = model.train(df)
    model.save_models()
    
    print("\n✅ Models trained and saved successfully!")
    print(f"Cross-validation accuracy: {metrics['cv_scores_mean']:.3f} ± {metrics['cv_scores_std']:.3f}")
    print("\nModel files saved in the 'model' directory:")