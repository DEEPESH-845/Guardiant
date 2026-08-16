"""
test_detection_quality.py

Guards the properties that make the anomaly service worth deploying. Runs with
plain python (no pytest needed):

    cd model && PYTHONPATH=src:. python tests/test_detection_quality.py

Assumes a trained model in models/ — run `python train_baseline.py` first.
"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.main import detect_anomalies  # noqa: E402
from train_baseline import baseline_transactions  # noqa: E402


def tx(hash_, eth, gas, gwei, ts=1_700_000_000):
    return {
        "hash": hash_,
        "timeStamp": str(ts),
        "value": str(int(eth * 1e18)),
        "gas": str(gas),
        "gasPrice": str(int(gwei * 1e9)),
    }


def test_single_transaction_does_not_crash():
    """A one-row request used to raise (min-max over one row -> NaN)."""
    result = detect_anomalies([tx("0xsingle", 0.05, 21_000, 25)])
    assert len(result) == 1
    assert result[0]["is_anomaly"] is False


def test_score_is_independent_of_batch():
    """The same transaction must score the same whatever it is sent alongside."""
    target = tx("0xtarget", 1.0, 21_000, 50)
    small = [tx(f"0xs{i}", 0.001, 21_000, 20) for i in range(9)]
    large = [tx(f"0xb{i}", 5_000.0, 21_000, 20) for i in range(9)]

    def score(batch):
        return next(r for r in detect_anomalies(batch) if r["transaction_hash"] == "0xtarget")["is_anomaly"]

    assert score([target] + small) == score([target] + large)


def test_catches_a_drain_at_ordinary_gas():
    """The core threat: a huge transfer that looks textbook on every other axis."""
    result = detect_anomalies([tx("0xdrain", 900.0, 21_000, 20)])[0]
    assert result["is_anomaly"] is True
    assert any(a["type"] == "high_value_transaction" for a in result["anomaly_types"])


def test_false_positive_rate_on_held_out_normal_traffic():
    """Held-out sample of the training distribution (different seed) stays quiet."""
    holdout = baseline_transactions(n=1000, seed=1234)
    results = detect_anomalies(holdout)
    fp = sum(1 for r in results if r["is_anomaly"])
    rate = fp / len(results)
    assert rate < 0.05, f"false positive rate {rate:.1%} too high for an alert"
    return rate


def test_recall_on_obvious_attacks():
    attacks = [
        tx("0xa0", 900.0, 21_000, 20),          # large drain, ordinary gas
        tx("0xa1", 1_200.0, 21_000, 900),       # large drain, panic gas
        tx("0xa2", 0.02, 3_000_000, 4_000),     # gas bomb
    ]
    results = {r["transaction_hash"]: r["is_anomaly"] for r in detect_anomalies(attacks)}
    missed = [h for h, flagged in results.items() if not flagged]
    assert not missed, f"missed attacks: {missed}"
    return len(attacks)


if __name__ == "__main__":
    test_single_transaction_does_not_crash()
    test_score_is_independent_of_batch()
    test_catches_a_drain_at_ordinary_gas()
    caught = test_recall_on_obvious_attacks()
    rate = test_false_positive_rate_on_held_out_normal_traffic()
    print(f"OK — recall {caught}/{caught} on obvious attacks, "
          f"false positives {rate:.2%} on 1000 held-out normal transactions")
