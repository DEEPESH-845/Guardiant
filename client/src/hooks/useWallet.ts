import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useWatchContractEvent,
  useWriteContract,
} from 'wagmi';
import { WalletABI, WALLET_CONTRACT_ADDRESS } from '../lib/contract';
import { parseEther, formatEther } from 'viem';

type Address = `0x${string}`;

interface TokenBalance {
  token: Address;
  balance: string;
}

export function useWallet() {
  const { address, isConnected } = useAccount();
  const [userTokens, setUserTokens] = useState<Address[]>([]);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    data: tokensData,
    isError: isTokensError,
    isLoading: isTokensLoading,
    refetch: refetchTokens,
  } = useReadContract({
    address: WALLET_CONTRACT_ADDRESS,
    abi: WalletABI,
    functionName: 'getUserTokens',
    account: address,
  });

  const {
    writeContract: writeAddToken,
    isPending: isAddTokenPending,
    isError: isAddTokenError,
    isSuccess: isAddTokenSuccess,
  } = useWriteContract();

  const addToken = useCallback(
    (token: Address, amount: string) => {
      if (!address) return;

      writeAddToken({
        address: WALLET_CONTRACT_ADDRESS,
        abi: WalletABI,
        functionName: 'addToken',
        args: [token, parseEther(amount)],
      });
    },
    [address, writeAddToken],
  );

  const {
    writeContract: writeRemoveToken,
    isPending: isRemoveTokenPending,
    isError: isRemoveTokenError,
    isSuccess: isRemoveTokenSuccess,
  } = useWriteContract();

  const removeToken = useCallback(
    (token: Address, amount: string) => {
      if (!address) return;

      writeRemoveToken({
        address: WALLET_CONTRACT_ADDRESS,
        abi: WalletABI,
        functionName: 'removeToken',
        args: [token, parseEther(amount)],
      });
    },
    [address, writeRemoveToken],
  );

  const updateBalances = useCallback(async () => {
    if (!userTokens.length || !address) {
      setTokenBalances([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const balances = userTokens.map((token) => ({
      token,
      balance: '0.01',
    }));

    setTokenBalances(balances);
    setIsLoading(false);
  }, [userTokens, address]);

  useEffect(() => {
    if (tokensData) {
      setUserTokens(tokensData as Address[]);
    } else {
      setUserTokens([]);
    }

    setIsLoading(false);
  }, [tokensData]);

  useEffect(() => {
    if (userTokens.length > 0) {
      updateBalances();
    }
  }, [userTokens, updateBalances]);

  useWatchContractEvent({
    address: WALLET_CONTRACT_ADDRESS,
    abi: WalletABI,
    eventName: 'TokenAdded',
    onLogs() {
      refetchTokens();
    },
  });

  useWatchContractEvent({
    address: WALLET_CONTRACT_ADDRESS,
    abi: WalletABI,
    eventName: 'TokenRemoved',
    onLogs() {
      refetchTokens();
    },
  });

  useEffect(() => {
    if (isAddTokenSuccess || isRemoveTokenSuccess) {
      refetchTokens();
    }
  }, [isAddTokenSuccess, isRemoveTokenSuccess, refetchTokens]);

  return {
    userTokens,
    tokenBalances,
    isLoading,
    isError: isTokensError,
    addToken,
    removeToken,
    isAddTokenPending,
    isRemoveTokenPending,
    formatBalance: formatEther,
  };
}
