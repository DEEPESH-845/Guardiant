import { WalletABI } from './abi/WalletABI';

type Address = `0x${string}`;

// Hardhat's deterministic first-deploy addresses, kept as local-dev defaults.
// Every deployed environment must override these via NEXT_PUBLIC_* env vars.
const addr = (value: string | undefined, fallback: string) =>
  (value ?? fallback) as Address;

export const WALLET_CONTRACT_ADDRESS = addr(
  process.env.NEXT_PUBLIC_WALLET_ADDRESS,
  '0x5FbDB2315678afecb367f032d93F642f64180aa3',
);

export const LIQUIDITY_POOL_CONTRACT_ADDRESS = addr(
  process.env.NEXT_PUBLIC_LIQUIDITY_POOL_ADDRESS,
  '0x5FbDB2315678afecb367f032d93F642f64180aa3',
);

export const TOKEN_FACTORY_ADDRESS = addr(
  process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS,
  '0x5FbDB2315678afecb367f032d93F642f64180aa3',
);

export const TRANSFER_CONTRACT_ADDRESS = addr(
  process.env.NEXT_PUBLIC_TRANSFER_ADDRESS,
  '0x5FbDB2315678afecb367f032d93F642f64180aa3',
);

export const ANOMALY_GUARD_ADDRESS = addr(
  process.env.NEXT_PUBLIC_ANOMALY_GUARD_ADDRESS,
  '0x5FbDB2315678afecb367f032d93F642f64180aa3',
);

export const EXAMPLE_TOKENS = {
  ETH: WALLET_CONTRACT_ADDRESS,
  BTC: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  LINK: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  DOT: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
} as const;

export { WalletABI };
