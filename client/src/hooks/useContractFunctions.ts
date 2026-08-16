import {
  useReadContract,
  useWriteContract,
  useSendTransaction as useWagmiSendTransaction,
  useBalance,
  usePublicClient,
} from 'wagmi';
import { WalletABI, WALLET_CONTRACT_ADDRESS } from '../lib/contract';
import { parseEther, formatEther, formatUnits, erc20Abi } from 'viem';
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
  const publicClient = usePublicClient();
  const ETH_ADDRESS = WALLET_CONTRACT_ADDRESS;

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

        // Real ERC-20 reads. These were previously invented values keyed off
        // Hardhat's deterministic local addresses — a connected wallet was shown
        // '0.05 BTC' / '1.25 LINK' it did not hold, and every token on a real
        // network fell through to a flat '0.01 TOKEN'.
        if (publicClient && address && tokens && tokens.length > 0) {
          const otherTokens = tokens.filter(
            (token) => token.toLowerCase() !== ETH_ADDRESS.toLowerCase(),
          );

          if (otherTokens.length > 0) {
            const results = await publicClient.multicall({
              contracts: otherTokens.flatMap((token) => [
                { address: token, abi: erc20Abi, functionName: 'balanceOf', args: [address] },
                { address: token, abi: erc20Abi, functionName: 'symbol' },
                { address: token, abi: erc20Abi, functionName: 'decimals' },
              ]),
              allowFailure: true,
            });

            const realBalances = otherTokens.map((token, i) => {
              const [bal, sym, dec] = results.slice(i * 3, i * 3 + 3);
              // A token that fails to answer is reported as unknown rather than
              // given a plausible-looking number.
              if (bal.status !== 'success') {
                return { token, balance: '—', symbol: 'UNKNOWN' };
              }
              const decimals = dec.status === 'success' ? Number(dec.result) : 18;
              return {
                token,
                balance: formatUnits(bal.result as bigint, decimals),
                symbol: sym.status === 'success' ? String(sym.result) : 'TOKEN',
              };
            });

            balances = [...balances, ...realBalances];
          }
        }

        setTokenBalances(balances);
      } catch (error) {
        console.error('Error fetching balances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, [tokens, ethBalance, ethSymbol, ethBalanceLoading, isConnected, address, publicClient]);

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
