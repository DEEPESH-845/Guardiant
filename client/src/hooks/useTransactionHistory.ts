import { useState, useEffect } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { useWalletContext } from '../context/WalletContext';

export interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  timestamp: number;
  isIncoming: boolean;
  /** wei, as decimal strings — what the anomaly model consumes */
  valueWei: string;
  gas: string;
  gasPrice: string;
}

export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const wagmiAccount = useAccount();
  const { address, isConnected } = useWalletContext();
  const publicClient = usePublicClient();

  const walletAddress = address || wagmiAccount.address;

  useEffect(() => {
    let isMounted = true;

    async function fetchTransactionHistory() {
      if (!walletAddress || !publicClient) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Read the head here rather than from useBlockNumber({ watch: true }).
        // Watching put a value that changes every block into this effect's
        // dependency array, so the whole scan re-ran on every new block (~12s on
        // Sepolia) on top of the 30s interval — enough to exhaust a public RPC's
        // rate limit, and it re-triggered the anomaly request each time too.
        const head = await publicClient.getBlockNumber();

        const lookbackBlocks = 10;
        const blockRange = Math.min(Number(head), lookbackBlocks);

        // Fetched together instead of awaited one at a time: the requests are
        // independent, so serialising them multiplied latency by the lookback.
        const blocks = await Promise.all(
          Array.from({ length: blockRange }, (_, i) =>
            publicClient
              .getBlock({
                blockNumber: head - BigInt(i),
                includeTransactions: true,
              })
              .catch((blockError) => {
                console.warn(
                  `Error processing block ${head - BigInt(i)}:`,
                  blockError,
                );
                return null;
              }),
          ),
        );

        const processedTxs: Transaction[] = [];
        const userAddressLower = walletAddress.toLowerCase();

        for (const block of blocks) {
          if (!block?.transactions) continue;

          for (const tx of block.transactions) {
            if (typeof tx === 'string') continue;

            const toAddressLower = tx.to?.toLowerCase() || '';
            const fromAddressLower = tx.from.toLowerCase();

            const isIncoming = toAddressLower === userAddressLower;
            const isOutgoing = fromAddressLower === userAddressLower;

            if (isIncoming || isOutgoing) {
              processedTxs.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: formatEther(tx.value),
                timestamp: Number(block.timestamp),
                isIncoming,
                valueWei: tx.value.toString(),
                gas: tx.gas.toString(),
                gasPrice: (tx.gasPrice ?? tx.maxFeePerGas ?? 0n).toString(),
              });
            }
          }
        }

        if (!isMounted) return;

        processedTxs.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(processedTxs);
      } catch (err) {
        console.error('Error fetching transaction history:', err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error('Failed to fetch transactions'),
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTransactionHistory();

    const intervalId = setInterval(fetchTransactionHistory, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [walletAddress, publicClient]);

  return { transactions, isLoading, error };
}
