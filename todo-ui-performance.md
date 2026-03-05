# UI Performance and Responsiveness — TODO

- [x] Critical: Remove global transition rule in `src/app/globals.css` (`* { transition: ... }`).
- [x] Critical: Replace 5-second polling + repeated `router.refresh()` in `src/components/workspace/project-workspace.tsx` with event-driven or throttled update flow.
- [ ] High: Consolidate overlapping effects/state sync in `src/components/workspace/project-workspace.tsx` (localStorage hydration, generation flags, content-length checks) into a simpler coordinated flow.
- [ ] High: Remove `window.location.reload()` usage in `src/components/analysis/analysis-panel.tsx`; use targeted state/cache updates after async completion.
- [x] High: Lazy-load heavy markdown/code highlighting path in `src/components/ui/markdown-renderer.tsx` (defer `react-syntax-highlighter`, split heavy parsing/rendered sections).
- [x] High: Throttle/RAF resize drag updates in `src/components/ui/content-editor.tsx` so `documentWidth` is not updated on every `mousemove`.
- [x] High: Optimize chat rendering in `src/components/chat/chat-interface.tsx`, `src/components/chat/prompt-chat-interface.tsx`, and chat API routes by virtualizing/paginating long message lists and streaming incremental updates.
