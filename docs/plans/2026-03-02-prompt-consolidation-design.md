# Prompt Consolidation & Security Design

**Date:** 2026-03-02
**Status:** Approved

## Problem

System prompts for document generation are scattered across 7+ files (`analysis-pipelines.ts`, `prompt-chat-config.ts`, `openrouter.ts`, `perplexity.ts`, `document-edit/route.ts`, `mockups/generate/route.ts`, `generate-app/route.ts`, `json-render/catalog.ts`). This makes them hard to find, update, and audit. There is no protection against prompt injection from user inputs interpolated into prompts.

## Solution

Centralize all prompts into `src/lib/prompts/` with one file per document type, a barrel re-export, and a shared sanitization utility.

## Folder Structure

```
src/lib/prompts/
├── index.ts                    # Barrel re-export
├── sanitize.ts                 # Input sanitization & secure interpolation
├── competitive-analysis.ts     # Competitive analysis system + user prompt builder
├── prd.ts                      # PRD system prompt
├── mvp-plan.ts                 # MVP plan system prompt
├── tech-spec.ts                # Tech spec system prompt
├── prompt-chat.ts              # Prompt chat, idea summary, post-summary prompts
├── general-chat.ts             # General project chat system message
├── document-edit.ts            # Inline document editing system prompt
├── mockups.ts                  # Wireframe/mockup system prompt + builder
├── competitor-search.ts        # Perplexity competitor search prompt
├── app-generation.ts           # App type prompts + code gen builder
└── legacy-fallback.ts          # Legacy ANALYSIS_PROMPTS (4 prompts from openrouter.ts)
```

## Security Layer (`sanitize.ts`)

### 1. `sanitizeInput(input, maxLength?)`
- Strips prompt override patterns (`ignore previous instructions`, `you are now`, `system:`, `<|im_start|>`, etc.)
- Removes control characters and zero-width characters
- Truncates to configurable max length (default 5000)

### 2. `buildSecurePrompt(template, variables)`
- Replaces `{{variableName}}` placeholders with sanitized + XML-delimited values
- Output: `<user_input name="key">sanitized value</user_input>`
- Throws on unrecognized placeholders (fail-closed)

### 3. Frozen exports
- `Object.freeze()` on all exported objects/arrays to prevent runtime mutation

## Migration

Each source file that currently defines prompts inline will import from `@/lib/prompts` instead. The prompt text moves verbatim (no content changes), only the interpolation method changes to use `buildSecurePrompt()`.

### Files affected:
- `src/lib/analysis-pipelines.ts` — remove 4 system prompts, import from prompts/
- `src/lib/prompt-chat-config.ts` — remove 3 prompts, import from prompts/ (model lists stay)
- `src/lib/openrouter.ts` — remove ANALYSIS_PROMPTS + chat system message, import from prompts/
- `src/lib/perplexity.ts` — remove inline systemPrompt, import from prompts/
- `src/app/api/document-edit/route.ts` — remove inline system prompt, import from prompts/
- `src/app/api/mockups/generate/route.ts` — remove MOCKUP_PROMPT, import from prompts/
- `src/lib/json-render/catalog.ts` — remove getMockupSystemPrompt, import from prompts/
- `src/app/api/generate-app/route.ts` — remove APP_TYPE_PROMPTS + prompt builder, import from prompts/
