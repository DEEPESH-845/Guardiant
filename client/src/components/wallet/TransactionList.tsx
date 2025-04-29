'use client';

import { useState } from 'react';
import {
  FaChevronRight,
  FaExchangeAlt,
  FaExternalLinkAlt,
  FaBug,
} from 'react-icons/fa';
import {
  useTransactionHistory,
  Transaction,
} from '../../hooks/useTransactionHistory';
import { useWalletContext } from '../../context/WalletContext';
import { usePublicClient, useBlockNumber } from 'wagmi';

interface TransactionListProps {
  limit?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const shortenAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatValue = (value: string) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue === 0) return '0 ETH';

  return `${numValue.toFixed(numValue < 0.001 ? 6 : 4)} ETH`;
};

export default function TransactionList({
  limit,
  showViewAll = false,
  onViewAll,
}: TransactionListProps) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const pageSize = limit || 5;

  const { transactions, isLoading, error } = useTransactionHistory();
  const { address, isConnected } = useWalletContext();
  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber();

  if (showDebug) {
    return (
      <div className="bg-background/20 backdrop-blur-sm rounded-lg border border-foreground/10 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-medium text-white">Debug Information</h3>
          <button
            onClick={() => setShowDebug(false)}
            className="text-white bg-foreground/10 px-3 py-1 rounded-md"
          >
            Close Debug
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 text-white text-sm mb-4">
          <div>
            <p className="text-foreground">Connected Address:</p>
            <p className="font-mono">{address || 'Not connected'}</p>
          </div>
          <div>
            <p className="text-foreground">Current Block Number:</p>
            <p>{blockNumber ? blockNumber.toString() : 'Unknown'}</p>
          </div>
          <div>
            <p className="text-foreground">Public Client Available:</p>
            <p>{publicClient ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-foreground">Loading State:</p>
            <p>{isLoading ? 'Loading...' : 'Completed'}</p>
          </div>
          <div>
            <p className="text-foreground">Error:</p>
            <p className="text-red-400">{error ? error.message : 'None'}</p>
          </div>
          <div>
            <p className="text-foreground">Transactions Count:</p>
            <p>{transactions.length}</p>
          </div>
        </div>

        <button
          onClick={() => setShowDebug(false)}
          className="w-full bg-foreground/10 hover:bg-foreground/20 text-white py-2 rounded-lg"
        >
          Return to Transactions
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 text-center text-white">
        Connect your wallet to view your transaction history
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center text-white">
        Loading transactions...
        <button
          onClick={() => setShowDebug(true)}
          className="ml-2 text-foreground hover:text-white text-sm"
        >
          <FaBug />
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">{error.message}</p>
        <button
          onClick={() => setShowDebug(true)}
          className="mt-2 text-white hover:text-foreground transition-colors"
        >
          Show Debug Info
        </button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-6 text-center text-white">
        No transactions found
        <button
          onClick={() => setShowDebug(true)}
          className="ml-2 text-foreground hover:text-white"
        >
          <FaBug />
        </button>
      </div>
    );
  }

  const totalPages = Math.ceil(transactions.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const displayedTransactions = transactions.slice(
    startIndex,
    startIndex + pageSize,
  );

  const handlePrevPage = () => {
    setPage((p) => Math.max(1, p - 1));
    setSelected(null);
  };

  const handleNextPage = () => {
    setPage((p) => Math.min(totalPages, p + 1));
    setSelected(null);
  };

  const handleTransactionClick = (txHash: string) => {
    setSelected((prev) => (prev === txHash ? null : txHash));
  };

  return (
    <div className="bg-background/20 backdrop-blur-sm rounded-lg border border-foreground/10">
      <div className="flex justify-end p-2">
        <button
          onClick={() => setShowDebug(true)}
          className="text-foreground hover:text-white"
          title="Debug Transaction Loading"
        >
          <FaBug />
        </button>
      </div>

      {displayedTransactions && displayedTransactions.length > 0 ? (
        displayedTransactions.map((tx) => (
          <div
            key={tx.hash}
            className="border-b border-foreground/10 last:border-0"
          >
            <div
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-foreground/5"
              onClick={() => handleTransactionClick(tx.hash)}
            >
              <div className="flex items-center gap-4">
                <div className="bg-foreground/10 p-3 rounded-full">
                  {tx.isIncoming ? (
                    <FaChevronRight className="text-green-400" />
                  ) : (
                    <FaExchangeAlt className="text-blue-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white">
                    {tx.isIncoming ? 'Received' : 'Sent'}
                  </h3>
                  <p className="text-foreground text-sm">
                    {formatDate(tx.timestamp)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">
                  {formatValue(tx.value)}
                </p>
                <p className="text-foreground text-sm">
                  {tx.isIncoming ? 'From: ' : 'To: '}
                  {shortenAddress(tx.isIncoming ? tx.from : tx.to || '')}
                </p>
              </div>
            </div>

            {/* Transaction details */}
            {selected === tx.hash && (
              <div className="p-6 bg-foreground/5 border-t border-foreground/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-foreground text-sm">Transaction Hash:</p>
                    <p className="text-white font-mono text-sm break-all">
                      {tx.hash}
                    </p>
                  </div>
                  <div>
                    <p className="text-foreground text-sm">Block Timestamp:</p>
                    <p className="text-white">{formatDate(tx.timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-foreground text-sm">From:</p>
                    <p className="text-white font-mono text-sm break-all">
                      {tx.from}
                    </p>
                  </div>
                  <div>
                    <p className="text-foreground text-sm">To:</p>
                    <p className="text-white font-mono text-sm break-all">
                      {tx.to || 'Contract Creation'}
                    </p>
                  </div>
                  <div>
                    <p className="text-foreground text-sm">Value:</p>
                    <p className="text-white">{formatValue(tx.value)}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <a
                    href={`https://etherscan.io/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-foreground hover:text-white transition-colors"
                  >
                    <span>View on Etherscan</span>
                    <FaExternalLinkAlt />
                  </a>
                </div>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="p-6 text-center text-white">
          No transactions to display
          <button
            onClick={() => setShowDebug(true)}
            className="ml-2 text-foreground hover:text-white"
          >
            <FaBug />
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="p-4 flex items-center justify-between border-t border-foreground/10">
          <button
            onClick={handlePrevPage}
            disabled={page === 1}
            className="bg-foreground/10 px-4 py-2 rounded-lg text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-white">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={page === totalPages}
            className="bg-foreground/10 px-4 py-2 rounded-lg text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {showViewAll && transactions && transactions.length > 0 && (
        <div className="p-4 flex justify-center border-t border-foreground/10">
          <button
            onClick={onViewAll}
            className="bg-foreground/10 px-6 py-2 rounded-lg text-white hover:bg-foreground/20 transition-colors"
          >
            View All Transactions
          </button>
        </div>
      )}
    </div>
  );
}
