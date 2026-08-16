"""
app.py

This module provides a FastAPI interface for the blockchain anomaly detection system.
It exposes endpoints for model training and anomaly detection.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import hmac
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

# CORS. allow_credentials is False: combined with allow_origins=["*"] Starlette
# echoes the caller's own Origin back and sets Access-Control-Allow-Credentials,
# which is the one CORS configuration browsers treat as "any site may make
# authenticated cross-origin calls here". Nothing in this API uses cookies, so
# credentials are simply off.
_allowed_origins = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Train-Key"],
)

# Retraining replaces the model that every /detect call is scored against, so on
# a public deployment it is the most damaging endpoint here: crafted training
# data teaches the detector that a drain is normal. Fails closed — without a key
# configured, training is disabled rather than open.
TRAIN_API_KEY = os.getenv("TRAIN_API_KEY", "")


def _authorize_training(provided: Optional[str]) -> None:
    if not TRAIN_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Training is disabled. Set TRAIN_API_KEY to enable it.",
        )
    # compare_digest to keep the comparison constant-time.
    if not provided or not hmac.compare_digest(provided, TRAIN_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing X-Train-Key")

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
    # Bounded so a single unauthenticated request cannot pin the free-tier CPU
    # this runs on. The frontend proxy caps at 500; this backstops direct callers.
    transactions: List[Transaction] = Field(..., min_length=1, max_length=1000)

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
    transactions: Optional[TransactionList] = None,
    x_train_key: Optional[str] = Header(default=None, alias="X-Train-Key"),
):
    """
    Train the anomaly detection model.
    
    - If transactions are provided, uses them for training
    - If no transactions are provided, fetches data from Etherscan
    - Training runs in the background
    
    Returns:
        TrainingResponse: Status of the training request
    """
    _authorize_training(x_train_key)

    try:
        trans_list = [t.dict() for t in transactions.transactions] if transactions else None
        background_tasks.add_task(background_train, trans_list)

        return TrainingResponse(
            status="success",
            message="Model training started in background"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating training: {str(e)}", exc_info=True)
        # Detail withheld: str(e) leaks paths and library internals to callers.
        raise HTTPException(status_code=500, detail="Internal server error")

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
        # Detail withheld: str(e) leaks paths and library internals to callers.
        raise HTTPException(status_code=500, detail="Internal server error")

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
    # Logged with a traceback server-side; the response carried str(exc) before,
    # which hands filesystem paths and library internals to any caller.
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "timestamp": datetime.now().isoformat()
        }
    ) 