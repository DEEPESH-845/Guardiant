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

    FEATURE_COLUMNS = ['value', 'gas', 'gasPrice', 'value_per_gas', 'total_gas_cost']

    def prepare_features(self, fit_scaler: bool = True):
        """
        Prepare and scale features for anomaly detection.

        :param fit_scaler: Fit the scaler on this data (training). False reuses the
            scaler loaded with the model, so a score means the same thing whatever
            else happens to be in the request batch.
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
        self.features = self.df[self.FEATURE_COLUMNS].fillna(0)

        # All five features are wei/gas magnitudes spanning ~6 orders of magnitude
        # and are heavily right-skewed. Standardising them raw leaves everything
        # bar the single largest row within a fraction of a standard deviation of
        # the mean, so the forest can't isolate anything. log1p first.
        logged = np.log1p(self.features.clip(lower=0))

        self.scaled_features = (
            self.scaler.fit_transform(logged) if fit_scaler
            else self.scaler.transform(logged)
        )

    def train_model(self):
        """
        Trains the Isolation Forest model and calculates thresholds for anomaly types.

        :return: Trained Isolation Forest model.
        """
        logger.info("Training Isolation Forest model...")
        self.model.fit(self.scaled_features)
        
        # Hard thresholds, used as a detector in their own right (see
        # detect_anomalies), not just to label what the forest already caught.
        # 99.5th rather than 95th: at 95 these rules would fire on 5% of ordinary
        # traffic, which is unusable as an alert.
        self.thresholds = {
            'value': np.percentile(self.features['value'], 99.5),
            'gas': np.percentile(self.features['gas'], 99.5),
            'gasPrice': np.percentile(self.features['gasPrice'], 99.5),
            'value_per_gas': np.percentile(self.features['value_per_gas'], 99.5)
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
            # Two independent detectors, union'd. The forest catches unusual
            # *combinations* of features; the thresholds catch a single feature
            # going extreme. The forest alone misses a large drain sent at
            # ordinary gas — one feature far out, everything else textbook — which
            # is precisely the event this protocol exists to catch.
            anomaly_types = self.identify_anomaly_type(row)
            breached = [a for a in anomaly_types if a['type'] != 'normal']
            # bool() around the numpy comparison: `np.bool_ or x` returns the
            # np.bool_ itself when truthy, which FastAPI cannot serialise — so
            # any forest-only detection would 500 on the way out.
            is_anomaly = bool(predictions[i] == -1) or bool(breached)

            if not is_anomaly:
                anomaly_types = [{'type': 'normal', 'severity': 'none', 'details': 'No anomalies detected'}]
            elif not breached:
                anomaly_types = [{
                    'type': 'unusual_transaction_pattern',
                    'severity': 'medium',
                    'details': 'Isolation Forest flagged this transaction as an outlier '
                               'relative to normal activity, though no single metric is extreme',
                }]
            else:
                anomaly_types = breached

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
