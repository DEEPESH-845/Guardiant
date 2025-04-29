'use client';

import { useState, useRef } from 'react';
import {
  FaEthereum,
  FaBitcoin,
  FaChevronRight,
  FaWallet,
  FaHistory,
  FaExchangeAlt,
  FaPlus,
  FaMinus,
} from 'react-icons/fa';
import { SiChainlink, SiPolkadot } from 'react-icons/si';
import { Connect } from '../../components/wallet/Connect';
import BlurText from '../../components/animated/BlurText';
import CircularText from '../../components/animated/Circular';
import RotatingText from '../../components/animated/Rotate';
import { useCryptoPrice } from '../../hooks/useCryptoPrice';
import { EXAMPLE_TOKENS } from '../../lib/contract';
import { useAccount } from 'wagmi';
import {
  useWalletFunctions,
  useGetUserTokens,
  useGetTokenBalance,
  useAddToken,
  useRemoveToken,
  useNativeBalance,
  formatBalance,
} from '../../hooks/useContractFunctions';
import { useWalletContext } from '../../context/WalletContext';
import { useTransactionHistory } from '../../hooks/useTransactionHistory';
import TransactionList from '../../components/wallet/TransactionList';
import Link from 'next/link';

const TokenBalance = ({ tokenAddress }: { tokenAddress: `0x${string}` }) => {
  const { balance, isLoading, isError } = useGetTokenBalance(tokenAddress);
  const { balance: ethBalance, isLoading: ethLoading } = useNativeBalance();

  const isEth = tokenAddress === EXAMPLE_TOKENS.ETH;
  const displayBalance = isEth ? ethBalance : balance;
  const displayLoading = isEth ? ethLoading : isLoading;

  if (displayLoading) return <span className="text-white">Loading...</span>;
  if (isError)
    return <span className="text-red-400">Error loading balance</span>;

  return <span className="text-white">{formatBalance(displayBalance)}</span>;
};

const TokenDisplay = ({
  token,
  symbol,
  price,
}: {
  token: `0x${string}`;
  symbol: string;
  price: number;
}) => {
  const { balance, isLoading } = useGetTokenBalance(token);

  const { balance: ethBalance, isLoading: ethLoading } = useNativeBalance();

  const isEth = token === EXAMPLE_TOKENS.ETH;
  const displayBalance = isEth ? ethBalance : balance;
  const displayLoading = isEth ? ethLoading : isLoading;

  const usdValue = !displayLoading ? parseFloat(displayBalance) * price : 0;

  if (displayLoading) return <span className="text-white">Loading...</span>;

  return (
    <div className="flex flex-col">
      <span className="text-white font-medium">
        {formatBalance(displayBalance)} {symbol}
      </span>
      <span className="text-foreground text-sm">
        ≈ ${usdValue.toFixed(2)} USD
      </span>
    </div>
  );
};

