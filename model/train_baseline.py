"""
train_baseline.py

Fits the Isolation Forest on a baseline of ordinary EOA activity so the shipped
model has a usable notion of "normal". Run at image build time.

The corpus is synthetic and seeded: it is a stand-in for a wallet's own history,
not a claim about real Ethereum. Replace it with real data by setting
ETHERSCAN_API_KEY / ETHERSCAN_ADDRESS on the host and calling POST /train with no
body, or POST /train with a wallet's real transaction list.

Distributions are log-normal because transfer values and gas prices are: the
median transfer is small, the tail is long, and it is the tail that the detector
has to reason about.
"""

import numpy as np

from src.main import setup_environment, train_model

SEED = 42
N = 4000


def baseline_transactions(n: int = N, seed: int = SEED) -> list[dict]:
    rng = np.random.default_rng(seed)

    # Value: median ~0.05 ETH, long right tail out to a few ETH.
    value_eth = rng.lognormal(mean=np.log(0.05), sigma=1.4, size=n)

    # Gas: 80% plain transfers at the 21000 floor, 20% contract calls.
    is_transfer = rng.random(n) < 0.8
    gas = np.where(
        is_transfer,
        21_000,
        rng.integers(45_000, 250_000, size=n),
    )

    # Gas price: median ~25 gwei, spikes during congestion.
    gas_price_gwei = rng.lognormal(mean=np.log(25), sigma=0.6, size=n)

    # One transaction every ~10 minutes on average, oldest first.
    gaps = rng.exponential(scale=600, size=n).cumsum()
    base_ts = 1_700_000_000

    return [
        {
            "hash": f"0x{i:064x}",
            "timeStamp": str(int(base_ts + gaps[i])),
            "value": str(int(value_eth[i] * 1e18)),
            "gas": str(int(gas[i])),
            "gasPrice": str(int(gas_price_gwei[i] * 1e9)),
        }
        for i in range(n)
    ]


if __name__ == "__main__":
    setup_environment()
    transactions = baseline_transactions()
    train_model(transactions)
    print(f"Trained baseline model on {len(transactions)} transactions.")
