"""
data_cleaning.py

This module handles data cleaning operations such as removing duplicates, handling missing values,
and filtering invalid transactions. It prepares the dataset for further analysis and ensures data consistency.

Adheres to the Single Responsibility Principle (SRP) by focusing solely on data cleaning.
"""

import pandas as pd
from utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__)


class DataCleaner:
    """
    DataCleaner class handles cleaning and preprocessing of the transaction data.
    """

    def __init__(self, df: pd.DataFrame):
        """
        Initializes the DataCleaner with the provided DataFrame.

        :param df: Pandas DataFrame containing transaction data.
        """
        self.df = df

    def remove_duplicates(self):
        """
        Removes duplicate rows from the DataFrame.

        :return: Cleaned DataFrame without duplicates.
        """
        initial_count = len(self.df)
        # Not inplace: self.df may be a slice of the caller's frame, and mutating
        # a slice raises SettingWithCopyWarning today and silently does nothing
        # under pandas' copy-on-write.
        self.df = self.df.drop_duplicates().copy()
        final_count = len(self.df)
        logger.info(f"Removed {initial_count - final_count} duplicate rows.")
        return self.df

    def handle_missing_values(self):
        """
        Handles missing values by filling them with default values (0 for numerical columns).

        :return: Cleaned DataFrame with no missing values.
        """
        self.df = self.df.fillna(0)
        logger.info("Handled missing values by filling with default value 0.")
        return self.df

    def filter_invalid_transactions(self):
        """
        Filters out invalid transactions, such as those with zero or negative value.

        :return: DataFrame with valid transactions only.
        """
        self.df = self.df.copy()
        self.df['value'] = pd.to_numeric(self.df['value'], errors='coerce')  # Convert values to numeric
        initial_count = len(self.df)
        self.df = self.df[self.df['value'] > 0].copy()  # Keep only transactions with positive values
        final_count = len(self.df)
        logger.info(f"Filtered out {initial_count - final_count} invalid transactions with zero or negative value.")
        return self.df

    def clean_data(self, drop_invalid: bool = True):
        """
        Executes all cleaning steps: removes duplicates, handles missing values, and
        optionally filters invalid transactions.

        :param drop_invalid: Drop zero/negative-value rows. Correct when fitting a
            model, but it must be False when scoring: dropping rows there means the
            caller gets back fewer results than it sent, with no indication which
            ones vanished. Zero-value transactions are ERC-20 approvals and other
            contract calls — the most common rug-pull vector — so silently
            discarding them made the highest-risk transactions render as though
            they had been checked and cleared.
        :return: Fully cleaned DataFrame.
        """
        self.remove_duplicates()
        self.handle_missing_values()
        if drop_invalid:
            self.filter_invalid_transactions()
        else:
            self.df = self.df.copy()
            self.df['value'] = pd.to_numeric(self.df['value'], errors='coerce').fillna(0)
        logger.info("Data cleaning process completed successfully.")
        return self.df
