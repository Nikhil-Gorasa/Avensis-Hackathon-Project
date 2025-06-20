import streamlit as st
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import time
import plotly.graph_objects as go
import os
import json
from sklearn.ensemble import IsolationForest

# Set page config
st.set_page_config(
    page_title="Poultry Conditions Monitor",
    page_icon="🐔",
    layout="wide"
)

# Initialize session state
if 'historical_data' not in st.session_state:
    st.session_state.historical_data = []
if 'anomaly_detector' not in st.session_state:
    st.session_state.anomaly_detector = None
if 'is_first_run' not in st.session_state:
    st.session_state.is_first_run = True
if 'monitoring_active' not in st.session_state:
    st.session_state.monitoring_active = False
if 'system_status' not in st.session_state:
    st.session_state.system_status = {
        'last_update': None,
        'anomalies_detected': 0,
        'total_readings': 0
    }
if 'current_metrics' not in st.session_state:
    st.session_state.current_metrics = None
if 'current_status' not in st.session_state:
    st.session_state.current_status = None
if 'current_anomaly' not in st.session_state:
    st.session_state.current_anomaly = None

# Sidebar
st.sidebar.title("Navigation")
selected_tab = st.sidebar.radio("Select Tab", ["Home", "System Status", "Settings"])

# Load feature configuration
@st.cache_resource
def load_feature_config():
    try:
        with open("model/feature_config.json", "r") as f:
            return json.load(f)
    except Exception as e:
        st.error(f"Error loading feature configuration: {str(e)}")
        return None

feature_config = load_feature_config()

# Load model and scaler
@st.cache_resource
def load_models():
    try:
        model = joblib.load("model/severity_model.pkl")
        scaler = joblib.load("model/scaler.pkl")
        return model, scaler
    except Exception as e:
        st.error(f"Error loading models: {str(e)}")
        return None, None

model, scaler = load_models()

def initialize_anomaly_detector():
    """Initialize the Isolation Forest anomaly detector."""
    detector = IsolationForest(
        contamination=0.1,  # Expected proportion of anomalies
        random_state=42,
        n_estimators=100
    )
    return detector

def calculate_anomaly_threshold(scores):
    """Calculate the anomaly threshold based on the contamination rate."""
    return np.percentile(scores, 10)  # Using 10th percentile as threshold (0.1 contamination)

def detect_anomalies(data, retrain=False):
    """Detect anomalies in the current readings."""
    if len(data) < 10:  # Need some minimum data points
        return None
        
    # Prepare features for anomaly detection
    features = ['temperature_C', 'humidity_%', 'ammonia_ppm', 'ph']
    X = pd.DataFrame(data)[features]
    
    # Initialize or retrain detector if needed
    if retrain or st.session_state.anomaly_detector is None:
        st.session_state.anomaly_detector = initialize_anomaly_detector()
        st.session_state.anomaly_detector.fit(X)
        # Calculate and store threshold
        train_scores = st.session_state.anomaly_detector.score_samples(X)
        st.session_state.anomaly_threshold = calculate_anomaly_threshold(train_scores)
    
    # Get anomaly scores for the latest reading
    latest_data = X.iloc[-1:]
    score = st.session_state.anomaly_detector.score_samples(latest_data)[0]
    
    # Convert score to probability-like value (0 to 1)
    probability = 1 / (1 + np.exp(-score))
    
    return {
        'is_anomaly': score < st.session_state.anomaly_threshold,
        'anomaly_score': probability,
        'features': {
            feat: 1 if abs(latest_data[feat].iloc[0] - X[feat].mean()) > 2 * X[feat].std() else 0
            for feat in features
        }
    }

def generate_sample_data(n_samples=100):
    data = {
        'temperature_C': np.random.uniform(20, 35, n_samples),
        'humidity_%': np.random.uniform(40, 90, n_samples),
        'ammonia_ppm': np.random.uniform(5, 25, n_samples)
    }
    return pd.DataFrame(data)

@st.cache_data
def load_dataset():
    try:
        df = generate_sample_data()
        return df
    except Exception as e:
        st.error(f"Error loading dataset: {str(e)}")
        return None

df = load_dataset()

def generate_ph(row):
    base_ph = 7.0
    temp = float(row['temperature_C'])
    humidity = float(row['humidity_%'])
    ammonia = float(row['ammonia_ppm'])
    
    if temp > 30:
        base_ph += np.random.uniform(0.5, 1.0)
    if humidity > 70:
        base_ph += np.random.uniform(0.3, 0.7)
    if ammonia > 15:
        base_ph += np.random.uniform(0.4, 0.8)
    return round(base_ph + np.random.normal(0, 0.2), 2)

