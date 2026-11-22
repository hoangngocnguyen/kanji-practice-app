# ⛩️ Luyện Kanji - Japanese Kanji Learning & Stroke Order Platform (v3.3.0)
### *(JLPT N5–N1, 2,136 Jōyō Kanji, SRS Flashcard Decks, Community Sharing, Stroke Practice, Radical Drills, Romaji & Bilingual Translation)*

[![Version](https://img.shields.io/badge/version-v3.3.0-teal.svg)](https://luyenkanji.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![React Router](https://img.shields.io/badge/React_Router-v7-ca4245.svg)](https://reactrouter.com)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![KanjiVG](https://img.shields.io/badge/Data-KanjiVG%20(CC%20BY--SA%203.0)-orange.svg)](https://github.com/KanjiVG/kanjivg)

---

## 📖 Overview

**Luyện Kanji** is a comprehensive web platform designed for learners mastering Japanese Kanji and vocabulary. Version **v3.3.0** integrates structured JLPT levels (N5–N1), smart stroke writing practice with bidirectional scoring, interactive radical composition drills, global daily streaks, a dedicated leaderboard, SRS flashcards, and community deck sharing.

---

## 🌟 Key Features & Interactive Modules

### 1. Smart Stroke Practice & Grading (`/kanji`)
- **3 Writing Modes**: Ghost template (Bóng mờ), Blind writing (Viết mù từ trí nhớ), and Freehand (Viết tự do with custom ink colors).
- **Advanced Geometry Scoring**: Bidirectional Chamfer distance + tangent alignment, length proportion checks, and short-stroke tolerance.
- **Adjustable Difficulty**: Easy, Normal, and Strict grading presets.
- **Instant Flow**: Zero-delay (`0ms`) stroke progression upon passing, automatic quick-clear (~280ms) for failed strokes to retry immediately, undo last stroke, and single-stroke hints.

### 2. Interactive Drills (`/levels` & Drills Modal)
- **Radical Composition (Ghép Bộ Thủ)**: Select correct radical components to assemble target Kanji characters.
- **Compound Word Matching (Nối Từ Ghép)**: Practice contextual vocabulary matching and real-world usage.

### 3. Daily Streaks & Leaderboard (`/leaderboard` & Header)
- **Header Flame Indicator**: Live streak counter on top bar with a quick dropdown menu and direct shortcut to the leaderboard.
- **Dedicated Leaderboard Page**: Compete and view study consistency rankings.

### 4. Kanji by Level & 0ms Quiz (`/levels`)
- **JLPT N5–N1 & 2,136 Jōyō Kanji**: Grouped datasets with Sino-Vietnamese readings, On/Kun, meanings, and stroke counts.
- **0ms Tatoeba Example Sentences**: Pre-bundled static bilingual corpus (`/public/data/kanji_sentences_static.json`) loading instantly without API latency.
- **4-Mode Interactive Quiz**: Kanji → Meaning, Meaning → Kanji, On/Kun readings, and Sentence Cloze typing with instant keyboard shortcuts (`1–4`, `Enter`).

### 5. SRS Flashcards & Community Deck Sharing (`/decks` & `/shares`)
- **Google Drive-Style Folders**: Multi-level hierarchical folder management, batch import, and focused SRS review modal (*Again, Good, Easy*).
- **Community Sharing & Optimistic UI**: Publish decks, like and follow authors instantly with optimistic UI updates, view deck likers and followers modals, and clone shared decks.
- **Cloud Sync**: Offline-first `localStorage` persistence with seamless Supabase Auth & PostgreSQL RLS cloud sync.

### 6. Comprehensive Lookup & Tools (`/routes`)
- `/input`: Japanese text input, IME input method, and OCR image scanner (Tesseract.js).
- `/compare`: Compare visually similar Kanji characters.
- `/romaji`: Hepburn Romaji reading parallel alignment.
- `/translate`: Japanese–Vietnamese bilingual translation (Google GTX & Gemini AI).
- `/converter`: Romaji ⇄ Kana bi-directional conversion with multi-step Undo/Redo.
- `/radicals`: 214 Kangxi radicals and structural decomposition tree.
- `/extension`: Chrome Extension v3.0 support (`Ctrl+Shift+K`).
- `/print`: A4 handwriting worksheet generator with custom columns and PDF export.
- `/history`: Unlimited offline search history.
- `/guide`: Detailed user manual.

---

## 🛠️ Core Technologies

- **Frontend**: React 19, TypeScript 5.8, Vite 8, Tailwind CSS v4, Lucide Icons
- **Routing**: React Router DOM v7 (HTML5 History API with full F5 persistence)
- **State & Storage**: React Context API with offline-first `localStorage` + Supabase PostgreSQL RLS
- **Graphics**: KanjiVG SVG Vector Paths, HTML5 Canvas API, `requestAnimationFrame`
- **OCR & Speech**: Tesseract.js WebAssembly OCR, Web Speech Synthesis API (`ja-JP`)

---

## 🚀 Installation & Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/luyen-kanji.git
cd luyen-kanji

# Install dependencies
npm install

# Start development server (Port 3000)
npm run dev

# Production Build
npm run build
```

> **Optional Environment Configuration (`.env`)**:
> - `GEMINI_API_KEY`: For AI bilingual translation features.
> - `VITE_SUPABASE_URL` & `VITE_SUPABASE_PUBLISHABLE_KEY`: For frontend Supabase authentication and cloud sync.
> *(Without credentials, the app operates 100% offline-first via `localStorage`).*

---

## 📚 Credits & License

- **MIT License**: Open-source codebase.
- **KanjiVG**: Kanji stroke order vector data by Ulrich Apel et al. (CC BY-SA 3.0).
- **Tatoeba Corpus**: Example sentence dataset (CC BY 2.0 FR).
