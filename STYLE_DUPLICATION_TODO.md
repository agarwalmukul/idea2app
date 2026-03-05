# Duplicate Styles Consolidation TODO

## Goal
Reduce repeated inline style patterns (colors, spacing, typography, and class bundles) found across the codebase into shared tokens, variants, and reusable primitives.

## 1) Palette / color token consolidation
- [x] Add canonical color tokens in `src/app/globals.css` (or existing design token layer).
  - [x] `--color-text-primary: #0a0a0a`
  - [x] `--color-text-secondary: #666666`
  - [x] `--color-text-muted: #999999`
  - [x] `--color-text-accent: #00d4ff`
  - [x] `--color-border-subtle: #e0e0e0`
  - [x] `--color-border-strong: #e5e5e5`
  - [x] `--color-accent-primary: rgba(0,212,255,0.15)`
  - [x] `--color-accent-primary-light: rgba(0,212,255,0.4)`
- [x] `--color-surface-soft: rgba(255,255,255,0.03)`
- [x] `--color-surface-mid: rgba(255,255,255,0.06)`
- [x] `--color-surface-strong: rgba(255,255,255,0.08)`
- [x] Migrate repeated hex/rgba usages in these files to tokens:
  - `src/app/page.tsx`
  - `src/app/(dashboard)/settings/page.tsx`
  - `src/app/(dashboard)/projects/page.tsx`
  - `src/components/layout/header.tsx`
  - `src/components/layout/sidebar.tsx`
  - `src/components/projects/dashboard-project-card.tsx`
  - `src/components/projects/inspiration-projects-section.tsx`
  - `src/components/analysis/analysis-panel.tsx`
  - `src/components/chat/chat-interface.tsx`
  - `src/components/ui/badge.tsx`
  - `src/components/ui/input.tsx`
  - `src/components/ui/textarea.tsx`
  - `src/components/ui/tabs.tsx`
- [x] Keep rare error/success accent colors local unless reused elsewhere (`ff3b30`, `f472b6`, `ff6b8a`, etc. are currently lower-duplication).

## 2) Typography token cleanup
- [x] Centralize repeated text utility tokens through global classes or shared component props:
  - [x] `text-sm` + `text-muted-foreground`
  - [x] `font-semibold`
  - [x] `font-medium`
- [x] `text-xs`
- [x] `tracking-tight`
- [x] `font-mono`
- [x] Replace hard-coded font declarations in generated code paths:
  - [x] `font-weight: 600` in `src/app/api/generate-pdf/route.ts` and `src/app/globals.css`
  - [x] `line-height`, `font-weight: 700`, and related one-off declarations where semantically similar.
- [x] Audit repeated class combinations and move into shared helpers/components:
  - [x] `text-lg font-bold tracking-tight` (currently reused in app header/sidebar and analysis headings)
  - [x] `text-sm font-semibold uppercase tracking-[0.14em] text-primary` (used on multiple marketing section labels)

## 3) Spacing/padding pattern consolidation
- [x] Create reusable spacing variants for the most repeated utility groupings. (Implemented in this branch; main had this item open)
  - [x] `px-4`
  - [x] `p-4`
  - [x] `px-3`
  - [x] `px-8`
  - [x] `py-2`
  - [x] `py-3`
  - [x] `py-1.5`
  - [x] `px-6`
- [x] Replace recurring full class bundles with semantic primitives/components in:
  - [x] `src/app/(auth)/forgot-password/page.tsx`
  - [x] `src/app/(auth)/login/page.tsx`
  - [x] `src/app/(auth)/reset-password/page.tsx`
  - [x] `src/app/(auth)/signup/page.tsx`
  - [x] `src/components/layout/content-editor.tsx`
  - [x] `src/components/ui/input.tsx`
  - [x] `src/components/ui/textarea.tsx`
  - [x] `src/components/ui/inline-ai-editor.tsx`
  - [x] `src/components/ui/markdown-renderer.tsx`

## 4) Extract repeated class bundles into reusable components
- [x] Replace repeated exact bundles:
  - [x] `h-4 w-4` (icon sizing)
  - [x] `text-sm text-muted-foreground`
  - [x] `flex items-center gap-3`
  - [x] `flex items-center justify-between`
  - [x] `flex items-center gap-2`
  - [x] `space-y-2` / `space-y-6`
- [x] Candidate extraction targets:
  - [x] `src/components/analysis/analysis-panel.tsx` (highest cluster density)
  - [x] `src/app/(dashboard)/settings/page.tsx`
  - [x] `src/app/page.tsx`
  - [x] `src/components/layout/sidebar.tsx`

## 5) Add migration safety checklist
- [x] Replace class strings using token variables in each touched file.
- [x] Keep behavior identical (visual diffs should be only noise-level)
- [x] Add TODO markers for any style that must remain intentionally unique.
- [x] Run a final scan for duplicated patterns not covered above.
