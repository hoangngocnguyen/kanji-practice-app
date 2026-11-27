# ⛩️ Luyện Kanji Pro – Kanji Handwriting Practice & Real-Time Stroke Correction

### *(2D Geometric Stroke Scoring · 4-Mode SRS Flashcards & Anki · Friend Streaks & Streak Freeze · Web Push PWA Notifications · Live Kanji Arena · 2,136 KANJIDIC2 Jōyō Kanji)*

[![Live App](https://img.shields.io/badge/App-Luy%E1%BB%87n%20Kanji%20Pro-0f766e.svg)](https://luyenkanji.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![React Router](https://img.shields.io/badge/React_Router-v7-ca4245.svg)](https://reactrouter.com)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_&_Realtime-3ecf8e.svg)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![KanjiVG](https://img.shields.io/badge/Data-KanjiVG%20(CC%20BY--SA%203.0)-orange.svg)](https://github.com/KanjiVG/kanjivg)

---

## 📖 Overview

**Luyện Kanji Pro** is a specialized web and PWA platform centered on **stroke-by-stroke Japanese Kanji handwriting practice with real-time geometric error correction**. Powered by official **KanjiVG** stroke vectors, it pairs bidirectional handwriting evaluation with full-screen SRS flashcards (with Anki sync), **Friend Streaks & Streak Freezes**, multi-platform **Web Push PWA** notifications, real-time multiplayer Kanji battles, and **2,136 Jōyō Kanji** normalized against **KANJIDIC2**.

*(Xem tài liệu tiếng Việt tại [README.md](./README.md))*

---

## 🌟 Key Features & Modules

### 1. Stroke-by-Stroke Handwriting Practice & Error Correction (`/kanji`)
- **3 Writing Modes**: Ghost template tracing, **Blind writing** from memory, and **Freehand** multi-color calligraphy.
- **2D Geometric Stroke Scoring & Correction**: Evaluates every hand-drawn stroke against KanjiVG ground truth using *Chamfer distance*, curve tangent direction, length ratios, and short-stroke tolerances across 3 strictness presets (*Easy, Normal, Strict*) — immediately flagging wrong stroke order, direction, or placement so learners can fix mistakes on the spot.
- **Focused Writing UX**: Auto-collapsing floating toolbar on scroll, stroke-order animation, PNG/Google Docs export, and A4 printable practice worksheets (`/print`).

### 2. Full-Screen SRS Flashcards & Anki Sync (`/decks`, `/decks/:folderId`)
- **Google Drive-Style Folders**: Nested multi-level folder organization, batch Kanji/compound import, combined due-card reviews, and a dedicated **Mistake Bank**.
- **4 Active Recall Modes**: `Flip Card` (full-bleed 40% fixed centered Kanji pane / 60% independently scrollable details pane), `Blind Write` (on-card handwriting check), `Listen`, and `Sentence Cloze`.
- **Anki Compatibility & 365-Day Heatmap**: Configurable *Hard / Good / Easy* intervals, `.apkg` import/export, and a **365-day activity heatmap** showing both active study days and Streak Freeze protection days.

### 3. Friend Streaks, Streak Freezes & Leaderboard (`/leaderboard`, `/invite/streak/:code`)
- **Friend Streaks (up to 6 connections)**: Invite learners directly in-app or via shareable invite links (`/invite/streak/:code`) to maintain shared daily streaks (`Asia/Ho_Chi_Minh` timezone) and send study nudges.
- **Streak Freeze Shield (start with 1 · max 2 held)**:
  - **Auto-Save**: Automatically consumes 1 Freeze to protect a missed day (rendered in ice-blue across the 30-day strip and 365-day heatmap).
  - **Rescue Friends**: Spend 1 personal Freeze to rescue a friend's streak before it breaks and trigger an instant notification.
  - **Auto-Recharge**: Earn **+1 Streak Freeze** after every **10 consecutive study days**.

### 4. Multi-Platform Notifications & Web Push PWA
- **Desktop Bell & Avatar Notification Tab**:
  - **Header Bell Popover**: Unread counter badge, *All / Unread* filter, mark as read / mark all read, delete, and deep-link navigation.
  - **Avatar Dropdown Tabs**: Segmented *Account | Notifications* tabs for mobile and desktop, synced live via **Supabase Realtime (`postgres_changes`)**.
- **Arrival Banners & Background Web Push**: Non-blocking arrival/live notification banners plus **VAPID Web Push** via a custom Workbox Service Worker (`src/sw.ts`) for background alerts even when the browser is closed, backed by a daily **Vercel Cron** study reminder at `20:00` VN time.

### 5. Real-Time Multiplayer Kanji Arena (`/arena`)
- **1v1 & Group Matches**: Create custom rooms or join friends instantly with a 6-character invite code.
- **Custom Quiz Library**: Build, edit, and safely delete custom question sets from personal decks or JLPT levels with server-side answer redaction and live leaderboards.

### 6. KANJIDIC2-Normalized 2,136 Jōyō Kanji & Reverse Handwriting Search (`/levels`, `/search`, `/radicals`, `/compare`)
- **Modern Japanese-Vietnamese Meanings**: All **2,136 Jōyō Kanji** and compound lookup entries are aligned with **KANJIDIC2** to prioritize modern Japanese usage and remove misleading archaic/Simplified Chinese glosses.
- **4-Mode Quizzes & Drills**: Anti-leak quizzes, radical matching, compound word pairing, visual mnemonics, and confusable character training.
- **3,000+ Reverse Search & Drawing Pad**: Search by Sino-Vietnamese reading, Vietnamese meaning, On/Kun, stroke count, **214 Kangxi Radicals**, side-by-side comparison (`/compare`), or **draw unknown Kanji on canvas** to identify and practice writing immediately.

### 7. Smart Google Profiles & Japanese Toolkit
- **Google OAuth & Profile Sync (`/profile`, `/u/:userId`, `/shares`)**: Automatically syncs Google avatar and `full_name` (cleaning legacy Gmail-prefix names while **always preserving user-customized display names**), backed by PostgreSQL RLS and offline-first `localStorage`.
- **Utilities & Offline PWA**: Romaji-to-Kanji IME & image OCR (`Tesseract.js`) at `/input`, `/romaji`, AI `/translate`, `/converter`, `/print`, Chrome Extension (`/extension`), `/history`, `/guide`, and offline-cached KanjiVG SVG strokes.

---

## 🛠️ Core Stack

- **Frontend**: React 19, TypeScript 5.8, Vite 8, Tailwind CSS v4, Lucide Icons, Motion
- **Routing & SEO**: React Router DOM v7 (`RouteMetaManager`, OpenGraph/Twitter Cards, Schema.org `WebSite` / `WebApplication` / `FAQPage`, `sitemap.xml`)
- **Backend & Cron**: Node.js + Express 5 (`server.ts`) & Vercel Serverless Functions (`/api/*`, Vercel Cron daily reminder)
- **Database, Auth & Realtime**: Offline-first `localStorage` + Supabase Auth (Google OAuth & Email) + PostgreSQL RLS + RPC + Realtime `postgres_changes`
- **Push & Offline PWA**: `vite-plugin-pwa` (`injectManifest` + custom `src/sw.ts` Workbox), `web-push` (VAPID)
- **Graphics, OCR & AI**: KanjiVG SVG Vector Paths, HTML5 Canvas, Tesseract.js WebAssembly OCR, JSZip (`.apkg`), Google `@google/genai` SDK, Web Speech API (`ja-JP`)

---

## 🚀 Getting Started

### 1. Local Setup
```bash
# Clone repository
git clone https://github.com/your-username/luyen-kanji.git
cd luyen-kanji

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server (Port 3000)
npm run dev

# Type-check & build for production
npm run lint
npm run build
```

### 2. Environment Variables (`.env.example`)
- **AI Translation**: `GEMINI_API_KEY`
- **Supabase Frontend & Backend**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- **Web Push PWA & Cron (VAPID)**: Generate keys with `npx web-push generate-vapid-keys`, then set `VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `CRON_SECRET`.
*(Without cloud keys, core handwriting practice, stroke error checking, dictionary search, and SRS flashcards work offline-first via `localStorage`).*

### 3. Supabase Database Migrations
Run the SQL migration scripts in `/docs` inside **Supabase SQL Editor** in order:
1. `docs/supabase_decks_schema.sql` — Profiles, folders & SRS decks
2. `docs/supabase_community_migration.sql` — Community deck sharing, likes & follows
3. `docs/supabase_mistakes_heatmap_migration.sql` — Mistake Bank & study sync
4. `docs/supabase_study_streak_migration.sql` — Individual study streaks & history
5. `docs/supabase_arena_migration.sql` — 1v1 & group Kanji Arena rooms
6. `docs/supabase_google_profile_fix_migration.sql` — Google `full_name` & avatar synchronization
7. `docs/supabase_friend_streak_notifications_migration.sql` — Friend Streaks (6-slot atomic RPC cap), Streak Freezes, Realtime `notifications` & `push_subscriptions`

---

## 📚 Credits & License

- **MIT License**: Open-source application codebase.
- **KanjiVG**: Kanji stroke order vector dataset by Ulrich Apel et al. (CC BY-SA 3.0).
- **KANJIDIC2 / EDRDG & Tatoeba Corpus**: Modern Japanese Kanji gloss normalization and bilingual example sentences (CC BY-SA / CC BY 2.0 FR).
