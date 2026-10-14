# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `bun install` — install dependencies (CI uses `bun install --frozen-lockfile`, so keep `bun.lock` in sync)
- `bun run dev` — Vite dev server on port 3000, exposed on the LAN (`--host`)
- `bun run check` — type-check only (`tsc --noEmit`)
- `bun run build` — type-check, then build to `dist/`
- `bun run preview` — serve the built `dist/`

There is no test suite or linter configured.

## Architecture

Client-only Preact SPA (Bun + Vite + `@preact/preset-vite`), deployed as static files to GitHub Pages at https://moebiusmania.github.io/rescuers-shift-manager/ by `.github/workflows/deploy.yml` on every push to `main`. It was migrated from Deno/Fresh; the rendered markup was kept identical to the Fresh version.

- `src/main.tsx` renders `<App />` directly into `document.body` (not a `#root` div) and registers the service worker. `src/App.tsx` holds the page shell (theme switcher, `.app-content`, footer); CSS relies on that body-level structure.
- `src/components/ShiftPlanner.tsx` is essentially the whole app: domain types, the `generateSchedule` algorithm (4-week rotation, 3/4-day cadence via `patternOffset`, alternating weekend groups A/B, a rest rule that forbids a 22:00 finish followed by an 08:00 start, and a single required volunteer `id: "VOL"`), state, tabbed UI, and CSV export. Locations are hard-coded in `LOCATIONS`; only their display labels are user-editable.
- Persistence is browser `localStorage` only (key `shiftPlannerState`, plus `theme` for the theme switcher). No backend — the README and footer promise that no data leaves the device.

### Styles

Two stylesheets, loaded in this order (order matters):
1. `public/styles.css` — the real app stylesheet, linked statically from `index.html` (not processed by Vite).
2. `src/styles.css` — a small reset/utility sheet imported from `main.tsx` and bundled by Vite.

Theming uses `[data-theme="dark"]` on `<html>` overriding CSS custom properties in `:root`. Use the semantic tokens (`--text-secondary`, `--text-muted`, `--accent-text`, `--accent-strong`, `--control-border`, `--focus-ring`, `--badge-*`) for text, borders, and focus rather than raw `--slate-*`/`--emerald-*` values: they were tuned to meet WCAG 2.1 AA contrast (4.5:1 text, 3:1 UI boundaries) in both themes.

### Base path

Vite builds with `base: "./"` so the same build works at a domain root or under the Pages sub-path. Keep every asset reference relative: in `index.html` use `/file` (Vite rewrites it), but in `public/manifest.webmanifest` and `public/sw.js` use `./` or bare relative paths, and register the SW with `import.meta.env.BASE_URL`. Bump `CACHE_NAME` in `sw.js` when changing which files it precaches.

### Accessibility conventions

The app targets WCAG 2.1 AA. Existing patterns to follow:
- Hints and errors are linked to fields with `aria-describedby` (hints stay outside the `<label>` so they aren't part of the accessible name); errors use `role="alert"` and set `aria-invalid`.
- Groups of toggle buttons use `aria-pressed` (CSS adds a ✓ so state isn't color-only); multi-button choices use `<fieldset class="fieldset">` + `<legend>`, never a `<label>` wrapping buttons.
- The tab bar follows the WAI-ARIA tabs pattern (roving `tabIndex`, arrow/Home/End keys).
- `Modal` handles initial focus (`[autofocus]` first), focus trapping, Escape, and focus restoration.

## Conventions

- UI copy, ARIA labels, and the page language (`lang="it"`) are Italian.
- Use Preact's `class` attribute (not `className`), consistent with the existing code; imports include the `.tsx` extension (`allowImportingTsExtensions`).
- Static icons in `public/` (favicon.svg/.ico, PNG app icons, apple-touch-icon) are rasterized from `favicon.svg`.
