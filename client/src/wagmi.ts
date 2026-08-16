import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  baseSepolia,
  mainnet,
  optimism,
  polygon,
  sepolia,
  Chain,
} from 'wagmi/chains';
import { http, cookieStorage, createStorage } from 'wagmi';

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

// Get one at https://cloud.reown.com — WalletConnect refuses connections without it.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId && typeof window !== 'undefined') {
  console.warn(
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — WalletConnect wallets will fail to connect.',
  );
}

// The chain the deployed contracts live on. Defaults to local Hardhat for dev.
// `||` throughout this file, not `??`: a key present-but-blank in .env.local
// arrives as "", which is not nullish. Here that would give Number("") === 0.
const defaultChainId = Number(
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || hardhat.id,
);

const supported = [
  hardhat,
  sepolia,
  baseSepolia,
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
] as const;

const defaultChain =
  supported.find((c) => c.id === defaultChainId) ?? (hardhat as Chain);

export const config = getDefaultConfig({
  appName: 'Guardiant',
  // A blank value here makes RainbowKit throw "No projectId found" during
  // prerender, failing the build rather than degrading.
  projectId: projectId || 'MISSING_WALLETCONNECT_PROJECT_ID',
  // Put the deployment's chain first so RainbowKit defaults to it.
  chains: [defaultChain, ...supported.filter((c) => c.id !== defaultChain.id)] as
    unknown as readonly [Chain, ...Chain[]],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    // `|| undefined` so a blank value falls back to the chain's public RPC
    // rather than being treated as a URL.
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined),
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || undefined,
    ),
  },
  // cookieStorage keeps the config server-safe during prerender (no localStorage).
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});
