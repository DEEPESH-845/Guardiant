#!/usr/bin/env bash
# Deploy model/ to a Hugging Face Docker Space.
#
#   ./model/deploy-space.sh                    # uses your HF username
#   ./model/deploy-space.sh my-space-name      # custom Space name
#
# Prerequisite (interactive, run it yourself):
#   model/.venv/bin/hf auth login
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HF="$ROOT/model/.venv/bin/hf"
SPACE_NAME="${1:-guardiant-anomaly}"

[ -x "$HF" ] || { echo "hf CLI not found at $HF — run: model/.venv/bin/pip install huggingface_hub" >&2; exit 1; }

USER="$("$HF" auth whoami 2>/dev/null | head -1 | tr -d '[:space:]')" || true
if [ -z "$USER" ] || [ "$USER" = "Notloggedin" ]; then
  echo "Not logged in. Run:  $HF auth login" >&2
  exit 1
fi

REPO_ID="$USER/$SPACE_NAME"
echo "→ Space: $REPO_ID"

# Idempotent: a Space that already exists is fine, we just push to it.
"$HF" repo create "$REPO_ID" --type space --sdk docker --public 2>&1 | tail -2 || true

# The Space wants model/ at its root, but model/ is a subdirectory here. Split
# it into its own history so this repo stays the single source of truth.
cd "$ROOT"
git subtree split --prefix=model -b _hf_space >/dev/null
echo "→ Pushing $(git rev-list --count _hf_space) commits…"

TOKEN="$("$HF" auth token 2>/dev/null || true)"
if [ -n "$TOKEN" ]; then
  REMOTE="https://user:${TOKEN}@huggingface.co/spaces/$REPO_ID"
else
  REMOTE="https://huggingface.co/spaces/$REPO_ID"
fi

# --force: the Space starts with its own initial commit, which shares no history
# with ours. Only ever targets the Space, never the GitHub remote.
git push --force "$REMOTE" _hf_space:main
git branch -D _hf_space >/dev/null

BASE="https://${USER}-${SPACE_NAME}.hf.space"
cat <<EOF

✅ Pushed. The Space is building (Docker build trains the model, ~3-5 min).

   Dashboard: https://huggingface.co/spaces/$REPO_ID
   API base:  $BASE

Smoke test once the build goes green:
   curl -s $BASE/model/status
   curl -s -X POST $BASE/detect -H 'Content-Type: application/json' \\
     -d '{"transactions":[{"hash":"0x1","timeStamp":"1700000000","value":"900000000000000000000","gas":"21000","gasPrice":"20000000000"}]}'

Then wire the frontend to it:
   cd client && echo "$BASE" | vercel env add ANOMALY_API_URL production && vercel --prod

To enable retraining, set TRAIN_API_KEY as a secret in the Space settings
(without it /train returns 503 by design).
EOF
