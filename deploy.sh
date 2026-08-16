#!/usr/bin/env bash
# Deploy the Guardiant contracts and write the resulting addresses into
# client/.env.local so the frontend points at them.
#
#   ./deploy.sh              # local Hardhat node (must already be running)
#   ./deploy.sh sepolia      # Sepolia; needs contract/.env filled in
set -euo pipefail

NETWORK="${1:-localhost}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$NETWORK" in
  localhost) CHAIN_ID=31337 ;;
  sepolia)   CHAIN_ID=11155111 ;;
  *) echo "Unsupported network: $NETWORK (use localhost or sepolia)" >&2; exit 1 ;;
esac

cd "$ROOT/contract"
npx hardhat ignition deploy ignition/modules/Guardiant.js --network "$NETWORK"

ADDRESSES="ignition/deployments/chain-$CHAIN_ID/deployed_addresses.json"
[ -f "$ADDRESSES" ] || { echo "No deployment output at $ADDRESSES" >&2; exit 1; }

ENV_FILE="$ROOT/client/.env.local"
node - "$ADDRESSES" "$ENV_FILE" "$CHAIN_ID" <<'NODE'
const fs = require('fs');
const [, , addressesPath, envPath, chainId] = process.argv;
const a = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));

const vars = {
  NEXT_PUBLIC_DEFAULT_CHAIN_ID: chainId,
  NEXT_PUBLIC_WALLET_ADDRESS: a['GuardiantModule#Wallet'],
  NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS: a['GuardiantModule#TokenFactory'],
  NEXT_PUBLIC_LIQUIDITY_POOL_ADDRESS: a['GuardiantModule#LiquidityPool'],
  NEXT_PUBLIC_TRANSFER_ADDRESS: a['GuardiantModule#TransferTo'],
  NEXT_PUBLIC_ANOMALY_GUARD_ADDRESS: a['GuardiantModule#AnomalyGuardWallet'],
  NEXT_PUBLIC_TOKEN_FACTORY_LP_ADDRESS: a['GuardiantModule#CustomToken'],
};

// Preserve any keys already in .env.local (secrets, project ids).
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const kept = existing
  .split('\n')
  .filter((line) => line.trim() && !Object.keys(vars).some((k) => line.startsWith(`${k}=`)));

const next = [...kept, ...Object.entries(vars).map(([k, v]) => `${k}=${v}`)].join('\n');
fs.writeFileSync(envPath, next + '\n');
console.log(`\nWrote ${Object.keys(vars).length} addresses to ${envPath}`);
NODE

echo "✅ Deployed to $NETWORK."
