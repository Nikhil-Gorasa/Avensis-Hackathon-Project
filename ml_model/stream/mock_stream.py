import pandas as pd
import numpy as np
import time

def generate_mock_sensor_data():
    return {
        "timestamp": pd.Timestamp.now(),
        "temperature_C": np.random.normal(30, 2),
        "humidity_%": np.random.normal(60, 10),
        "ammonia_ppm": np.random.normal(12, 5),
        "ph": np.random.normal(6.8, 0.3)
    }

def stream_data(n=100, delay=0.1):
    for _ in range(n):
        row = generate_mock_sensor_data()
        yield row
        time.sleep(delay)