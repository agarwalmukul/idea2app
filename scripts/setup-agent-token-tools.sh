#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v uvx >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Missing uvx.
Install uv first, then rerun:
  brew install uv
or:
  curl -LsSf https://astral.sh/uv/install.sh | sh
EOF
  exit 127
fi

echo "Building code-review-graph for $(pwd)"
uvx code-review-graph build || {
  echo "code-review-graph build failed. Try: uvx code-review-graph --help" >&2
  exit 1
}

echo "Checking MCP servers can start"
timeout_cmd="timeout"
if ! command -v timeout >/dev/null 2>&1; then
  timeout_cmd="gtimeout"
fi
if command -v "$timeout_cmd" >/dev/null 2>&1; then
  "$timeout_cmd" 8s uvx code-review-graph serve --repo . >/tmp/code-review-graph-smoke.log 2>&1 || true
  "$timeout_cmd" 8s uvx --from "token-savior-recall[mcp]" token-savior >/tmp/token-savior-smoke.log 2>&1 || true
else
  echo "No timeout/gtimeout installed; skipping server smoke test."
fi

cat <<'EOF'
Done.
Restart your agent/editor so .mcp.json and .codex/config.toml are reloaded.
EOF