def prepare_features(data):
    if feature_config is None:
        raise ValueError("Feature configuration not loaded")
        
    df = data.copy()
    
    numeric_columns = ['temperature_C', 'humidity_%', 'ammonia_ppm', 'ph']
    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='raise')
    
    df['temp_humidity_interaction'] = df['temperature_C'] * df['humidity_%'] / 100
    df['ammonia_temp_ratio'] = df['ammonia_ppm'] / df['temperature_C']
    
    all_features = feature_config['feature_names'] + feature_config['engineered_features']
    return df[all_features]

def update_chart(historical_data, container):
    if not historical_data:
        return
    
    df_hist = pd.DataFrame(historical_data)
    
    fig = go.Figure()
    
    # Add traces for each metric
    fig.add_trace(go.Scatter(x=df_hist['timestamp'], y=pd.to_numeric(df_hist['temperature_C']),
                            name='Temperature (°C)', line=dict(color='red')))
    fig.add_trace(go.Scatter(x=df_hist['timestamp'], y=pd.to_numeric(df_hist['humidity_%']),
                            name='Humidity (%)', line=dict(color='blue')))
    fig.add_trace(go.Scatter(x=df_hist['timestamp'], y=pd.to_numeric(df_hist['ammonia_ppm']),
                            name='Ammonia (ppm)', line=dict(color='green')))
    fig.add_trace(go.Scatter(x=df_hist['timestamp'], y=pd.to_numeric(df_hist['ph']),
                            name='pH', line=dict(color='purple')))
    
    # Add anomaly score if available
    if len(historical_data) >= 10:
        anomaly_scores = [reading.get('anomaly_score', None) for reading in historical_data]
        if any(score is not None for score in anomaly_scores):
            fig.add_trace(go.Scatter(x=df_hist['timestamp'], y=anomaly_scores,
                                   name='Anomaly Score', line=dict(color='orange', dash='dash')))
    
    fig.update_layout(
        title='Real-time Poultry Conditions Monitoring',
        xaxis_title='Time',
        yaxis_title='Values',
        height=400
    )
    
    container.plotly_chart(fig, use_container_width=True)

def get_severity_color(severity):
    severity_colors = {
        'Low': 'success',
        'Medium': 'info',
        'High': 'warning',
        'Critical': 'error'
    }
    return severity_colors.get(severity, 'info')

def get_severity_icon(severity):
    severity_icons = {
        'Low': '✅',
        'Medium': 'ℹ️',
        'High': '⚠️',
        'Critical': '🚨'
    }
    return severity_icons.get(severity, 'ℹ️')

