# Guardiant — Zero-Cost Deployment Plan

Three deployable pieces, three free hosts, no credit card:

| Piece                         | Host                                  | Cost | Notes                                       |
| ----------------------------- | ------------------------------------- | ---- | ------------------------------------------- |
| `client/` — Next.js 14 app    | Vercel Hobby                          | $0   | 100 GB bandwidth/mo, unlimited deploys      |
| `model/` — FastAPI + sklearn  | Hugging Face Spaces (Docker)          | $0   | Always-on, 2 vCPU / 16 GB, public Space     |
| `contract/` — Hardhat/Solidity| Ethereum Sepolia                      | $0   | Gas paid in faucet ETH                      |
| Token metadata store          | MongoDB Atlas M0                      | $0   | 512 MB shared cluster                       |
| Wallet connections            | Reown (WalletConnect) Cloud           | $0   | Free project id                             |
| LLM transfer parser           | Google AI Studio (Gemini)             | $0   | Free tier                                   |

---

## Part 1 — What was broken, and what was fixed

Every item below was reproduced locally, fixed, and re-verified. `next build`
went from **hard failure** to green.

### Build blockers (the app could not compile at all)

1. **`viem` pinned below what `@wagmi/core` needs.** `package.json` pinned
   `viem@2.23.3` while `wagmi@2.15.0` pulled `@wagmi/core@2.17.0`, which imports
   the EIP-5792 actions (`getCallsStatus`, `sendCalls`, `waitForCallsStatus`,
   `getCapabilities`, `showCallsStatus`) that don't exist in 2.23. The peer range
   is `viem: "2.x"`, so npm never warned — it failed at bundle time.
   → **Fixed:** `viem` bumped to `^2.55.13`.

2. **`tsconfig.json` targeted ES5.** Modern viem/ox ships `.ts` sources that use
   `Map` iteration and `String.replaceAll`; `skipLibCheck` doesn't help because
   they aren't `.d.ts` files.
   → **Fixed:** `target: es2022`, `lib: [dom, dom.iterable, esnext]`.

3. **`src/lib/mongodb.ts` threw at module load.** `next build` imports every
   route module to collect page data, so a missing `MONGODB_URI` aborted the
   build — meaning the app could never build on a fresh CI machine.
   → **Fixed:** rewritten as a lazy `getMongoClient()` that reads the env var on
   first call. Call sites in `api/savecoin` updated.

4. **`src/app/liquidity/page.tsx` used the wagmi v1 API.** `useProvider` doesn't
   exist in wagmi v2, and `provider.getSigner()` was called during render.
   → **Fixed:** `useWalletClient()` + `ethers.BrowserProvider`, signer built
   inside the handler, with a guard for unset pool/token addresses.

5. **ABIs weren't `as const`.** viem can't infer event/function types from a
   mutable array, so `log.args` was a type error in `useTokenCreation`.
   → **Fixed:** `as const` on all five ABI files.

6. **`useWaitForTransactionReceipt({ enabled })`** — v1 option shape.
   → **Fixed:** moved to `query: { enabled }`.

7. **ESLint errors failing the build:** three `react-hooks/rules-of-hooks`
   violations in `useLiquidityPoolFunctions.ts` (hooks called inside plain
   functions) and four unescaped JSX entities.
   → **Fixed:** entities escaped. `useLiquidityPoolFunctions.ts` had **zero
   importers** — deleted rather than repaired.

8. **Node 25 breaks the build locally.** Node 25 defines a `globalThis.localStorage`
   stub with no methods, so WalletConnect's `typeof localStorage !== 'undefined'`
   check passes and then explodes during prerender.
   → **Not a code bug** — Vercel builds on Node ≤22. Locally, build with
   `NODE_OPTIONS=--no-experimental-webstorage`. `engines.node: "22.x"` added to
   pin Vercel.

### Deployability blockers (it built, but nothing would work in production)

9. **`projectId: 'YOUR_PROJECT_ID'`** — placeholder WalletConnect id; every
   WalletConnect wallet would refuse to connect.
   → **Fixed:** read from `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, warns if unset.

10. **Only chain with a transport was `http://127.0.0.1:8545`.** A deployed site
    would try to reach the visitor's own machine.
    → **Fixed:** `wagmi.ts` now selects its default chain from
    `NEXT_PUBLIC_DEFAULT_CHAIN_ID` and adds Sepolia / Base Sepolia transports
    with optional custom RPC URLs.

