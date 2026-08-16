import { useState, useEffect } from 'react';
import { usePublicClient, useBlockNumber, useAccount } from 'wagmi';
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
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const walletAddress = address || wagmiAccount.address;

  useEffect(() => {
    let isMounted = true;

    async function fetchTransactionHistory() {
      if (!walletAddress || !publicClient || !blockNumber) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const lookbackBlocks = 10;
        const blockRange = Math.min(Number(blockNumber), lookbackBlocks);

        const processedTxs: Transaction[] = [];

        for (let i = 0; i < blockRange; i++) {
          try {
            const blockNum = BigInt(Number(blockNumber) - i);

            const block = await publicClient.getBlock({
              blockNumber: blockNum,
              includeTransactions: true,
            });

            if (
              !block.transactions ||
              typeof block.transactions[0] === 'string'
            ) {
              continue;
            }

            for (const tx of block.transactions) {
              if (typeof tx === 'string') continue;

              const toAddressLower = tx.to?.toLowerCase() || '';
              const fromAddressLower = tx.from.toLowerCase();
              const userAddressLower = walletAddress.toLowerCase();

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
          } catch (blockError) {
            console.warn(
              `Error processing block ${Number(blockNumber) - i}:`,
              blockError,
            );
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
  }, [walletAddress, publicClient, blockNumber]);

  return { transactions, isLoading, error };
}
