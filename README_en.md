# ⛩️ Luyện Kanji Pro – Japanese Kanji Learning & Stroke Order Platform

### *(2,136 Jōyō Kanji JLPT N5–N1 · SVG Stroke Practice · 4-Mode SRS Flashcards & Anki Sync · Live Kanji Arena · Handwriting Search & OCR)*

[![Live App](https://img.shields.io/badge/App-Luy%E1%BB%87n%20Kanji%20Pro-0f766e.svg)](https://luyenkanji.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![React Router](https://img.shields.io/badge/React_Router-v7-ca4245.svg)](https://reactrouter.com)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![KanjiVG](https://img.shields.io/badge/Data-KanjiVG%20(CC%20BY--SA%203.0)-orange.svg)](https://github.com/KanjiVG/kanjivg)

---

## 📖 Overview

**Luyện Kanji Pro** is a full-featured web and PWA platform built for learners mastering Japanese Kanji, stroke order, and vocabulary. It combines structured JLPT N5–N1 progression across 2,136 Jōyō Kanji, real-time geometry-based handwriting feedback, full-screen spaced-repetition (SRS) flashcards with Anki support, real-time multiplayer Kanji battles, and an offline-capable dictionary and toolset.

*(Xem tài liệu tiếng Việt tại [README.md](./README.md))*

---

## 🌟 Key Features & Modules

### 1. Smart Stroke Practice & Geometry Scoring (`/kanji`)
- **3 Writing Modes**: Ghost template guide, Blind writing from memory, and Freehand calligraphy with multi-color ink.
- **Bidirectional Geometry Scoring**: Evaluates Chamfer distance, stroke tangent alignment, length ratios, and short-stroke tolerances across 3 strictness presets (*Easy, Normal, Strict*).
- **Scroll-Aware Toolbar UX**: Filter and tool controls automatically collapse into a floating top-right circular trigger when scrolling down, keeping the full viewport free for the stroke list, PNG/Google Docs export, and A4 printable sheets.

### 2. JLPT N5–N1 Curriculum, 4-Mode Quiz & Interactive Drills (`/levels`)
- **Complete 2,136 Jōyō Kanji**: Organized by JLPT N5 through N1 with Sino-Vietnamese readings, On/Kun readings, meanings, stroke counts, and pre-bundled bilingual Tatoeba sentences.
- **Anti-Leak 4-Mode Quiz**: Kanji → Meaning, Meaning → Kanji (with Hán-Việt leak prevention), On/Kun reading (audio locked until answered), and contextual Sentence Cloze.
- **Focused Drills**: Radical composition games, compound word matching, visual mnemonic cards, and confusable Kanji training.

### 3. Full-Screen SRS Flashcards & Anki Sync (`/decks`, `/decks/:folderId`)
- **Google Drive-Style Folders**: Nested multi-level folder organization, batch Kanji/compound import, combined due-card reviews, and a dedicated Mistake Bank.
- **4 Active Recall Study Styles**: `Flip Card` (full-bleed layout with a 40% vertically centered fixed Kanji pane and 60% independently scrollable details pane), `Blind Write`, `Listen`, and `Sentence Cloze`.
- **Anki Compatibility & Analytics**: Configurable Anki-style SRS intervals (*Hard / Good / Easy*), `.apkg` import/export, 365-day study activity heatmap, and daily review hub.

### 4. Real-Time Multiplayer Kanji Arena (`/arena`)
- **1v1 & Group Matches**: Create custom rooms or join friends instantly with a 6-character invite code and player nickname.
- **Custom Quiz Library**: Build, edit, and safely delete custom question sets from personal decks or JLPT levels with server-side answer redaction.
- **Responsive Match Flow**: Optimistic instant scoring feedback, live room synchronization, and end-of-match leaderboards.

### 5. Reverse Kanji Search & Handwriting Recognition (`/search`, `/radicals`, `/compare`)
- **3,000+ Kanji Reverse Index**: Search instantly by Sino-Vietnamese reading, Vietnamese meaning, On/Kun reading, stroke count, or radical.
- **Interactive Handwriting Pad**: Draw unknown Kanji directly on the canvas to identify matching characters.
- **214 Kangxi Radicals & Side-by-Side Comparison**: Structural decomposition tree and visual comparison tool for lookalike characters.

### 6. Google OAuth, Public Profiles & Community (`/shares`, `/leaderboard`, `/profile`)
- **Google Sign-In & Cloud Sync**: Popup Google OAuth powered by Supabase Auth (syncing display name and avatar), two-way PostgreSQL RLS cloud sync, and offline-first `localStorage` fallback.
- **Community Deck Library**: Publish study decks, like and follow creators, browse public user profiles (`/u/:userId`), and clone shared decks into your personal library.
- **Daily Streaks & Leaderboard**: Real-time streak tracking in the top bar and a global consistency leaderboard.

### 7. Japanese Utilities & Offline PWA (`/routes`)
- `/input`: Japanese text editor with Romaji-to-Kanji IME and image OCR scanner (`Tesseract.js`).
- `/romaji`: Parallel Japanese and Hepburn Romaji reading alignment.
- `/translate`: Bilingual Japanese–Vietnamese translation powered by Google GTX and Gemini AI.
- `/converter`: Multi-step undo/redo converter between Romaji, Hiragana, and Katakana.
- `/print`: Customizable A4 Kanji handwriting worksheet generator.
- `/extension`: Chrome Extension companion (`Ctrl+Shift+K`) for quick lookup on any webpage.
- `/history` & `/guide`: Offline lookup history and interactive user guide.
- **Installable PWA**: Workbox runtime caching for KanjiVG SVGs and fonts enables smooth offline study on desktop and mobile.

---

## 🛠️ Core Stack

- **Frontend**: React 19, TypeScript 5.8, Vite 8, Tailwind CSS v4, Lucide Icons, Motion
- **Routing & SEO**: React Router DOM v7 with dynamic per-route metadata, OpenGraph/Twitter cards, and Schema.org JSON-LD
- **Backend & API**: Node.js + Express 5 (`server.ts`) powering Arena rooms, AI translation, Anki sync, and OAuth callbacks
- **Auth & Persistence**: Offline-first `localStorage` + Supabase Auth (Google OAuth & Email) + PostgreSQL RLS
- **Graphics, OCR & Data**: KanjiVG SVG Vector Paths, HTML5 Canvas, Tesseract.js WebAssembly OCR, JSZip (`.apkg`), Google `@google/genai` SDK
- **PWA & Speech**: Vite PWA (Workbox) & Web Speech Synthesis API (`ja-JP`)

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/luyen-kanji.git
cd luyen-kanji

# Install dependencies
npm install

# Start the development server (Port 3000)
npm run dev

# Type-check & build for production
npm run lint
npm run build
```

> **Optional Environment Variables (`.env`)**:
> - `GEMINI_API_KEY`: Enables server-side bilingual AI translation features.
> - `VITE_SUPABASE_URL` & `VITE_SUPABASE_PUBLISHABLE_KEY`: Enables Supabase Auth (Google OAuth & Email) and cloud sync.
> *(Without cloud credentials, core dictionary, stroke practice, and SRS features continue working offline-first via `localStorage`).*

---

## 📚 Credits & License

- **MIT License**: Open-source application codebase.
- **KanjiVG**: Kanji stroke order vector dataset by Ulrich Apel et al. (CC BY-SA 3.0).
- **Tatoeba Corpus**: Bilingual example sentences dataset (CC BY 2.0 FR).
