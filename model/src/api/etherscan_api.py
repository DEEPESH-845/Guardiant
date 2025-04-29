"""
etherscan_api.py

This module provides functionality to interact with the Etherscan API for fetching
blockchain transaction data.

Adheres to the Single Responsibility Principle (SRP) by handling only Etherscan API interactions.
"""

import os
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from ..utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__)

class EtherscanAPI:
    """
    Class for interacting with the Etherscan API.
    """
    
    def __init__(self, api_key: str):
        """
        Initialize the EtherscanAPI class.
        
        :param api_key: Etherscan API key
        """
        self.api_key = api_key
        self.base_url = "https://api.etherscan.io/api"
    
    def get_transactions(
        self,
        address: str,
        start_block: int = 0,
        end_block: int = 99999999,
        sort: str = "desc"
    ) -> List[Dict[str, Any]]:
        """
        Get normal transactions for an address.
        
        :param address: Ethereum address
        :param start_block: Starting block number
        :param end_block: Ending block number
        :param sort: Sort order ('asc' or 'desc')
        :return: List of transactions
        """
        try:
            params = {
                "module": "account",
                "action": "txlist",
                "address": address,
                "startblock": start_block,
                "endblock": end_block,
                "sort": sort,
                "apikey": self.api_key
            }
            
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if data["status"] == "1" and data["message"] == "OK":
                return data["result"]
            else:
                logger.error(f"API Error: {data['message']}")
                return []
        
        except Exception as e:
            logger.error(f"Error fetching transactions: {str(e)}", exc_info=True)
            return []
    
    def get_recent_transactions(
        self,
        address: str,
        days: int = 30,
        sort: str = "desc"
    ) -> List[Dict[str, Any]]:
        """
        Get transactions for an address within the last N days.
        
        :param address: Ethereum address
        :param days: Number of days to look back
        :param sort: Sort order ('asc' or 'desc')
        :return: List of transactions
        """
        try:
            # Get current block number
            current_block_params = {
                "module": "proxy",
                "action": "eth_blockNumber",
                "apikey": self.api_key
            }
            
            response = requests.get(self.base_url, params=current_block_params)
            response.raise_for_status()
            
            current_block = int(response.json()["result"], 16)
            
            # Estimate start block (assuming ~15 second block time)
            blocks_per_day = 24 * 60 * 60 // 15  # blocks per day
            start_block = current_block - (blocks_per_day * days)
            
            return self.get_transactions(address, start_block, current_block, sort)
        
        except Exception as e:
            logger.error(f"Error fetching recent transactions: {str(e)}", exc_info=True)
            return []
