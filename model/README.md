---
title: Guardiant Anomaly Detection
emoji: 🛡️
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# Guardiant — Blockchain Anomaly Detection API

FastAPI service that scores Ethereum transactions with an Isolation Forest,
plus rule-based thresholds on value / gas / gasPrice.

## Endpoints

| Method | Path            | Purpose                                                        |
| ------ | --------------- | -------------------------------------------------------------- |
| GET    | `/`             | Service info                                                   |
| GET    | `/docs`         | Interactive OpenAPI docs                                       |
| GET    | `/model/status` | Whether a trained model exists, and when it was written        |
| POST   | `/train`        | Retrain — from a posted transaction list, or from Etherscan    |
| POST   | `/detect`       | Score a list of transactions                                   |

```bash
curl -X POST "$BASE_URL/detect" -H 'Content-Type: application/json' -d '{
  "transactions": [
    {"hash":"0x1","timeStamp":"1678901234","value":"1000000000000000000","gas":"21000","gasPrice":"50000000000"}
  ]
}'
```

## Running locally

```bash
python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt
PYTHONPATH=src .venv/bin/uvicorn src.app:app --port 8000
```

`PYTHONPATH=src` is required: modules under `src/` import each other as
top-level packages (`from utils.logger import ...`) while `src/app.py` uses
relative imports, so both the repo root and `src/` must be on the path.

## Model artifacts

The Docker build trains a model from `example_transactions.json` so the image
always ships artifacts matching its installed scikit-learn version — joblib
pickles are not forward-compatible across sklearn minor releases.

That baked model is a placeholder trained on two rows. For meaningful scoring,
set `ETHERSCAN_API_KEY` and `ETHERSCAN_ADDRESS` and `POST /train` with no body
to retrain against real transaction history. Note that the container filesystem
is ephemeral, so a retrained model is lost on restart.

## Known limitations

- `DataTransformer` min–max normalises `value` **within each request batch**,
  so a single-transaction request always normalises to 0. Score in batches.
- `src/visualization/` and `src/anomaly_detection/arima_model.py` need
  `matplotlib`, `seaborn`, and `statsmodels`, which are not in
  `requirements.txt` — they are not on the API path.
