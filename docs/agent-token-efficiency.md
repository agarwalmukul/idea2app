# Agent token efficiency setup

This repository is configured for lower-token Claude Code / Codex sessions.

## What is wired

- `code-review-graph`: structural graph + blast-radius context for review/navigation.
- `token-savior-recall`: symbol navigation + compact persistent recall.
- Caveman-style output discipline: terse, technical answers with no filler.
- claude-token-efficient rules: read before writing, avoid repeated reads, skip large files unless required.

## First run on a new machine

```bash
brew install uv || true
./scripts/setup-agent-token-tools.sh
```

Then restart Claude Code / Codex / editor agent so MCP config is reloaded.

## How agents should use this

1. Start with the repo instruction file (`AGENTS.md` or `CLAUDE.md`).
2. Build/query `code-review-graph` before broad review or large refactors.
3. Use `token-savior-recall` symbol tools before reading whole files.
4. Keep output short and verification-focused.

## Manual fallback

If MCP is unavailable:

```bash
uvx code-review-graph build
uvx code-review-graph serve --repo .
uvx token-savior-recall
```