11. **Contract addresses hardcoded to Hardhat's deterministic locals** in
    `lib/contract.ts`, `useTokenCreation.ts`, `useContractFunctions.ts`.
    → **Fixed:** all addresses centralised in `lib/contract.ts` and driven by
    `NEXT_PUBLIC_*` env vars, with the Hardhat values kept only as dev defaults.

12. **Ignition modules hardcoded local addresses too** — `AnomalyGuard.js` and
    `LiquidityPoolAutomation.js` referenced `0x5FbD…`/`0x9fE4…` literals, so a
    testnet deploy would wire contracts to nothing. `deploy.sh` deployed to
    `--network hardhat`, an in-process chain that is discarded when the command
    exits.
    → **Fixed:** the six modules were replaced by one `Guardiant.js` that
    deploys the whole protocol in dependency order and reads the new token's
    address from the `TokenCreated` event. `deploy.sh` now takes a network,
    deploys, and writes the resulting addresses into `client/.env.local`.
    **Verified against a live local node.**

13. **`initialSupply` was double-scaled.** Modules passed
    `ethers.parseEther("1000000")` while `CustomToken` multiplies by
    `10**decimals` again — a 10^42-token supply.
    → **Fixed:** pass `1_000_000n`. LP seed reduced from 10 ETH to 0.02 ETH so a
    faucet-funded account can actually run the deploy.

14. **Block-explorer links hardcoded to mainnet `etherscan.io`.**
    → **Fixed:** derived from the connected chain's `blockExplorers`.

### ML service

15. **`Dockerfile` ran `python src/main.py`** — which raises immediately
    (relative import beyond top-level package) and isn't the API entrypoint
    anyway. It also never set `PYTHONPATH`, so `from utils.logger import …`
    would fail.
    → **Fixed:** new `model/Dockerfile` on `python:3.11-slim`, `PYTHONPATH=/app/src`,
    `uvicorn src.app:app`. The old `model/docker/` directory was removed.

16. **The committed model artifacts were unloadable.** `models/isolation_forest.joblib`
    was pickled by scikit-learn <1.3; loading it under the pinned 1.3.1 raises
    `node array from the pickle has an incompatible dtype` — so **`/detect`
    returned 500 on a fresh install**.
    → **Fixed:** the Docker build retrains from `example_transactions.json`, so
    artifacts always match the installed sklearn. **Verified: `/detect` returns
    200 from a cold start.**

17. **`requirements.txt` pins can't install on modern Python.** `pandas==2.1.1` /
    `numpy==1.24.3` have no wheels for Python 3.13+ and fail to build from
    source. Pinning the base image to 3.11 is what makes them installable.

### Detection accuracy — measured, not assumed

The service returned 200s, so it looked deployable. Scored against a labelled
batch it detected **nothing at all**:

| | before | after |
| --- | --- | --- |
| single-transaction request | **500** (`Input X contains NaN`) | 200 |
| recall on 3 obvious attacks | **0 / 3** | 3 / 3 |
| false positives, 1000 held-out normal txs | 0 (it flagged nothing) | 3.0% |
| same tx, different batch | **different verdict** | identical verdict |

Four root causes, all in the feature path rather than the model:

18. **`DataTransformer` min–max normalised `value` across the request batch.**
    Every score was relative to whatever else you happened to send, and a
    single-transaction request divided by zero → `NaN` → sklearn raised, so the
    most common call shape was a hard 500.
    → **Fixed:** normalisation removed from the transform. Scaling belongs to the
    detector, using a scaler fitted once at training time.

19. **The saved `scaler.joblib` was never used.** `prepare_features()` called
    `fit_transform`, so inference refit the scaler on the request batch and
    discarded the trained one.
    → **Fixed:** `prepare_features(fit_scaler=False)` on the load path.

20. **Features were raw wei.** Values span 10¹⁵–10²¹ and are heavily
    right-skewed; standardising them raw leaves every row bar the single largest
    within a fraction of an SD of the mean, and the forest cannot isolate
    anything.
    → **Fixed:** `log1p` before scaling.

21. **Trained on the 3 rows of `example_transactions.json`**, so its percentile
    thresholds were noise.
    → **Fixed:** `train_baseline.py` fits 4000 log-normal transactions at image
    build time.

One modelling change, not a bug fix: the threshold rules were only consulted
*after* the forest flagged a row, so they could never fire alone. A 900 ETH
drain sent at ordinary gas — one feature far out, everything else textbook, and
precisely the event this protocol exists to catch — was scored normal. The two
detectors are now union'd, and the thresholds moved from the 95th to the 99.5th
percentile (at 95 they would alert on 5% of ordinary traffic).

