"""
logger.py

This module provides centralized logging functionality for the application. It ensures
that all modules have consistent and structured logging. Logs can be output to both 
the console and a file for long-term storage and analysis.

Adheres to the Single Responsibility Principle (SRP) by handling only logging-related operations.
"""

import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from .config import LOG_LEVEL


def get_logger(name: str) -> logging.Logger:
    """
    Configures and returns a logger instance with the specified name.

    :param name: The name of the logger, typically the module name.
    :return: Configured logger instance.
    """
    # Create logger
    logger = logging.getLogger(name)
    
    # Only configure logger if it hasn't been configured yet
    if not logger.handlers:
        logger.setLevel(LOG_LEVEL)
        
        # Create logs directory if it doesn't exist
        if not os.path.exists('logs'):
            os.makedirs('logs')
        
        # Create formatters and handlers
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # File handler with rotation
        file_handler = RotatingFileHandler(
            f'logs/app_{datetime.now().strftime("%Y%m%d")}.log',
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        
        # Add handlers to logger
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger
