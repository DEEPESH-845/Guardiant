FROM python:3.11-slim

# Hugging Face Spaces runs the container as uid 1000, not root. get_logger() opens
# a RotatingFileHandler in logs/ at *import* time, so a root-owned /app means the
# import fails with PermissionError and the Space never boots. Create the user up
# front and give it ownership of everything it writes (logs/, and models/ on
# retrain via POST /train).
RUN useradd -m -u 1000 user

WORKDIR /app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user src ./src
COPY --chown=user train_baseline.py .

# src/ modules import each other as top-level (`from utils.logger import ...`)
# while src/app.py uses relative imports, so both /app and /app/src must be importable.
ENV PYTHONPATH=/app/src \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

USER user

# Bake a model that matches the installed scikit-learn. Joblib pickles are not
# forward-compatible across sklearn minors, so committed artifacts go stale.
# Fits on a 4000-transaction baseline; replace with a wallet's real history via
# POST /train once ETHERSCAN_API_KEY is set. Runs as `user` so the resulting
# models/ and logs/ are writable at runtime.
RUN python train_baseline.py

ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn src.app:app --host 0.0.0.0 --port ${PORT}"]
