import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
  Chain,
} from 'wagmi/chains';
import { http } from 'wagmi';

// Configure Hardhat local network
export const hardhat: Chain = {
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
};

export const config = getDefaultConfig({
  appName: 'Wallet Dashboard',
  projectId: 'YOUR_PROJECT_ID',
  chains: [
    hardhat,
    // Keep these other chains for development/testing purposes
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [sepolia] : []),
  ],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
  ssr: true,
});