const AddTokenForm = () => {
  const [tokenAddress, setTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const { addToken, isPending, isSuccess, isError } = useAddToken();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenAddress && amount) {
      addToken(tokenAddress as `0x${string}`, amount);
      if (isSuccess) {
        setTokenAddress('');
        setAmount('');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-foreground mb-2">Token Address</label>
        <input
          type="text"
          placeholder="0x..."
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="w-full bg-background/50 border border-foreground/20 rounded-lg p-3 text-white"
        />
      </div>
      <div>
        <label className="block text-foreground mb-2">Amount</label>
        <input
          type="text"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-background/50 border border-foreground/20 rounded-lg p-3 text-white"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !tokenAddress || !amount}
        className={`w-full bg-foreground text-background rounded-lg p-3 hover:opacity-90 transition-colors ${
          isPending || !tokenAddress || !amount
            ? 'opacity-50 cursor-not-allowed'
            : ''
        }`}
      >
        {isPending ? 'Processing...' : 'Add Token'}
      </button>
      {isSuccess && <p className="text-green-400">Token added successfully!</p>}
      {isError && <p className="text-red-400">Error adding token</p>}
    </form>
  );
};

const RemoveTokenForm = ({ tokenAddress }: { tokenAddress: `0x${string}` }) => {
  const [amount, setAmount] = useState('');
  const { removeToken, isPending, isSuccess, isError } = useRemoveToken();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount) {
      removeToken(tokenAddress, amount);
      if (isSuccess) {
        setAmount('');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-foreground mb-2">Amount to Remove</label>
        <input
          type="text"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-background/50 border border-foreground/20 rounded-lg p-3 text-white"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !amount}
        className={`w-full bg-red-500 text-white rounded-lg p-3 hover:opacity-90 transition-colors ${
          isPending || !amount ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isPending ? 'Processing...' : 'Remove Token'}
      </button>
      {isSuccess && (
        <p className="text-green-400">Token removed successfully!</p>
      )}
      {isError && <p className="text-red-400">Error removing token</p>}
    </form>
  );
};

export default function WalletDashboard() {
  const {
    tokens,
    tokenBalances,
    isLoading: walletLoading,
    addToken,
    removeToken,
    isAddPending,
    isRemovePending,
    isConnected,
  } = useWalletFunctions();

  const {
    prices,
    loading: pricesLoading,
    error: pricesError,
  } = useCryptoPrice();

  const {
    transactions,
    isLoading: txLoading,
    error: txError,
  } = useTransactionHistory();

  const [tokenAddress, setTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState('');
  const [removeAmount, setRemoveAmount] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const getCryptoPrice = (symbol: string) => {
    const crypto = prices?.find(
      (p) => p.symbol.toLowerCase() === symbol.toLowerCase(),
    );
    return crypto ? formatPrice(crypto.price) : 'Loading...';
  };

  const getTokenPriceValue = (symbol: string): number => {
    const crypto = prices?.find(
      (p) => p.symbol.toLowerCase() === symbol.toLowerCase(),
    );
    return crypto?.price || 0;
  };

  const getTokenBalanceByAddress = (address: string) => {
    const token = tokenBalances.find(
      (t) => t.token.toLowerCase() === address.toLowerCase(),
    );
    return token ? token.balance : '0';
  };

  const handleAddToken = () => {
    if (tokenAddress && amount && !isAddPending) {
      addToken(tokenAddress as `0x${string}`, amount);
      setTokenAddress('');
      setAmount('');
      setIsAddModalOpen(false);
    }
  };

  const handleRemoveToken = () => {
    if (selectedToken && removeAmount && !isRemovePending) {
      removeToken(selectedToken as `0x${string}`, removeAmount);
      setSelectedToken('');
      setRemoveAmount('');
      setIsRemoveModalOpen(false);
    }
  };

  const openRemoveModal = (token: string) => {
    setSelectedToken(token);
    setIsRemoveModalOpen(true);
  };

  return (
    <main className="bg-background w-screen min-h-screen px-4 md:px-8 lg:px-32 py-16 md:py-32">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row items-center w-full justify-between gap-12 mb-24">
        <div>
          <BlurText
            text="Your Digital"
            delay={0.01}
            animateBy="letters"
            direction="top"
            className="text-4xl md:text-6xl lg:text-7xl font-semibold mb-1 text-white"
          />
          <BlurText
            text="Asset Hub"
            delay={0.05}
            animateBy="letters"
            direction="top"
            className="text-4xl md:text-6xl lg:text-7xl font-semibold mb-6 text-foreground"
          />

          <p className="opacity-40 mb-8 max-w-lg text-white">
            Manage all your crypto assets in one secure place with real-time
            monitoring and protection.
          </p>

          <Connect />
        </div>
        <div className="relative">
          <CircularText
            text="SECURE*WALLET*DASHBOARD*"
            onHover="goBonkers"
            spinDuration={20}
            className="font-normal"
          />
          <FaWallet className="text-white opacity-30 absolute text-7xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* User Tokens Section - Using the useGetUserTokens hook */}
      <section className="mb-12">
        <h3 className="text-2xl font-semibold text-white mb-5">Your Tokens</h3>
        <UserTokensList />
      </section>

      {/* Balance Overview Section */}
      <section className="mb-24">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-3xl font-semibold text-white">
            Your{' '}
            <RotatingText
              texts={['Balance', 'Assets', 'Portfolio']}
              mainClassName="px-2 sm:px-2 md:px-3 bg-foreground inline-flex text-black overflow-hidden py-1 justify-center rounded-lg"
              staggerFrom={'last'}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-120%' }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              rotationInterval={2000}
            />
          </h3>
          {isConnected && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg px-4 py-2 text-white transition-colors"
            >
              <FaPlus /> Add Token
            </button>
          )}
        </div>

        {walletLoading ? (
          <div className="text-center py-12 text-white">
            Loading wallet data...
          </div>
        ) : !isConnected ? (
          <div className="text-center py-12 text-white">
            Connect your wallet to view your assets
          </div>
        ) : tokenBalances.length === 0 ? (
          <div className="text-center py-12 text-white">
            No tokens found in your wallet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-foreground/10 p-3 rounded-full">
                  <FaEthereum className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white">Ethereum</h3>
                  <p className="text-foreground">{getCryptoPrice('ETH')}</p>
                </div>
              </div>
              <div className="flex justify-between mt-4">
                {/* Using TokenDisplay component for ETH */}
                <TokenDisplay
                  token={EXAMPLE_TOKENS.ETH}
                  symbol="ETH"
                  price={getTokenPriceValue('ETH')}
                />
                <button
                  onClick={() => openRemoveModal(EXAMPLE_TOKENS.ETH)}
                  className="text-red-400 hover:text-red-300"
                >
                  <FaMinus />
                </button>
              </div>
            </div>

            <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-foreground/10 p-3 rounded-full">
                  <FaBitcoin className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white">Bitcoin</h3>
                  <p className="text-foreground">{getCryptoPrice('BTC')}</p>
                </div>
              </div>
              <div className="flex justify-between mt-4">
                {/* Using TokenDisplay component for BTC */}
                <TokenDisplay
                  token={EXAMPLE_TOKENS.BTC}
                  symbol="BTC"
                  price={getTokenPriceValue('BTC')}
                />
                <button
                  onClick={() => openRemoveModal(EXAMPLE_TOKENS.BTC)}
                  className="text-red-400 hover:text-red-300"
                >
                  <FaMinus />
                </button>
              </div>
            </div>

            <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-foreground/10 p-3 rounded-full">
                  <SiChainlink className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white">Chainlink</h3>
                  <p className="text-foreground">{getCryptoPrice('LINK')}</p>
                </div>
              </div>
              <div className="flex justify-between mt-4">
                {/* Using TokenDisplay component for LINK */}
                <TokenDisplay
                  token={EXAMPLE_TOKENS.LINK}
                  symbol="LINK"
                  price={getTokenPriceValue('LINK')}
                />
                <button
                  onClick={() => openRemoveModal(EXAMPLE_TOKENS.LINK)}
                  className="text-red-400 hover:text-red-300"
                >
                  <FaMinus />
                </button>
              </div>
            </div>

            <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-foreground/10 p-3 rounded-full">
                  <SiPolkadot className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white">Polkadot</h3>
                  <p className="text-foreground">{getCryptoPrice('DOT')}</p>
                </div>
              </div>
              <div className="flex justify-between mt-4">
                {/* Using TokenDisplay component for DOT */}
                <TokenDisplay
                  token={EXAMPLE_TOKENS.DOT}
                  symbol="DOT"
                  price={getTokenPriceValue('DOT')}
                />
                <button
                  onClick={() => openRemoveModal(EXAMPLE_TOKENS.DOT)}
                  className="text-red-400 hover:text-red-300"
                >
                  <FaMinus />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Recent Transactions */}
      <section className="mb-24">
        <div className="flex justify-between items-center mb-5">
          <BlurText
            text="Recent Transactions"
            delay={0.01}
            animateBy="letters"
            direction="top"
            className="text-3xl md:text-4xl font-semibold text-white"
          />
          {isConnected && (
            <Link
              href="/transactions"
              className="flex items-center gap-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg px-4 py-2 text-white transition-colors"
            >
              <FaHistory /> View All
            </Link>
          )}
        </div>

        <TransactionList
          limit={3}
          showViewAll={true}
          onViewAll={() => (window.location.href = '/transactions')}
        />
      </section>

      {/* Quick Actions */}
      <section className="mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <button
            className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10 hover:bg-foreground/5 transition-colors"
            onClick={() => isConnected && setIsRemoveModalOpen(true)}
          >
            <h3 className="text-xl font-medium text-white mb-2">Send</h3>
            <p className="text-foreground">Transfer assets to another wallet</p>
          </button>

          <button
            className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10 hover:bg-foreground/5 transition-colors"
            onClick={() => isConnected && setIsAddModalOpen(true)}
          >
            <h3 className="text-xl font-medium text-white mb-2">Receive</h3>
            <p className="text-foreground">Get your deposit address</p>
          </button>

          <button className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10 hover:bg-foreground/5 transition-colors">
            <h3 className="text-xl font-medium text-white mb-2">Swap</h3>
            <p className="text-foreground">Exchange between assets</p>
          </button>
        </div>
      </section>

      {/* Add Token Modal - Using the individual AddTokenForm component */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-background/90 backdrop-blur-md p-8 rounded-xl border border-foreground/20 w-full max-w-md"
          >
            <h2 className="text-2xl font-semibold text-white mb-6">
              Add Token
            </h2>
            <AddTokenForm />
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="mt-4 w-full bg-background text-white border border-foreground/20 rounded-lg p-3 hover:bg-foreground/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Remove Token Modal - Using the individual RemoveTokenForm component */}
      {isRemoveModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-background/90 backdrop-blur-md p-8 rounded-xl border border-foreground/20 w-full max-w-md"
          >
            <h2 className="text-2xl font-semibold text-white mb-6">
              Remove Token
            </h2>
            <div className="mb-4">
              <label className="block text-foreground mb-2">
                Token Address
              </label>
              <input
                type="text"
                value={selectedToken}
                readOnly
                className="w-full bg-background/50 border border-foreground/20 rounded-lg p-3 text-white"
              />
            </div>
            <RemoveTokenForm tokenAddress={selectedToken as `0x${string}`} />
            <button
              onClick={() => setIsRemoveModalOpen(false)}
              className="mt-4 w-full bg-background text-white border border-foreground/20 rounded-lg p-3 hover:bg-foreground/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-muted-foreground">
        <p className="text-white">
          © {new Date().getFullYear()} Secure Wallet Dashboard. All rights
          reserved.
        </p>
      </footer>
    </main>
  );
}

function UserTokensList() {
  const { tokens, isLoading, isError, error } = useGetUserTokens();
  const { isConnected } = useWalletContext();
  const { prices } = useCryptoPrice();

  if (!isConnected) {
    return (
      <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10 text-center">
        Connect your wallet to view your tokens
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10 text-center">
        <p className="text-white">Loading tokens...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10 text-center">
        <p className="text-red-400">Error loading tokens: {error?.message}</p>
      </div>
    );
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10 text-center">
        <p className="text-white">No tokens found in your wallet</p>
      </div>
    );
  }

  const getTokenSymbol = (address: string): string => {
    if (address === EXAMPLE_TOKENS.ETH) return 'ETH';
    if (address === EXAMPLE_TOKENS.BTC) return 'BTC';
    if (address === EXAMPLE_TOKENS.LINK) return 'LINK';
    if (address === EXAMPLE_TOKENS.DOT) return 'DOT';
    return 'TOKEN';
  };

  const getTokenPrice = (symbol: string): number => {
    const crypto = prices?.find(
      (p) => p.symbol.toLowerCase() === symbol.toLowerCase(),
    );
    return crypto?.price || 0;
  };

  return (
    <div className="bg-background/20 backdrop-blur-sm p-6 rounded-lg border border-foreground/10">
      <ul className="divide-y divide-foreground/10">
        {tokens.map((token: `0x${string}`, index: number) => {
          const symbol = getTokenSymbol(token);
          const price = getTokenPrice(symbol);
          return (
            <li key={index} className="py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {symbol === 'ETH' && (
                  <FaEthereum className="text-white text-xl" />
                )}
                {symbol === 'BTC' && (
                  <FaBitcoin className="text-white text-xl" />
                )}
                {symbol === 'LINK' && (
                  <SiChainlink className="text-white text-xl" />
                )}
                {symbol === 'DOT' && (
                  <SiPolkadot className="text-white text-xl" />
                )}
                <div>
                  <span className="text-white font-medium">{symbol}</span>
                  <p className="text-foreground/60 text-xs font-mono">
                    {token.slice(0, 6)}...{token.slice(-4)}
                  </p>
                </div>
              </div>
              <TokenDisplay token={token} symbol={symbol} price={price} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
