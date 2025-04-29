"""
app.py

This module provides a FastAPI interface for the blockchain anomaly detection system.
It exposes endpoints for model training and anomaly detection.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import json
from datetime import datetime

from .main import train_model, detect_anomalies, setup_environment
from .utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Blockchain Anomaly Detection API",
    description="API for detecting anomalies in blockchain transactions using machine learning",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class Transaction(BaseModel):
    """Pydantic model for a blockchain transaction."""
    hash: str
    timeStamp: str
    value: str
    gas: str
    gasPrice: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "hash": "0x123abc...",
                "timeStamp": "1678901234",
                "value": "1000000000000000000",
                "gas": "21000",
                "gasPrice": "50000000000"
            }
        }

class TransactionList(BaseModel):
    """Pydantic model for a list of transactions."""
    transactions: List[Transaction]

class TrainingResponse(BaseModel):
    """Pydantic model for training response."""
    status: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.now)

class AnomalyDetectionResponse(BaseModel):
    """Pydantic model for anomaly detection response."""
    results: List[Dict[str, Any]]
    timestamp: datetime = Field(default_factory=datetime.now)
    total_transactions: int
    anomalous_transactions: int

def background_train(transactions: List[dict] = None):
    """Background task for model training."""
    try:
        train_model(transactions)
        logger.info("Model training completed successfully")
    except Exception as e:
        logger.error(f"Error in background training: {str(e)}", exc_info=True)

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint that provides basic API information."""
    return {
        "message": "Welcome to the Blockchain Anomaly Detection API",
        "version": "1.0.0",
        "endpoints": {
            "POST /train": "Train the anomaly detection model",
            "POST /detect": "Detect anomalies in transactions",
            "GET /model/status": "Check model status"
        }
    }

@app.post("/train", response_model=TrainingResponse, tags=["Model Management"])
async def train(
    background_tasks: BackgroundTasks,
    transactions: Optional[TransactionList] = None
):
    """
    Train the anomaly detection model.
    
    - If transactions are provided, uses them for training
    - If no transactions are provided, fetches data from Etherscan
    - Training runs in the background
    
    Returns:
        TrainingResponse: Status of the training request
    """
    try:
        trans_list = [t.dict() for t in transactions.transactions] if transactions else None
        background_tasks.add_task(background_train, trans_list)
        
        return TrainingResponse(
            status="success",
            message="Model training started in background"
        )
    
    except Exception as e:
        logger.error(f"Error initiating training: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect", response_model=AnomalyDetectionResponse, tags=["Anomaly Detection"])
async def detect(transactions: TransactionList):
    """
    Detect anomalies in provided transactions.
    
    Args:
        transactions (TransactionList): List of transactions to analyze
    
    Returns:
        AnomalyDetectionResponse: Detection results for each transaction
    """
    try:
        # Check if model exists
        if not os.path.exists('models/isolation_forest.joblib'):
            raise HTTPException(
                status_code=400,
                detail="No trained model found. Please train the model first."
            )
        
        # Convert Pydantic model to list of dicts
        trans_list = [t.dict() for t in transactions.transactions]
        
        # Detect anomalies
        results = detect_anomalies(trans_list)
        
        # Count anomalous transactions
        anomalous = sum(1 for r in results if r['is_anomaly'])
        
        return AnomalyDetectionResponse(
            results=results,
            total_transactions=len(results),
            anomalous_transactions=anomalous
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during anomaly detection: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/status", tags=["Model Management"])
async def model_status():
    """
    Check if a trained model exists and get its details.
    
    Returns:
        dict: Model status information
    """
    model_path = 'models/isolation_forest.joblib'
    if not os.path.exists(model_path):
        return JSONResponse(
            status_code=404,
            content={
                "status": "not_found",
                "message": "No trained model found"
            }
        )
    
    # Get model file details
    stats = os.stat(model_path)
    
    return {
        "status": "available",
        "last_modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
        "size_bytes": stats.st_size
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    ) 