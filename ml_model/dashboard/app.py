import streamlit as st
import pandas as pd
import numpy as np
import joblib
import json
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import tensorflow as tf
import sys
import os
from plotly.subplots import make_subplots
import time
from pathlib import Path
import asyncio
import threading

# Add parent directory to Python path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from explain.shap_explain import PoultryModelExplainer
from stream.mock_stream import generate_mock_sensor_data

# Set page config
st.set_page_config(
    page_title="Poultry Environment Monitor",
    page_icon="🐔",
    layout="wide"
)

# Custom CSS for dark theme
st.markdown("""
    <style>
    /* Main app background and text */
    .stApp {
        background-color: #1a1a1a;
        color: #ffffff;
    }
    
    /* Sidebar */
    .css-1d391kg {
        background-color: #2d2d2d;
    }
    
    /* Headers */
    h1, h2, h3, h4, h5, h6 {
        color: #ffffff !important;
    }
    
    /* Metric cards */
    .metric-card {
        background-color: #2d2d2d;
        padding: 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        margin-bottom: 1rem;
        text-align: center;
        border: 1px solid #3d3d3d;
    }
    
    /* Status indicators */
    .status-good {
        color: #00ff00;
        font-weight: bold;
    }
    .status-warning {
        color: #ffbb00;
        font-weight: bold;
    }
    .status-danger {
        color: #ff4444;
        font-weight: bold;
    }
    
    /* Metric values and labels */
    .metric-value {
        font-size: 28px;
        font-weight: bold;
        margin: 10px 0;
        color: #ffffff;
    }
    .metric-label {
        font-size: 16px;
        color: #888888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .metric-unit {
        font-size: 14px;
        color: #666666;
    }
    
    /* Chart container */
    .chart-container {
        background-color: #2d2d2d;
        padding: 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        margin-bottom: 1rem;
        border: 1px solid #3d3d3d;
    }
    
    /* Streamlit elements */
    .stSlider, .stSelectbox {
        background-color: #2d2d2d;
    }
    .streamlit-expanderHeader {
        background-color: #2d2d2d !important;
        color: #ffffff !important;
    }
    .streamlit-expanderContent {
        background-color: #2d2d2d !important;
        color: #ffffff !important;
    }
    </style>
""", unsafe_allow_html=True)

# Initialize session state
if 'history' not in st.session_state:
    st.session_state.history = pd.DataFrame(columns=[
        'timestamp', 'temperature (°C)', 'humidity (%)', 
        'ammonia (ppm)', 'pH', 'severity', 
        'ammonia_temp_ratio', 'temp_humidity_interaction'
    ])
if 'last_update' not in st.session_state:
    st.session_state.last_update = None

# Color scheme for dark theme
COLORS = {
    'temperature': '#ff7f0e',  # Bright Orange
    'humidity': '#1f77b4',     # Bright Blue
    'ammonia': '#2ca02c',      # Bright Green
    'ph': '#ff4444',          # Bright Red
    'background': '#1a1a1a',   # Dark Background
    'grid': '#333333',         # Dark Gray Grid
    'text': '#ffffff'          # White Text
}

@st.cache_resource
def load_models():
    try:
        model_dir = Path("model")
        severity_model = joblib.load(model_dir / "severity_model.pkl")
        scaler = joblib.load(model_dir / "scaler.pkl")
        anomaly_detector = joblib.load(model_dir / "anomaly_detector.pkl")
        with open(model_dir / "feature_config.json", "r") as f:
            feature_config = json.load(f)
        return severity_model, scaler, anomaly_detector, feature_config
    except Exception as e:
        st.error(f"Error loading models: {str(e)}")
        return None, None, None, None

@st.cache_data
def load_historical_data():
    try:
        return pd.read_csv("data/poultry_monitoring_data.csv")
    except Exception as e:
        st.error(f"Error loading historical data: {str(e)}")
        return pd.DataFrame()

# Load models and data
severity_model, scaler, anomaly_detector, feature_config = load_models()
historical_data = load_historical_data()
explainer = PoultryModelExplainer()

def generate_reading():
    """Generate a realistic sensor reading using mock stream"""
    try:
        # Get data from mock stream
        data = generate_mock_sensor_data()
        
        # Convert to our expected format
        reading = {
            'temperature (°C)': data['temperature_C'],
            'humidity (%)': data['humidity_%'],
            'ammonia (ppm)': data['ammonia_ppm'],
            'pH': data['ph']
        }
        
        return reading
    except Exception as e:
        st.error(f"Error generating reading: {str(e)}")
        return None

def update_history(reading):
    """Update history with new reading"""
    try:
        if reading is None:
            return
            
        reading['timestamp'] = datetime.now()
        reading['ammonia_temp_ratio'] = reading['ammonia (ppm)'] / reading['temperature (°C)']
        reading['temp_humidity_interaction'] = reading['temperature (°C)'] * reading['humidity (%)'] / 100
        
        # Get predictions
        features = np.array([[
            reading['temperature (°C)'],
            reading['humidity (%)'],
            reading['ammonia (ppm)'],
            reading['pH'],
            reading['ammonia_temp_ratio'],
            reading['temp_humidity_interaction']
        ]])
        
        if scaler is not None and severity_model is not None:
            features_scaled = scaler.transform(features)
            severity = severity_model.predict(features_scaled)[0]
            reading['severity'] = severity
        else:
            reading['severity'] = 'Unknown'
        
        # Add to history
        new_row = pd.DataFrame([reading])
        st.session_state.history = pd.concat([st.session_state.history, new_row], ignore_index=True)
        st.session_state.last_update = datetime.now()
    except Exception as e:
        st.error(f"Error updating history: {str(e)}")

def create_metric_card(label, value, unit=""):
    return f"""
        <div class="metric-card">
            <div class="metric-label">{label}</div>
            <div class="metric-value">{value:.1f}<span class="metric-unit">{unit}</span></div>
        </div>
    """

def start_streaming():
    """Initialize the streaming thread"""
    if 'streaming_thread' not in st.session_state:
        st.session_state.stop_streaming = False
        thread = threading.Thread(target=stream_data)
        thread.daemon = True
        st.session_state.streaming_thread = thread
        thread.start()

def stop_streaming():
    """Stop the streaming thread"""
    if 'streaming_thread' in st.session_state:
        st.session_state.stop_streaming = True
        st.session_state.streaming_thread.join(timeout=1)
        del st.session_state.streaming_thread

def stream_data():
    """Continuously stream data in the background"""
    while not st.session_state.stop_streaming:
        reading = generate_reading()
        if reading is not None:
            update_history(reading)
        time.sleep(st.session_state.update_interval)

