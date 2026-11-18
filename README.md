# ⛩️ Luyện Kanji - Japanese Kanji Learning & Stroke Order Platform (v3.3.0)
### *(Học Kanji JLPT N5–N1, 2.136 Jōyō Kanji, Bộ Thẻ Flashcard SRS, Cộng Đồng Chia Sẻ, Tra Cứu Nét Viết, Bộ Thủ, Romaji & Dịch Thuật Nhật - Việt)*

[![Version](https://img.shields.io/badge/version-v3.3.0-teal.svg)](https://luyenkanji.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![React Router](https://img.shields.io/badge/React_Router-v7-ca4245.svg)](https://reactrouter.com)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![KanjiVG](https://img.shields.io/badge/Data-KanjiVG%20(CC%20BY--SA%203.0)-orange.svg)](https://github.com/KanjiVG/kanjivg)

---

## 🇻🇳 Tiếng Việt (Vietnamese)

### 📢 Bản phát hành mới: Luyện Kanji v3.3.0 (Học Kanji theo cấp độ N5–N1 & 2.136 Jōyō, Câu ví dụ thực tế, Quiz 4 dạng & Cộng đồng chia sẻ bộ thẻ)

Bản cập nhật **v3.3.0** bổ sung lộ trình học Kanji hệ thống theo từng cấp độ JLPT kết hợp câu ví dụ ngữ cảnh thực tế, Quiz ôn tập tương tác và mạng chia sẻ bộ thẻ cộng đồng:

- **🎓 Học Kanji theo cấp độ JLPT N5–N1 & 2.136 Jōyō Kanji (`/levels`):**
  - **Dữ liệu 2.136 chữ chuẩn:** Chia rõ theo từng cấp **N5** (111 chữ), **N4** (216 chữ), **N3** (376 chữ), **N2** (504 chữ), **N1** (929 chữ) và trọn bộ **Jōyō Kanji (2.136 chữ)** kèm âm Hán-Việt, On/Kun, nghĩa tiếng Việt và số nét.
  - **Xem nét viết & Điều hướng liên tục:** Hiển thị dạng **Bảng**, **Thẻ (Mobile)** hoặc **Lưới thẻ** với hoạt ảnh SVG trực tiếp, lưới ô mễ, phiên âm Furigana; bấm mở **Modal luyện viết** và lướt **Trái / Phải (`←`/`→`)** sang chữ kế tiếp trong danh sách cấp độ.
  - **Tải thêm (Load More) & Cuộn nhanh:** Phân trang tải thêm theo từng đợt 48 chữ kèm nút **Lên đầu trang** ở cuối danh sách và nút cuộn nổi.
  - **Câu ví dụ thực tế Nhật – Việt:** Tích hợp tìm câu ví dụ chứa Kanji từ **Tatoeba** qua `/api/translate` (ưu tiên câu tiếng Việt chuẩn, tự động dịch dự phòng qua Google/MyMemory/Gemini nếu thiếu), phát âm `ja-JP` và lưu đệm cache ngoại tuyến ngay trên từng dòng hoặc trong **Modal Chi tiết**.
  - **Quiz ôn tập 4 dạng + Tổng hợp:** Hỗ trợ *Kanji → Nghĩa Việt*, *Nghĩa / Hán-Việt → Kanji*, *Chọn âm On / Kun đúng*, và *Điền / Tự gõ Kanji vào câu ví dụ thực tế*. Cho phép chọn phạm vi linh hoạt, dùng phím tắt `1–4` / `Enter`, ôn lại ngay chữ làm sai và lưu nhanh chữ sai vào bộ thẻ.
  - **Chọn nhiều & Lưu thẳng vào Bộ thẻ Flashcard:** Tích chọn nhiều chữ cùng lúc để tạo bộ thẻ mới hoặc thêm vào thư mục bài học có sẵn với đầy đủ Hán-Việt, On/Kun và từ ghép.

- **🤝 Cộng đồng Chia sẻ Bộ thẻ, Like, Follow & Hồ sơ Công khai (`/shares`, `/u/:userId`, `/share/:slug`):**
  - **Menu Avatar & Giao diện gọn sạch trên Mobile/Desktop:** Nhấn vào Avatar tròn trên Header để mở Dropdown truy cập nhanh **Trang cá nhân** (`/profile`), **Bộ thẻ đã chia sẻ** (`/shares`), **Tìm bạn học & Follow**, **Đồng bộ Cloud**, **Xem dữ liệu Cloud** và **Cài đặt**; tối ưu thanh Header không tràn logo trên màn hình điện thoại.
  - **Thả tim (Like), Lượt tải & Follow phản hồi tức thì (Optimistic UI):** Like và Follow cập nhật giao diện ngay lập tức khi bấm; xem danh sách **Những người đã thích**, danh sách **Người theo dõi / Đang theo dõi** ngay trên trang cá nhân hoặc trong Modal giống mạng xã hội; hỗ trợ tải bộ thẻ tự do cho cả khách và mời đăng nhập khi Like/Follow.
  - **Trang cá nhân nâng cấp (`/profile`):** Chỉnh sửa **Tên hiển thị** trực tiếp ngay bên cạnh tên, xem thống kê **Người theo dõi · Đang theo dõi** và quản lý liên kết chia sẻ công khai.

- **⚡ Cải tiến Flashcard SRS & Tiện ích học tập:**
  - **Tự động bổ sung dữ liệu thiếu:** Thẻ Flashcard thiếu âm On/Kun hoặc nghĩa tự động hiển thị trạng thái tải và làm mới sạch sẽ từ từ điển.
  - **Học viết liền mạch từ Flashcard:** Nút sao chép nhanh chữ Kanji và nút mở thẳng sang trang **Nét viết Kanji** ngay trên thẻ ôn tập.
  - **Trải nghiệm bộ thẻ chuẩn Google Drive (`/decks`, `/decks/:folderId`):** Tổ chức thư mục cha–con nhiều tầng, tạo hàng loạt cấu trúc thư mục, kéo-thả, nhập hàng loạt bằng cú pháp Text/JSON tối giản, **Modal Ôn tập Flashcard SRS tập trung** (phím tắt `Space`, `←`/`→`, `1`/`2`/`3`).
  - **Đồng bộ 2 chiều chuẩn AnkiDroid (`/api/sync/*`, `/api/profile`, `/api/community`):** Lưu trữ ngoại tuyến mặc định với `localStorage`, đồng bộ Cloud qua Supabase Auth + PostgreSQL RLS + SHA-256 3-way merge & Modal giải quyết xung đột.

- **🌐 Bản đồ các trang React Router (F5 Không mất trang):**
  - `/` hoặc `/input`: **Nhập văn bản** - Dán đoạn văn bản tiếng Nhật, bộ gõ Kanji IME và quét ảnh OCR.
  - `/kanji`: **Nét viết Kanji** - Bảng nét, hoạt ảnh SVG, Quick Bar 1-chạm, lưới ô mễ, so sánh & luyện viết tay.
  - `/levels`: **Kanji theo cấp độ** - Lộ trình **JLPT N5–N1 & 2.136 Jōyō Kanji**, Load More, câu ví dụ Tatoeba, Quiz 4 dạng và xuất bộ thẻ.
  - `/decks` & `/decks/:folderId`: **Ôn tập theo bài** - Quản lý thư mục bài học kiểu Google Drive, nhập hàng loạt & ôn Flashcard SRS.
  - `/shares`: **Bộ thẻ đã chia sẻ** - Quản lý các bộ thẻ bạn đã công khai, lượt thích, danh sách người thích và lượt tải.
  - `/share/:slug`: **Xem & Lưu bộ thẻ chia sẻ** - Xem trước, luyện tập, Like, theo dõi tác giả hoặc tải về bộ thẻ cá nhân.
  - `/profile` & `/u/:userId`: **Trang cá nhân & Hồ sơ công khai** - Đổi tên hiển thị trực tiếp, quản lý Người theo dõi / Đang theo dõi và xem hồ sơ công khai.
  - `/compare`: **So sánh Kanji** - Đối chiếu các chữ Hán gần giống nhau về nét vẽ, bộ thủ và ý nghĩa.
  - `/romaji`: **Phiên âm Romaji** - Đọc câu song song `[JP]` & `[ROMAJI]` chuẩn Hepburn.
  - `/translate`: **Dịch câu song ngữ** - Dịch Nhật - Việt qua Google Dịch & Gemini AI.
  - `/converter`: **Chuyển đổi Romaji ⇄ Kana** - Hai ngăn chuyển đổi có Undo/Redo nhiều bước.
  - `/radicals`: **214 Bộ thủ Khang Hy** - Tra cứu bộ thủ và phân tích cấu trúc chữ Hán.
  - `/extension`: **Chrome Extension v3.0** - Tiện ích tra cứu Kanji & khoanh vùng chụp ảnh OCR trên trình duyệt (`Ctrl+Shift+K`).
  - `/print`: **In phiếu tập viết A4** - Tùy chọn chữ cần in, cột hiển thị và xuất PDF chuẩn A4.
  - `/history`: **Lịch sử tra cứu** - Lưu trữ ngoại tuyến không giới hạn các chữ đã xem.
  - `/guide`: **Hướng dẫn sử dụng** - Cẩm nang chi tiết cho từng tính năng.

---

## 🌐 English

### 📢 Release: Luyện Kanji v3.3.0 (JLPT N5–N1 & 2,136 Jōyō Kanji, Real Example Sentences, 4-Mode Quiz & Social Deck Sharing)

Version **v3.3.0** introduces structured level-based Kanji study, live Japanese–Vietnamese sentence examples, interactive quizzes, and community sharing:

- **🎓 Kanji by Level (`/levels` — JLPT N5–N1 & 2,136 Jōyō Kanji):**
  - Complete **2,136 Jōyō Kanji** dataset grouped accurately into **N5** (111), **N4** (216), **N3** (376), **N2** (504), **N1** (929), and full **Jōyō (2,136)** with Sino-Vietnamese readings, On/Kun, Vietnamese meanings, and stroke counts.
  - **Table, Mobile Cards & Compact Grid Views:** Built-in SVG stroke playback, dashed grid overlay, Furigana toggle, **Load More** pagination (48 chars/batch) with **Back to Top**, and direct **Practice Modal** launch with Left/Right (`←`/`→`) navigation across the level list.
  - **Real Example Sentences (Tatoeba + Auto-Translation):** Fetches authentic Japanese sentences via `/api/translate?mode=examples`, prioritizes direct Vietnamese translations with Google/MyMemory/Gemini fallback, highlights target Kanji, speaks Japanese audio, and caches results offline.
  - **4-Mode Interactive Quiz + Mixed Mode:** Covers *Kanji → Meaning*, *Meaning/Sino-Vietnamese → Kanji*, *On/Kun Readings*, and *Sentence Cloze* (both 4-choice click and direct Kanji typing), keyboard shortcuts (`1–4`, `Enter`), review of missed characters, and one-click saving of missed Kanji into Flashcard decks.
  - **Multi-Select Export to Flashcards:** Select single or multiple characters across Load More batches and save directly into new or existing Study Folders.

- **🤝 Community Sharing, Optimistic Likes & Follows, and Public Profiles (`/shares`, `/share/:slug`, `/u/:userId`, `/profile`):**
  - Clean **Header Avatar Dropdown** separating **Profile**, **Shared Decks**, **Find Study Buddies / Follow**, **Cloud Sync**, **Cloud Inspector**, and **Settings**, with responsive mobile layout fixes.
  - **Instant Optimistic UI** for Likes (including a modal listing who liked the deck) and Follows (`Followers / Following` modal lists), guest-friendly deck downloads, and inline display-name editing on `/profile`.
  - **Unified Serverless Community API (`/api/community`):** Backed by `docs/supabase_decks_schema.sql` and `docs/supabase_community_migration.sql`.

- **🗂️ Full Route Map:**
  - `/` / `/input`: Japanese text input, IME, & OCR scanner.
  - `/kanji`: Stroke order table/grid, SVG animations, Quick Bar, & writing practice modal.
  - `/levels`: JLPT N5–N1 & 2,136 Jōyō Kanji catalog, example sentences, 4-mode Quiz, & deck export.
  - `/decks` & `/decks/:folderId`: Google Drive-style hierarchical folders, batch import, & focused SRS Flashcard modal.
  - `/shares` & `/share/:slug`: Manage published decks & explore/clone shared community decks.
  - `/profile` & `/u/:userId`: Personal profile, follower/following modals, & public learner pages.
  - `/compare`, `/romaji`, `/translate`, `/converter`, `/radicals`, `/extension`, `/print`, `/history`, `/guide`.

---

## 🛠️ Công nghệ cốt lõi / Core Technologies

- **Frontend Framework:** React 19, TypeScript 5.8, Vite 8
- **Routing:** React Router DOM v7 (HTML5 History API with full deep-linking & F5 persistence)
- **UI & Styling:** Tailwind CSS v4, Lucide React Icons
- **State Management:** React Context API (`AuthContext`, `KanjiContext`, `DeckContext`) with Offline-first `localStorage` persistence
- **Authentication, Cloud Sync & Community:** Supabase Auth (`VITE_SUPABASE_PUBLISHABLE_KEY`), Vercel Serverless Functions (`/api/profile`, `/api/sync/*`, `/api/community` using `SUPABASE_SECRET_KEY`), PostgreSQL RLS & SHA-256 3-way sync (`docs/supabase_decks_schema.sql`, `docs/supabase_community_migration.sql`)
- **Graphics & Vector Animation:** KanjiVG SVG Vector Paths, HTML5 Canvas API, `requestAnimationFrame`
- **OCR Engine:** Tesseract.js (Client-side WebAssembly OCR)
- **Speech Synthesis:** Web Speech Synthesis API (`ja-JP`)
- **Translation & Example Sentences:** Node.js Express / Vercel Serverless `/api/translate` (Tatoeba API, Google GTX, MyMemory, & `@google/genai` Gemini API)

---

## 🚀 Hướng dẫn Cài đặt / Installation Guide

```bash
# Clone repository
git clone https://github.com/your-username/luyen-kanji.git
cd luyen-kanji

# Install dependencies
npm install

# Start development server (Port 3000)
npm run dev

# Production Build
npm run build
```

> **Lưu ý cấu hình tùy chọn (`.env` / Vercel Environment Variables)**:
> - `GEMINI_API_KEY`: Dùng cho tính năng dịch song ngữ AI và dịch câu ví dụ dự phòng.
> - `VITE_SUPABASE_URL` & `VITE_SUPABASE_PUBLISHABLE_KEY` (Frontend): Dùng cho Supabase Auth ở trình duyệt.
> - `SUPABASE_URL` & `SUPABASE_SECRET_KEY` (Backend `/api/*` — **không** gắn tiền tố `VITE_`): Dùng cho Vercel Serverless Functions xác thực JWT, đồng bộ dữ liệu và tính năng cộng đồng (sau khi chạy `docs/supabase_decks_schema.sql` và `docs/supabase_community_migration.sql` trên Supabase). Mặc định khi chưa đăng nhập, ứng dụng vẫn chạy **100% Offline-first** với `localStorage`.

---

## 📚 Giấy phép / License

- Mã nguồn toàn bộ ứng dụng được phát hành theo giấy phép **[MIT License](https://opensource.org/licenses/MIT)**.
- Dữ liệu thứ tự nét vẽ Kanji thuộc bản quyền dự án **KanjiVG** (Ulrich Apel và cộng sự) theo giấy phép **CC BY-SA 3.0**.
- Dữ liệu câu ví dụ tham khảo từ cộng đồng **Tatoeba** (CC BY 2.0 FR).
