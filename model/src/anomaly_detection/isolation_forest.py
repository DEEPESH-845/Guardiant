"""
isolation_forest.py

This module provides functionality for anomaly detection in transaction data using the Isolation Forest algorithm.
Isolation Forest is particularly well-suited for detecting outliers in high-dimensional datasets.

Adheres to the Single Responsibility Principle (SRP) by focusing only on anomaly detection.
"""

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np
import joblib
from utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__)


class AnomalyDetectorIsolationForest:
    """
    AnomalyDetectorIsolationForest uses the Isolation Forest algorithm to detect anomalies in transaction data.
    """

    def __init__(self, df: pd.DataFrame = None, contamination: float = 0.01, random_state: int = 42, should_prepare: bool = True):
        """
        Initializes the anomaly detection model with the provided data.

        :param df: DataFrame containing the transaction data.
        :param contamination: The proportion of outliers in the data set (default is 1%).
        :param random_state: Seed for the random number generator to ensure reproducibility.
        :param should_prepare: Whether to prepare features immediately (default True).
        """
        self.df = df if df is not None else pd.DataFrame()
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(contamination=self.contamination,
                                     random_state=self.random_state)
        self.scaler = StandardScaler()
        self.thresholds = {}
        self.features = None
        self.scaled_features = None
        
        if should_prepare and not self.df.empty:
            self.prepare_features()

    def prepare_features(self):
        """
        Prepare and scale features for anomaly detection.
        """
        if self.df.empty:
            logger.warning("Cannot prepare features: DataFrame is empty")
            return
            
        # Convert values to numeric
        self.df['value'] = pd.to_numeric(self.df['value'], errors='coerce')
        self.df['gas'] = pd.to_numeric(self.df['gas'], errors='coerce')
        self.df['gasPrice'] = pd.to_numeric(self.df['gasPrice'], errors='coerce')
        
        # Calculate additional features
        self.df['value_per_gas'] = self.df['value'] / self.df['gas']
        self.df['total_gas_cost'] = self.df['gas'] * self.df['gasPrice']
        
        # Select features for analysis
        self.features = self.df[['value', 'gas', 'gasPrice', 'value_per_gas', 'total_gas_cost']]
        
        # Scale features
        self.scaled_features = self.scaler.fit_transform(self.features)

    def train_model(self):
        """
        Trains the Isolation Forest model and calculates thresholds for anomaly types.

        :return: Trained Isolation Forest model.
        """
        logger.info("Training Isolation Forest model...")
        self.model.fit(self.scaled_features)
        
        # Calculate thresholds for different types of anomalies
        self.thresholds = {
            'value': np.percentile(self.features['value'], 95),
            'gas': np.percentile(self.features['gas'], 95),
            'gasPrice': np.percentile(self.features['gasPrice'], 95),
            'value_per_gas': np.percentile(self.features['value_per_gas'], 95)
        }
        
        logger.info("Model training completed.")
        return self.model

    def identify_anomaly_type(self, row):
        """
        Identify specific types of anomalies in a transaction.

        :param row: DataFrame row containing transaction data
        :return: List of dictionaries containing anomaly types and details
        """
        anomaly_types = []
        
        if row['value'] > self.thresholds['value']:
            anomaly_types.append({
                'type': 'high_value_transaction',
                'severity': 'high',
                'details': f"Transaction value ({row['value']}) exceeds threshold ({self.thresholds['value']})"
            })
        
        if row['gas'] > self.thresholds['gas']:
            anomaly_types.append({
                'type': 'high_gas_consumption',
                'severity': 'medium',
                'details': f"Gas usage ({row['gas']}) exceeds threshold ({self.thresholds['gas']})"
            })
        
        if row['gasPrice'] > self.thresholds['gasPrice']:
            anomaly_types.append({
                'type': 'high_gas_price',
                'severity': 'medium',
                'details': f"Gas price ({row['gasPrice']}) exceeds threshold ({self.thresholds['gasPrice']})"
            })
        
        if row['value_per_gas'] > self.thresholds['value_per_gas']:
            anomaly_types.append({
                'type': 'unusual_value_gas_ratio',
                'severity': 'low',
                'details': f"Value/gas ratio ({row['value_per_gas']}) is unusually high"
            })
        
        return anomaly_types if anomaly_types else [{'type': 'normal', 'severity': 'none', 'details': 'No anomalies detected'}]

    def detect_anomalies(self):
        """
        Detects anomalies in the dataset using the trained Isolation Forest model.

        :return: DataFrame with detailed anomaly information.
        """
        logger.info("Detecting anomalies using Isolation Forest model...")
        predictions = self.model.predict(self.scaled_features)
        
        # Create results list
        results = []
        for i, (_, row) in enumerate(self.features.iterrows()):
            if predictions[i] == -1:  # If anomaly
                anomaly_types = self.identify_anomaly_type(row)
                is_anomaly = True
            else:
                anomaly_types = [{'type': 'normal', 'severity': 'none', 'details': 'No anomalies detected'}]
                is_anomaly = False
            
            # Convert timestamp to string if it exists
            timestamp = self.df.iloc[i].get('timeStamp')
            if pd.notnull(timestamp):
                if isinstance(timestamp, pd.Timestamp):
                    timestamp = timestamp.isoformat()
                else:
                    timestamp = str(timestamp)
            else:
                timestamp = 'N/A'
            
            result = {
                'transaction_hash': self.df.iloc[i].get('hash', 'N/A'),
                'is_anomaly': is_anomaly,
                'anomaly_types': anomaly_types,
                'transaction_details': {
                    'value': float(row['value']),
                    'gas': float(row['gas']),
                    'gasPrice': float(row['gasPrice']),
                    'timestamp': timestamp
                }
            }
            results.append(result)
        
        # Add results to DataFrame
        self.df['anomaly_result'] = results
        
        num_anomalies = len([r for r in results if r['is_anomaly']])
        logger.info(f"Detected {num_anomalies} anomalous transactions.")
        return self.df

    def save_model(self, path='models'):
        """
        Save the trained model and its components.

        :param path: Directory path to save the model files
        """
        import os
        if not os.path.exists(path):
            os.makedirs(path)
            
        joblib.dump(self.model, f'{path}/isolation_forest.joblib')
        joblib.dump(self.scaler, f'{path}/scaler.joblib')
        joblib.dump(self.thresholds, f'{path}/thresholds.joblib')
        logger.info(f"Model and components saved to {path}/")

    @classmethod
    def load_model(cls, path='models'):
        """
        Load a trained model and its components.

        :param path: Directory path containing the model files
        :return: Initialized AnomalyDetectorIsolationForest instance
        """
        model = joblib.load(f'{path}/isolation_forest.joblib')
        scaler = joblib.load(f'{path}/scaler.joblib')
        thresholds = joblib.load(f'{path}/thresholds.joblib')
        
        # Create instance without preparing features
        instance = cls(should_prepare=False)
        instance.model = model
        instance.scaler = scaler
        instance.thresholds = thresholds
        
        logger.info("Model and components loaded successfully.")
        return instance