def main():
    st.title("🐔 Poultry Environment Monitoring System")
    
    # Initialize update interval in session state
    if 'update_interval' not in st.session_state:
        st.session_state.update_interval = 3
    
    # Sidebar
    with st.sidebar:
        st.header("System Controls")
        auto_update = st.checkbox("Enable Auto-Update", value=True)
        st.session_state.update_interval = st.slider("Update Interval (seconds)", 1, 10, st.session_state.update_interval)
        
        if auto_update:
            start_streaming()
        else:
            stop_streaming()
        
        st.markdown("---")
        st.markdown("### System Status")
        st.markdown("✅ All Sensors Active")
        if all(model is not None for model in [severity_model, scaler, anomaly_detector]):
            st.markdown("✅ Models Loaded")
        else:
            st.markdown("❌ Model Loading Error")
        if not historical_data.empty:
            st.markdown("✅ Historical Data Loaded")
        else:
            st.markdown("❌ Historical Data Error")
        
        if st.session_state.last_update:
            st.markdown(f"Last Update: {st.session_state.last_update.strftime('%H:%M:%S')}")
            if 'streaming_thread' in st.session_state and st.session_state.streaming_thread.is_alive():
                st.markdown("✅ Streaming Active")
            else:
                st.markdown("⏸️ Streaming Paused")
    
    # Main content
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("Real-time Monitoring")
        
        # Display current metrics
        if len(st.session_state.history) > 0:
            latest = st.session_state.history.iloc[-1]
            
            metrics_cols = st.columns(4)
            with metrics_cols[0]:
                st.markdown(create_metric_card("Temperature", latest['temperature (°C)'], "°C"), unsafe_allow_html=True)
            with metrics_cols[1]:
                st.markdown(create_metric_card("Humidity", latest['humidity (%)'], "%"), unsafe_allow_html=True)
            with metrics_cols[2]:
                st.markdown(create_metric_card("Ammonia", latest['ammonia (ppm)'], " ppm"), unsafe_allow_html=True)
            with metrics_cols[3]:
                st.markdown(create_metric_card("pH", latest['pH'], ""), unsafe_allow_html=True)
            
            # Risk Level
            risk_color = {
                'Low': 'status-good',
                'Medium': 'status-warning',
                'High': 'status-danger',
                'Unknown': 'status-warning'
            }
            st.markdown(f"""
                <div class="metric-card">
                    <h3>Current Risk Level: 
                        <span class="{risk_color[latest['severity']]}">
                            {latest['severity']}
                        </span>
                    </h3>
                </div>
            """, unsafe_allow_html=True)
        
        # Historical Charts
        st.markdown("### Historical Trends")
        if len(st.session_state.history) > 0:
            fig = make_subplots(
                rows=2, cols=2,
                subplot_titles=("Temperature", "Humidity", "Ammonia", "pH"),
                vertical_spacing=0.12,
                horizontal_spacing=0.1
            )
            
            # Add traces
            fig.add_trace(
                go.Scatter(x=st.session_state.history['timestamp'], 
                          y=st.session_state.history['temperature (°C)'],
                          name="Temperature",
                          line=dict(color=COLORS['temperature'], width=2)),
                row=1, col=1
            )
            fig.add_trace(
                go.Scatter(x=st.session_state.history['timestamp'], 
                          y=st.session_state.history['humidity (%)'],
                          name="Humidity",
                          line=dict(color=COLORS['humidity'], width=2)),
                row=1, col=2
            )
            fig.add_trace(
                go.Scatter(x=st.session_state.history['timestamp'], 
                          y=st.session_state.history['ammonia (ppm)'],
                          name="Ammonia",
                          line=dict(color=COLORS['ammonia'], width=2)),
                row=2, col=1
            )
            fig.add_trace(
                go.Scatter(x=st.session_state.history['timestamp'], 
                          y=st.session_state.history['pH'],
                          name="pH",
                          line=dict(color=COLORS['ph'], width=2)),
                row=2, col=2
            )
            
            # Update layout for dark theme
            fig.update_layout(
                height=600,
                showlegend=False,
                plot_bgcolor=COLORS['background'],
                paper_bgcolor=COLORS['background'],
                margin=dict(l=40, r=40, t=40, b=40),
                font=dict(color=COLORS['text'])
            )
            
            # Update axes for dark theme
            for i in range(1, 3):
                for j in range(1, 3):
                    fig.update_xaxes(
                        showgrid=True,
                        gridwidth=1,
                        gridcolor=COLORS['grid'],
                        color=COLORS['text'],
                        row=i,
                        col=j
                    )
                    fig.update_yaxes(
                        showgrid=True,
                        gridwidth=1,
                        gridcolor=COLORS['grid'],
                        color=COLORS['text'],
                        row=i,
                        col=j
                    )
            
            st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("Analysis & Insights")
        
        if len(st.session_state.history) > 0:
            latest = st.session_state.history.iloc[-1]
            
            try:
                # SHAP Analysis
                st.markdown("### Feature Importance")
                with st.spinner("Generating feature importance analysis..."):
                    feature_data = {
                        'temperature (°C)': latest['temperature (°C)'],
                        'humidity (%)': latest['humidity (%)'],
                        'ammonia (ppm)': latest['ammonia (ppm)'],
                        'pH': latest['pH']
                    }
                    explanation = explainer.explain_prediction(feature_data)
                    
                    # Display feature importance plot
                    st.image("explain/outputs/feature_importance.png")
                    
                    # Display prediction probabilities with better formatting
                    st.markdown("### Risk Level Probabilities")
                    cols = st.columns(len(explanation['probabilities']))
                    for i, (severity, prob) in enumerate(explanation['probabilities'].items()):
                        with cols[i]:
                            st.metric(
                                label=severity,
                                value=f"{prob:.1%}",
                                delta=None,
                                delta_color="normal"
                            )
                    
                    # Display anomaly detection with more context
                    st.markdown("### Anomaly Detection")
                    if explanation['is_anomaly']:
                        st.warning(
                            "⚠️ Unusual pattern detected\n\n"
                            f"Anomaly score: {explanation['anomaly_score']:.2f}\n\n"
                            "This indicates that the current readings deviate significantly from normal patterns."
                        )
                    else:
                        st.success(
                            "✅ Normal operation detected\n\n"
                            f"Confidence score: {-explanation['anomaly_score']:.2f}\n\n"
                            "All sensor readings are within expected patterns."
                        )
                    
            except Exception as e:
                st.error("Unable to generate feature importance analysis")
                st.info(
                    "This could be due to:\n"
                    "1. Model configuration mismatch\n"
                    "2. Unexpected sensor readings\n"
                    "3. Internal processing error\n\n"
                    "The system will continue monitoring while this is resolved."
                )
                print(f"Detailed error: {str(e)}")  # For debugging
            
            # Recommendations
            st.markdown("### Recommendations")
            if latest['severity'] == 'High':
                st.error("⚠️ Immediate action required:")
                st.markdown("- Increase ventilation")
                st.markdown("- Check ammonia control systems")
                st.markdown("- Monitor bird behavior closely")
            elif latest['severity'] == 'Medium':
                st.warning("⚠️ Monitor closely:")
                st.markdown("- Consider increasing ventilation")
                st.markdown("- Check environmental controls")
            else:
                st.success("✅ Environment is optimal")
                st.markdown("- Continue regular monitoring")
                st.markdown("- Maintain current settings")

if __name__ == "__main__":
    main()