`model/tests/test_detection_quality.py` pins all of this; it runs with plain
`python`, no pytest.

### ML ↔ frontend wiring (previously: none)

The `/graph` "anomaly detection" is a client-side simulation
(`useTradingAgents.ts`); nothing ever called the Python service.

→ **Added:**
- `client/src/app/api/anomaly/route.ts` — server-side proxy to the FastAPI
  `/detect`, with a 20 s timeout, so the browser never sees the service URL and
  CORS/mixed-content never arises.
- `client/src/hooks/useAnomalyDetection.ts` — scores the visible transactions,
  returns a `hash → result` map, and degrades to an empty map if the service is
  down (the list still renders).
- `TransactionList` — an "Anomaly" badge on flagged transactions, a per-type
  risk breakdown in the expanded row, and service reachability in the debug panel.
- `useTransactionHistory` now carries `valueWei`, `gas`, `gasPrice`, which the
  model requires. Its dead 40-line `useDummyData` branch was deleted.

**Verified end-to-end:** local uvicorn + `next start` +
`POST /api/anomaly` → real scored results.

---

## Part 2 — Deployment runbook

Everything is committed and building. These are the steps that need **your**
accounts and keys.

### Step 0 — Push to GitHub

```bash
cd /Users/deepesh/Developer/Guardiant-main
git commit -m "Fix build, parameterise deployment, wire ML service"
gh repo create guardiant --private --source=. --push
```

### Step 1 — Accounts to create (all free, ~10 minutes)

| Service                | Where                          | What you need                        |
| ---------------------- | ------------------------------ | ------------------------------------ |
| Reown / WalletConnect  | https://cloud.reown.com        | Project ID                           |
| MongoDB Atlas          | https://cloud.mongodb.com      | M0 cluster → connection string       |
| Google AI Studio       | https://aistudio.google.com/apikey | Gemini API key                   |
| Etherscan              | https://etherscan.io/apis      | API key (contract verification)      |
| Hugging Face           | https://huggingface.co         | Account                              |
| Vercel                 | https://vercel.com             | Account, linked to GitHub            |

For Atlas: create the M0 cluster, add a database user, and set Network Access to
`0.0.0.0/0` — Vercel functions have no fixed egress IP.

### Step 2 — Fund a throwaway Sepolia key

Generate a **fresh** key used for nothing else:

```bash
cd contract
node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
```

Fund the matching address with ~0.1 test ETH from any of:
- https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://sepolia-faucet.pk910.de (mining faucet, no account)

### Step 3 — Deploy the contracts

```bash
cd contract
cp .env.example .env      # fill in DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY
cd .. && ./deploy.sh sepolia
```

This deploys Wallet → TransferTo → TokenFactory → CustomToken → LiquidityPool →
AnomalyGuardWallet in order and writes all six addresses plus
`NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111` into `client/.env.local`.

Optional verification:

```bash
cd contract
npx hardhat verify --network sepolia <WALLET_ADDRESS>
```

### Step 4 — Deploy the ML service to Hugging Face Spaces

Create a Space: **SDK = Docker**, visibility public (private Spaces sleep).

```bash
cd model
git init -b main
git remote add space https://huggingface.co/spaces/<user>/guardiant-anomaly
git add . && git commit -m "Anomaly detection service"
git push space main
```

`model/README.md` already carries the required YAML front-matter
(`sdk: docker`, `app_port: 7860`). The build trains a fresh model, so
`/detect` works the moment the Space goes live.

Smoke test:

```bash
BASE=https://<user>-guardiant-anomaly.hf.space
curl -s $BASE/model/status
curl -s -X POST $BASE/detect -H 'Content-Type: application/json' \
  -d '{"transactions":[{"hash":"0x1","timeStamp":"1678901234","value":"1000000000000000000","gas":"21000","gasPrice":"50000000000"}]}'
```

### Step 5 — Deploy the frontend to Vercel

Import the GitHub repo, then **set Root Directory to `client`**. Framework
auto-detects as Next.js.

