# 📋 Implementation Plan: Decoupling Kanji SVG Storage & Configurable CDN Mirror

## 1. User Intent & Architectural Decision Summary

### Problem
Storing ~6,000+ KanjiSVG files directly inside the main application repository or relying exclusively on a single third-party CDN poses two major risks:
1. **Repository Bloat & Workspace Sluggishness**: Including thousands of individual SVG files in the local Vite workspace severely slows down file tree loading, linting, git operations, and AI Studio workspace sync.
2. **Third-Party CDN Dependency**: Relying on `cdn.jsdelivr.net/gh/kanjivg/kanjivg@master/kanji/` alone creates potential points of failure if jsDelivr undergoes rate-limiting, downtime, or blocking.

### Solution
Architect a **Decoupled External SVG Asset Pipeline** with a 2-Tier Fallback Mechanism:
- **Custom Asset Repository Model**: All Kanji SVG files are hosted in a dedicated, lightweight external GitHub repository (e.g. `luyenkanji-svg` or user's custom mirror) deployed to **GitHub Pages / Vercel / Cloudflare Pages / R2**.
- **Configurable Base URL via Environment Variable**: Use `VITE_KANJI_SVG_BASE_URL` in `.env` / `.env.example` allowing instant switching between primary custom CDN repository and fallbacks.
- **2-Tier Automatic Resilient Fallback Engine**:
  - **Tier 1 (Primary)**: Fetch SVG from `VITE_KANJI_SVG_BASE_URL` (e.g., `https://raw.githubusercontent.com/<user>/luyenkanji-svg/main/kanji/` or custom GitHub Pages domain).
  - **Tier 2 (Automatic Fallback)**: If Primary fetch fails (404/Network Error/CORS), automatically fallback to official jsDelivr KanjiVG CDN (`https://cdn.jsdelivr.net/gh/kanjivg/kanjivg/kanji/`).
  - **Caching Layer**: Retain in-memory `svgCache` Map to prevent redundant HTTP requests across both Extension and Web App.

---

## 2. Technical Architecture & Data Flow

```
[User Request for Kanji Char (e.g. '制' -> hex '05236')]
                          │
                          ▼
            [kanji.ts / fetchKanjiSvgDoc()]
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
   [In-Memory Cache Match?] ──YES──> [Return Cached SVG]
             │
            NO
             │
             ▼
   [Tier 1: Primary Fetch]
   URL: `${VITE_KANJI_SVG_BASE_URL}/${hex}.svg`
             │
      ┌──────┴──────┐
   Success?       Failed? (404 / NetErr)
      │             │
      ▼             ▼
  [Return SVG]   [Tier 2: Fallback Fetch]
                 URL: `https://cdn.jsdelivr.net/gh/kanjivg/kanjivg/kanji/${hex}.svg`
                    │
                 Success? ───> [Return Fallback SVG & Cache]
```

---

## 3. Detailed File Changes & Implementation Tasks

### A. Environment Configuration (`.env.example` & `src/vite-env.d.ts`)
- Define `VITE_KANJI_SVG_BASE_URL` in `.env.example` with clear documentation.
- Add TypeScript type declarations for `VITE_KANJI_SVG_BASE_URL` in `src/vite-env.d.ts`.

### B. Core Kanji SVG Utility (`src/utils/kanji.ts`)
- Update `fetchKanjiSvg(char)` and SVG document fetching helpers:
  - Read `import.meta.env.VITE_KANJI_SVG_BASE_URL` as primary.
  - Implement async fallback to jsDelivr CDN if primary fails or returns non-200.
  - Retain `svgCache` Map to optimize repeat views.

### C. Extension Script Exporter (`src/components/ExtensionExporter.tsx`)
- Update generated `content.js` script template to support configurable primary SVG CDN with automatic fallback.
- Allow optional custom SVG Base URL parameter in Extension settings or manifest configuration.

### D. Settings Modal (`src/components/SettingsModal.tsx`)
- Add a user-facing **"Nguồn Dữ Liệu Nét Vẽ SVG (Custom SVG CDN)"** setting input in the Settings Modal.
- Allow users/admins to test and override the SVG server URL at runtime via `localStorage`.

### E. Standalone Extension Script (`src/extension/content.js`)
- Update `fetchKanjiSvgDoc(char)` in standalone `content.js` to attempt custom primary CDN URL before falling back to jsDelivr.

---

## 4. Instructions for Creating the External SVG Repository

Provide step-by-step instructions for the user to clone and host `luyenkanji-svg`:

1. **Create Repository**:
   Create a new public GitHub repository named `luyenkanji-svg`.
2. **Populate SVGs**:
   Upload or clone the KanjiVG SVG directory (contains `00021.svg` to `09faf.svg`).
3. **Enable GitHub Pages**:
   Go to Repo Settings → Pages → Deploy from `/root` (or `main` branch).
4. **Set Environment Variable**:
   In your Luyện Kanji Web App `.env`:
   `VITE_KANJI_SVG_BASE_URL=https://raw.githubusercontent.com/<YOUR_GITHUB_USERNAME>/luyenkanji-svg/main/kanji`

---

## 5. Verification Plan

### Automated Verification
- Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript or syntax errors.
- Run `compile_applet` to confirm the applet builds cleanly.

### Manual / Visual Verification
1. Test primary SVG fetch from configured URL.
2. Simulate primary URL failure (e.g. point to invalid URL) to verify automatic 2-tier fallback seamlessly loads SVG from jsDelivr without breaking UI or throwing unhandled exceptions.
