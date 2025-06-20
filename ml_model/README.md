# Poultry Environment Monitoring and Analysis System

## Overview
This project implements an intelligent monitoring system for poultry environments, combining real-time sensor data analysis, predictive modeling, and automated alerts. The system helps poultry farmers maintain optimal environmental conditions by monitoring critical parameters such as temperature, humidity, ammonia levels, and pH.

## Project Structure
```
ml_model/
├── data/
│   ├── poultry_monitoring_data.csv    # Generated dataset for training and testing
│   └── Egg_Production.csv             # Original dataset
├── model/
│   ├── severity_model.pkl             # Trained classifier for risk assessment
│   ├── scaler.pkl                     # Data standardization model
│   ├── anomaly_detector.pkl           # Anomaly detection model
│   └── feature_config.json            # Feature configuration settings
├── explain/
│   ├── shap_explain.py               # SHAP-based model explanation module
│   └── outputs/                      # Directory for SHAP visualization outputs
├── forecast/
│   ├── forecast_date.py              # Time series forecasting module
│   └── models/
│       ├── lstm_model.keras          # Trained LSTM model for forecasting
│       └── scalers.pkl               # Scalers for forecast data preprocessing
└── dashboard/
    └── app.py                        # Streamlit dashboard application

## Features

### 1. Real-time Monitoring
- Continuous tracking of environmental parameters:
  - Temperature (°C)
  - Humidity (%)
  - Ammonia Levels (ppm)
  - pH Levels
- Real-time data visualization and trend analysis
- Automatic refresh and update capabilities

### 2. Risk Assessment
- Three-level severity classification:
  - Low Risk
  - Medium Risk
  - High Risk
- Based on environmental parameter thresholds
- Instant alerts for critical conditions

### 3. Anomaly Detection
- Advanced anomaly detection for unusual patterns
- Calculation of anomaly scores
- Early warning system for potential issues

### 4. Predictive Analytics
- LSTM-based time series forecasting
- 24-hour ahead predictions for all parameters
- Confidence intervals for predictions
- Trend analysis and pattern recognition

### 5. Model Explainability
- SHAP (SHapley Additive exPlanations) implementation
- Feature importance visualization
- Transparent decision-making process
- Interactive explanation plots

### 6. Interactive Dashboard
- Modern, user-friendly interface
- Real-time monitoring displays
- Historical data analysis
- Forecasting visualizations
- Alert configuration and management
- Customizable reporting system

## Technical Details

### Data Processing
- Sequential timestamp generation
- Feature engineering and scaling
- Automated data cleaning and validation
- Handling of missing values and outliers

### Machine Learning Models
1. **Severity Classification Model**
   - Random Forest Classifier
   - Cross-validation accuracy: 0.991 ± 0.008
   - Feature importance analysis

2. **Anomaly Detection**
   - Isolation Forest algorithm
   - Contamination factor: 0.1
   - Real-time anomaly scoring

3. **Forecasting Model**
   - LSTM neural network
   - Sequence length: 24 hours
   - Multi-step ahead prediction
   - Feature-wise scaling

### Model Explanation
- SHAP values calculation
- Feature contribution analysis
- Global and local explanations
- Interactive visualization outputs

## Installation and Setup

### Prerequisites
```bash
# Required Python packages
pip install streamlit pandas numpy tensorflow scikit-learn shap plotly
```

### Environment Setup
1. Clone the repository
2. Install dependencies
3. Ensure all required models are in their respective directories
4. Configure feature settings in `model/feature_config.json`

### Running the Application
```bash
# Start the Streamlit dashboard
streamlit run dashboard/app.py
```

## Current Status
- ✅ Data generation and preprocessing pipeline
- ✅ Severity classification model
- ✅ Anomaly detection system
- ✅ SHAP explanation module
- ✅ LSTM forecasting model
- ✅ Interactive dashboard
- ✅ Real-time monitoring system
- ✅ Alert configuration system

## Next Steps
1. Implement automated model retraining
2. Add more advanced visualization options
3. Enhance alert notification system
4. Implement user authentication
5. Add data export capabilities
6. Develop mobile application interface

## Contributing
This project is under active development. Contributions, suggestions, and feedback are welcome.

## License
[MIT License](LICENSE)

## Contact
For questions and support, please open an issue in the repository.