Environment variables — see `client/.env.example` for the full annotated list:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID   from Reown
NEXT_PUBLIC_DEFAULT_CHAIN_ID           11155111
NEXT_PUBLIC_WALLET_ADDRESS             from ./deploy.sh output
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS      "
NEXT_PUBLIC_LIQUIDITY_POOL_ADDRESS     "
NEXT_PUBLIC_TRANSFER_ADDRESS           "
NEXT_PUBLIC_ANOMALY_GUARD_ADDRESS      "
NEXT_PUBLIC_TOKEN_FACTORY_LP_ADDRESS   "
ANOMALY_API_URL                        https://<user>-guardiant-anomaly.hf.space
MONGODB_URI                            from Atlas
GOOGLE_GENERATIVE_AI_API_KEY           from AI Studio
IMGBB_API_KEY                          optional
NEXT_PUBLIC_COIN_BACK_API_KEY          optional
```

Or from the CLI:

```bash
cd client
vercel link
while read -r line; do
  [ -z "$line" ] && continue
  echo "${line#*=}" | vercel env add "${line%%=*}" production
done < .env.local
vercel --prod
```

### Step 6 — Verify the live deployment

| Check                    | How                                              | Expected                          |
| ------------------------ | ------------------------------------------------ | --------------------------------- |
| Site loads               | open the Vercel URL                              | landing page, no console errors    |
| Wallet connects          | Connect → MetaMask                               | prompts to switch to Sepolia       |
| Token creation           | `/create` → create a token                       | tx confirms; appears on `/tokens`  |
| Mongo write              | `POST /api/savecoin/test`                        | `{"success":true}`                 |
| Anomaly service          | `/transactions` with a connected wallet          | risk analysis rows render          |
| NL transfer parser       | `/transfer` → "send 0.01 ETH to vitalik.eth"     | fields auto-fill                   |
| Liquidity                | `/liquidity` → add liquidity                     | approve + add both confirm         |

---

## Part 3 — Known gaps, deliberately left alone

Flagging these rather than silently expanding scope:

1. **Token balances on `/wallet` are hardcoded mocks.**
   `useContractFunctions.ts` returns fixed strings (`'0.05'`, `'1.25'`, `'10.5'`)
   keyed off Hardhat token addresses instead of reading ERC-20 `balanceOf`.
   Real balances need a multicall read per token.

2. **The model is fit on synthetic baseline traffic, not this wallet's history.**
   `train_baseline.py` generates 4000 log-normal transactions as a stand-in for
   "normal". It is calibrated, but it is not *your* normal. `POST /train` with a
   real transaction list (or set `ETHERSCAN_API_KEY` / `ETHERSCAN_ADDRESS` and
   `POST /train` with no body) fits real history — but the Space filesystem is
   ephemeral, so that resets on restart. Persisting it needs the artifact
   committed or fetched from object storage.

3. **Detection is per-transaction only.** Each transaction is scored on its own
   five features. Rug-pull patterns that only appear across a *sequence* —
   drain-in-many-small-transfers, a sudden burst of approvals — are invisible to
   it. That needs windowed features (rate, count, cumulative outflow), which is
   a real modelling change, not a tuning one.

4. **`useTransactionHistory` scans only the last 10 blocks**, one `getBlock` call
   each, every 30 s. On Sepolia that's ~2 minutes of history and it will exhaust
   a public RPC's rate limit. A real fix uses the Etherscan `txlist` API.

5. **`LiquidityPool` is a constant-balance AMM with no slippage protection** and
   `getSwapRate` divides by `token.balanceOf(this)` — it reverts on an empty pool
   and is trivially manipulable. Fine for a demo, unsafe for real value.

6. **`Wallet.sol.addToken` pushes duplicates** into `userTokens` with no
   deduplication, so the array grows without bound.

7. **`/api/crypto` is statically prerendered with `revalidate: 60`.** The first
   build bakes in the hardcoded fallback prices; it self-corrects after the first
   revalidation.

8. **`AnomalyGuardWallet` has no on-chain link to the ML service.** The "automatic
   self-destruct" is manual — `executeAnomalyExit()` is `onlyOwner`. Automating it
   needs a keeper (Chainlink Automation / Gelato), neither of which is free.

9. **No tests.** `model/tests/` exists but needs `pytest`, `statsmodels`,
   `matplotlib`, `seaborn`, `dask` — none in `requirements.txt`. The client has
   no test setup at all.

---

## Ongoing costs

$0/month. Watch these ceilings:

- Vercel Hobby: 100 GB bandwidth, 100 GB-hrs function execution per month.
- HF Spaces free CPU: sleeps after 48 h with zero traffic, wakes on request.
- Atlas M0: 512 MB storage, throttled after sustained load.
- Public Sepolia RPC: rate-limited — add a free Alchemy/Infura key if `/wallet`
  starts erroring.
- Gemini free tier: per-minute request cap on `/api/chat`.
