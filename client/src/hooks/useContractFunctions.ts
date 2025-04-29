import {
  useReadContract,
  useWriteContract,
  useSendTransaction as useWagmiSendTransaction,
  useBalance,
} from 'wagmi';
import { WalletABI, WALLET_CONTRACT_ADDRESS } from '../lib/contract';
import { parseEther, formatEther } from 'viem';
import { useState, useEffect } from 'react';
import { useWalletContext } from '../context/WalletContext';

type Address = `0x${string}`;

export const formatBalance = (
  balance: string | undefined,
  decimals = 4,
): string => {
  if (!balance) return '0';

  const num = parseFloat(balance);
  if (num === 0) return '0';

  const formattedBalance = num.toFixed(decimals);

  return formattedBalance.replace(/\.?0+$/, '');
};

export function useNativeBalance() {
  const { address, isConnected } = useWalletContext();

  const {
    data: balanceData,
    isLoading,
    isError,
    error,
    refetch,
  } = useBalance({
    address,
  });

  return {
    balance: balanceData?.formatted || '0',
    symbol: balanceData?.symbol || 'ETH',
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useGetUserTokens() {
  const { address, isConnected } = useWalletContext();

  const {
    data: tokens,
    isLoading,
    isError,
    error,
    refetch,
  } = useReadContract({
    address: WALLET_CONTRACT_ADDRESS,
    abi: WalletABI,
    functionName: 'getUserTokens',
    account: address,
    query: {
      enabled: Boolean(isConnected),
    },
  });

  return {
    tokens: tokens as Address[] | undefined,
    userTokens: tokens as Address[] | undefined,
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useGetTokenBalance(tokenAddress?: Address) {
  const { address, isConnected } = useWalletContext();

  const {
    data: balance,
    isLoading,
    isError,
    error,
    refetch,
  } = useReadContract({
    address: WALLET_CONTRACT_ADDRESS,
    abi: WalletABI,
    functionName: 'getTokenBalance',
    args: tokenAddress ? [tokenAddress] : undefined,
    account: address,
    query: {
      enabled: Boolean(isConnected && tokenAddress),
    },
  });

  return {
    balance: balance ? formatEther(balance as bigint) : '0',
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useAddToken() {
  const { address, isConnected } = useWalletContext();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    writeContract,
    isPending,
    isError,
    error,
    isSuccess: writeSuccess,
    reset,
  } = useWriteContract();

  useEffect(() => {
    if (writeSuccess) {
      setIsSuccess(true);

      const timer = setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [writeSuccess]);

  const addToken = async (tokenAddress: Address, amount: string) => {
    if (!isConnected || !address) {
      console.error('Wallet not connected');
      return;
    }

    try {
      writeContract({
        address: WALLET_CONTRACT_ADDRESS,
        abi: WalletABI,
        functionName: 'addToken',
        args: [tokenAddress, parseEther(amount)],
      });
    } catch (err) {
      console.error('Error adding token:', err);
    }
  };

  return {
    addToken,
    isPending,
    isError,
    error,
    isSuccess,
    reset,
  };
}

export function useRemoveToken() {
  const { address, isConnected } = useWalletContext();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    writeContract,
    isPending,
    isError,
    error,
    isSuccess: writeSuccess,
    reset,
  } = useWriteContract();

  useEffect(() => {
    if (writeSuccess) {
      setIsSuccess(true);

      const timer = setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [writeSuccess]);

  const removeToken = async (tokenAddress: Address, amount: string) => {
    if (!isConnected || !address) {
      console.error('Wallet not connected');
      return;
    }

    try {
      writeContract({
        address: WALLET_CONTRACT_ADDRESS,
        abi: WalletABI,
        functionName: 'removeToken',
        args: [tokenAddress, parseEther(amount)],
      });
    } catch (err) {
      console.error('Error removing token:', err);
    }
  };

  return {
    removeToken,
    isPending,
    isError,
    error,
    isSuccess,
    reset,
  };
}

export function useTransferToken() {
  const { address, isConnected } = useWalletContext();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    writeContract,
    isPending,
    isError,
    error,
    isSuccess: writeSuccess,
    reset,
  } = useWriteContract();

  useEffect(() => {
    if (writeSuccess) {
      setIsSuccess(true);

      const timer = setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [writeSuccess]);

  const transferToken = async (
    tokenAddress: Address,
    toAddress: Address,
    amount: string,
  ) => {
    if (!isConnected || !address) {
      console.error('Wallet not connected');
      return;
    }

    try {
      writeContract({
        address: WALLET_CONTRACT_ADDRESS,
        abi: WalletABI,
        functionName: 'transferToken',
        args: [tokenAddress, toAddress, parseEther(amount)],
      });
    } catch (err) {
      console.error('Error transferring token:', err);
    }
  };

  return {
    transferToken,
    isPending,
    isError,
    error,
    isSuccess,
    reset,
  };
}

export function useGetAllBalances() {
  const { tokens, isLoading: tokensLoading } = useGetUserTokens();
  const {
    balance: ethBalance,
    isLoading: ethBalanceLoading,
    symbol: ethSymbol,
  } = useNativeBalance();
  const [tokenBalances, setTokenBalances] = useState<
    { token: Address; balance: string; symbol: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const { address, isConnected } = useWalletContext();
  const ETH_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address;

  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected) {
        setTokenBalances([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        let balances: { token: Address; balance: string; symbol: string }[] =
          [];

        balances.push({
          token: ETH_ADDRESS,
          balance: ethBalance,
          symbol: ethSymbol || 'ETH',
        });

        if (tokens && tokens.length > 0) {
          const otherTokens = tokens.filter(
            (token) => token.toLowerCase() !== ETH_ADDRESS.toLowerCase(),
          );

          const dummyBalances = otherTokens.map((token) => ({
            token,
            balance:
              token === '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
                ? '0.05'
                : token === '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
                  ? '1.25'
                  : token === '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
                    ? '10.5'
                    : '0.01',
            symbol:
              token === '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
                ? 'BTC'
                : token === '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
                  ? 'LINK'
                  : token === '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
                    ? 'DOT'
                    : 'TOKEN',
          }));

          balances = [...balances, ...dummyBalances];
        }

        setTokenBalances(balances);
      } catch (error) {
        console.error('Error fetching balances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, [tokens, ethBalance, ethSymbol, ethBalanceLoading, isConnected, address]);

  return {
    tokenBalances,
    isLoading: isLoading || tokensLoading || ethBalanceLoading,
  };
}

export function useWalletFunctions() {
  const { tokens, userTokens, refetch: refetchTokens } = useGetUserTokens();
  const {
    addToken,
    isPending: isAddPending,
    isSuccess: isAddSuccess,
  } = useAddToken();
  const {
    removeToken,
    isPending: isRemovePending,
    isSuccess: isRemoveSuccess,
  } = useRemoveToken();
  const { tokenBalances, isLoading } = useGetAllBalances();
  const { address, isConnected } = useWalletContext();

  useEffect(() => {
    if (isAddSuccess || isRemoveSuccess) {
      refetchTokens();
    }
  }, [isAddSuccess, isRemoveSuccess, refetchTokens]);

  return {
    tokens,
    userTokens,
    tokenBalances,
    isLoading,
    addToken,
    removeToken,
    isAddPending,
    isRemovePending,
    address,
    isConnected,
  };
}

export function useSendTransaction() {
  const { address, isConnected } = useWalletContext();
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    sendTransaction,
    isPending,
    isError,
    error,
    isSuccess: wagmiIsSuccess,
    reset,
  } = useWagmiSendTransaction();

  useEffect(() => {
    if (wagmiIsSuccess) {
      setIsSuccess(true);

      const timer = setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wagmiIsSuccess]);

  const sendEth = async (toAddress: Address, amount: string) => {
    if (!isConnected || !address) {
      console.error('Wallet not connected');
      return;
    }

    try {
      sendTransaction({
        to: toAddress,
        value: parseEther(amount),
      });
    } catch (err) {
      console.error('Error sending ETH:', err);
    }
  };

  return {
    sendEth,
    isPending,
    isError,
    error,
    isSuccess,
    reset,
  };
}