def render_home_tab():
    st.title("🐔 Poultry Conditions Monitoring System")
    st.markdown("""
    This application monitors real-time poultry conditions and predicts severity levels based on environmental factors.
    It also detects anomalies in the measurements using Isolation Forest algorithm.
    """)
    
    # Display current metrics if they exist
    if st.session_state.current_metrics is not None:
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Temperature (°C)", f"{st.session_state.current_metrics['temperature_C']:.1f}")
        col2.metric("Humidity (%)", f"{st.session_state.current_metrics['humidity_%']:.1f}")
        col3.metric("Ammonia (ppm)", f"{st.session_state.current_metrics['ammonia_ppm']:.1f}")
        col4.metric("pH", f"{st.session_state.current_metrics['ph']:.2f}")
    
    # Display chart if there's historical data
    if st.session_state.historical_data:
        update_chart(st.session_state.historical_data, st.empty())
    
    # Display current status if it exists
    if st.session_state.current_status is not None:
        severity = st.session_state.current_status
        severity_color = get_severity_color(severity)
        severity_icon = get_severity_icon(severity)
        
        if severity_color == 'error':
            st.error(f"{severity_icon} Critical Severity Level: {severity}")
        elif severity_color == 'warning':
            st.warning(f"{severity_icon} High Severity Level: {severity}")
        elif severity_color == 'info':
            st.info(f"{severity_icon} Medium Severity Level: {severity}")
        else:
            st.success(f"{severity_icon} Normal Conditions: {severity}")
    
    # Display current anomaly status if it exists
    if st.session_state.current_anomaly is not None:
        anomaly_result = st.session_state.current_anomaly
        if anomaly_result['is_anomaly']:
            st.error("🚨 Anomaly Detected!")
            st.write("Anomalous Features:")
            for feat, is_anomalous in anomaly_result['features'].items():
                if is_anomalous:
                    st.warning(f"- {feat} shows unusual values")
            st.write(f"Anomaly Score: {anomaly_result['anomaly_score']:.2f}")
        else:
            st.success("✅ No anomalies detected")
            st.write(f"Normal operation score: {anomaly_result['anomaly_score']:.2f}")
    
    # Start monitoring button
    if not st.session_state.monitoring_active:
        if st.button("Start Monitoring", key="start_monitoring"):
            st.session_state.monitoring_active = True
            st.rerun()
    
    # Monitoring loop
    if st.session_state.monitoring_active:
        st.write("🚀 Real-time monitoring started...")
        progress_bar = st.progress(0)
        placeholder = st.empty()
        
        try:
            df = load_dataset()
            for idx, row in df.iterrows():
                with placeholder.container():
                    reading = {
                        'temperature_C': float(row['temperature_C']),
                        'humidity_%': float(row['humidity_%']),
                        'ammonia_ppm': float(row['ammonia_ppm']),
                        'timestamp': datetime.now()
                    }
                    reading['ph'] = generate_ph(reading)
                    
                    # Update current metrics
                    st.session_state.current_metrics = reading
                    
                    # Prepare data for prediction
                    pred_data = pd.DataFrame([reading])
                    pred_data = prepare_features(pred_data)
                    
                    # Make prediction
                    scaled = scaler.transform(pred_data)
                    severity = model.predict(scaled)[0]
                    
                    # Update current status
                    st.session_state.current_status = severity
                    
                    # Add to historical data
                    reading['severity'] = severity
                    st.session_state.historical_data.append(reading)
                    
                    # Update system status
                    st.session_state.system_status['last_update'] = datetime.now()
                    st.session_state.system_status['total_readings'] += 1
                    
                    # Detect anomalies
                    if len(st.session_state.historical_data) >= 10:
                        anomaly_result = detect_anomalies(
                            st.session_state.historical_data,
                            retrain=len(st.session_state.historical_data) % 10 == 0
                        )
                        if anomaly_result:
                            reading['anomaly_score'] = anomaly_result['anomaly_score']
                            st.session_state.current_anomaly = anomaly_result
                            if anomaly_result['is_anomaly']:
                                st.session_state.system_status['anomalies_detected'] += 1
                    
                    # Update progress
                    progress = (idx + 1) / len(df)
                    progress_bar.progress(progress)
                    
                    # Force UI update
                    st.rerun()
                    
                    time.sleep(2)
            
            st.success("✅ Monitoring session completed!")
            st.session_state.monitoring_active = False
            
        except Exception as e:
            st.error(f"An error occurred during monitoring: {str(e)}")
            st.session_state.monitoring_active = False

def render_system_status_tab():
    st.title("System Status")
    
    # Display system metrics
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Total Readings", st.session_state.system_status['total_readings'])
    
    with col2:
        st.metric("Anomalies Detected", st.session_state.system_status['anomalies_detected'])
    
    with col3:
        if st.session_state.system_status['last_update']:
            last_update = st.session_state.system_status['last_update'].strftime("%Y-%m-%d %H:%M:%S")
            st.metric("Last Update", last_update)
        else:
            st.metric("Last Update", "Never")
    
    # Display historical data table
    if st.session_state.historical_data:
        st.subheader("Historical Data")
        df_hist = pd.DataFrame(st.session_state.historical_data)
        df_hist['timestamp'] = pd.to_datetime(df_hist['timestamp'])
        df_hist = df_hist.sort_values('timestamp', ascending=False)
        
        # Format the timestamp and select columns to display
        df_display = df_hist.copy()
        df_display['timestamp'] = df_display['timestamp'].dt.strftime("%Y-%m-%d %H:%M:%S")
        columns_to_display = ['timestamp', 'temperature_C', 'humidity_%', 'ammonia_ppm', 'ph', 'severity']
        if 'anomaly_score' in df_display.columns:
            columns_to_display.append('anomaly_score')
        
        st.dataframe(df_display[columns_to_display], use_container_width=True)

def render_settings_tab():
    st.title("Settings")
    
    # Add settings options here
    st.subheader("Anomaly Detection Settings")
    contamination = st.slider("Anomaly Threshold (contamination)", 0.01, 0.5, 0.1, 0.01,
                            help="Lower values mean fewer anomalies will be detected")
    
    n_estimators = st.slider("Number of Estimators", 50, 200, 100, 10,
                            help="Higher values may provide better accuracy but slower performance")
    
    if st.button("Apply Settings"):
        # Reinitialize anomaly detector with new settings
        st.session_state.anomaly_detector = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=42
        )
        st.success("Settings applied successfully!")

# Main content based on selected tab
if selected_tab == "Home":
    render_home_tab()
elif selected_tab == "System Status":
    render_system_status_tab()
else:  # Settings tab
    render_settings_tab()