import { useState } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
} from 'wagmi';
import { parseEther } from 'viem';
import { TokenFactoryABI } from '../lib/abi/TokenFactoryABI';

// Token Factory contract address - replace with your deployed contract address
const TOKEN_FACTORY_ADDRESS =
  '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const;

interface TokenCreatedEvent {
  tokenAddress: `0x${string}`;
  name: string;
  symbol: string;
  initialSupply: bigint;
  creator: `0x${string}`;
}

export function useTokenCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [newTokenAddress, setNewTokenAddress] = useState<`0x${string}` | null>(
    null,
  );
  const [creationData, setCreationData] = useState<TokenCreatedEvent | null>(
    null,
  );

  const {
    writeContract,
    isPending,
    isError,
    error,
    data: hash,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      enabled: !!hash,
    });

  // Watch for TokenCreated events
  useWatchContractEvent({
    address: TOKEN_FACTORY_ADDRESS,
    abi: TokenFactoryABI,
    eventName: 'TokenCreated',
    onLogs: (logs) => {
      if (logs && logs.length > 0) {
        const log = logs[0];
        const { args } = log;

        if (args) {
          const tokenData = {
            tokenAddress: args.tokenAddress as `0x${string}`,
            name: args.name as string,
            symbol: args.symbol as string,
            initialSupply: args.initialSupply as bigint,
            creator: args.creator as `0x${string}`,
          };

          console.log('Token created event detected:', tokenData);
          setNewTokenAddress(tokenData.tokenAddress);
          setCreationData(tokenData);
          setIsLoading(false);

          // Log successful token creation
          console.log('New token created and added to state:', {
            address: tokenData.tokenAddress,
            name: tokenData.name,
            symbol: tokenData.symbol,
          });

          // Direct save to database without waiting for the UI to do it
          saveTokenToDatabase(
            tokenData.tokenAddress,
            tokenData.name,
            tokenData.symbol,
            tokenData.initialSupply.toString(),
          );
        }
      }
    },
  });

  // Internal function to directly save token data to database
  const saveTokenToDatabase = async (
    tokenAddress: `0x${string}`,
    name: string,
    symbol: string,
    supply: string,
  ) => {
    try {
      console.log('Directly saving token to database:', {
        tokenAddress,
        name,
        symbol,
        supply,
      });

      const response = await fetch('/api/savecoin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBuffer: '',
          tokenAddress,
          tokenName: name,
          tokenSymbol: symbol,
          initialSupply: supply,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save token directly');
      }

      const result = await response.json();
      console.log('Direct token save result:', result);
      return result;
    } catch (error) {
      console.error('Error in direct token save:', error);
      return null;
    }
  };

  // Save token data to MongoDB
  const saveTokenImage = async (
    tokenAddress: `0x${string}`,
    imageData: string,
  ) => {
    if (!imageData) return null;

    console.log('Attempting to save token image for:', tokenAddress);

    try {
      // Extract base64 data from image
      const base64Data = imageData.split(',')[1];

      console.log('Sending token data to API:', {
        tokenAddress,
        tokenName: creationData?.name,
        tokenSymbol: creationData?.symbol,
        hasImage: !!base64Data,
      });

      const response = await fetch('/api/savecoin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBuffer: base64Data,
          tokenAddress,
          tokenName: creationData?.name,
          tokenSymbol: creationData?.symbol,
          initialSupply: creationData?.initialSupply?.toString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(
          `Failed to save token image: ${errorData.error || 'Unknown error'}`,
        );
      }

      const data = await response.json();
      console.log('Token saved successfully:', data);
      return data;
    } catch (error) {
      console.error('Error saving token image:', error);
      return null;
    }
  };

  // Create token function
  const createToken = (name: string, symbol: string, initialSupply: string) => {
    setIsLoading(true);
    setNewTokenAddress(null);
    setCreationData(null);

    writeContract({
      address: TOKEN_FACTORY_ADDRESS,
      abi: TokenFactoryABI,
      functionName: 'createToken',
      args: [name, symbol, parseEther(initialSupply)],
    });
  };

  return {
    createToken,
    saveTokenImage,
    isLoading: isLoading || isPending || isConfirming,
    isPending,
    isConfirming,
    isConfirmed,
    isError,
    error,
    newTokenAddress,
    creationData,
    transactionHash: hash,
  };
}
