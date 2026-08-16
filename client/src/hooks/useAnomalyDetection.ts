import { useEffect, useState } from 'react';
import type { Transaction } from './useTransactionHistory';

export interface AnomalyType {
  type: string;
  severity: string;
  details: string;
}

export interface AnomalyResult {
  is_anomaly: boolean;
  anomaly_types: AnomalyType[];
}

/**
 * Scores transactions with the Isolation Forest service via /api/anomaly.
 * Returns a hash -> result map; an unreachable service yields an empty map
 * rather than an error, so the transaction list still renders.
 */
export function useAnomalyDetection(transactions: Transaction[]) {
  const [results, setResults] = useState<Record<string, AnomalyResult>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-run only when the actual set of hashes changes.
  const key = transactions.map((t) => t.hash).join(',');

  useEffect(() => {
    if (transactions.length === 0) {
      setResults({});
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch('/api/anomaly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: transactions.map((t) => ({
          hash: t.hash,
          timeStamp: String(t.timestamp),
          value: t.valueWei,
          gas: t.gas,
          gasPrice: t.gasPrice,
        })),
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Detection failed');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const byHash: Record<string, AnomalyResult> = {};
        for (const r of data.results ?? []) {
          byHash[r.transaction_hash] = {
            is_anomaly: r.is_anomaly,
            anomaly_types: r.anomaly_types ?? [],
          };
        }
        setResults(byHash);
      })
      .catch((err) => {
        if (cancelled) return;
        setResults({});
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { results, isLoading, error };
}
