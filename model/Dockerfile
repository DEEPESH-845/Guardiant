FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY train_baseline.py .

# src/ modules import each other as top-level (`from utils.logger import ...`)
# while src/app.py uses relative imports, so both /app and /app/src must be importable.
ENV PYTHONPATH=/app/src

# Bake a model that matches the installed scikit-learn. Joblib pickles are not
# forward-compatible across sklearn minors, so committed artifacts go stale.
# Fits on a 4000-transaction baseline; replace with a wallet's real history via
# POST /train once ETHERSCAN_API_KEY is set.
RUN python train_baseline.py

ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn src.app:app --host 0.0.0.0 --port ${PORT}"]
