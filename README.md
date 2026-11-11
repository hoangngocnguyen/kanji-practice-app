# ⛩️ Luyện Kanji - Japanese Kanji Learning & Stroke Order Platform (v3.2.0)
### *(Học Chữ Hán, Bộ Thẻ Flashcard SRS, Tra Cứu Nét Viết, Bộ Thủ, Romaji & Dịch Thuật Nhật - Việt)*

[![Version](https://img.shields.io/badge/version-v3.2.0-teal.svg)](https://luyenkanji.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![React Router](https://img.shields.io/badge/React_Router-v7-ca4245.svg)](https://reactrouter.com)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![KanjiVG](https://img.shields.io/badge/Data-KanjiVG%20(CC%20BY--SA%203.0)-orange.svg)](https://github.com/KanjiVG/kanjivg)

---

## 🇻🇳 Tiếng Việt (Vietnamese)

### 📢 Bản phát hành mới: Luyện Kanji v3.2.0 (Quản lý Bộ thẻ kiểu Google Drive, Nhập hàng loạt & Flashcard SRS Tập trung)

Bản cập nhật **v3.2.0** nâng cấp toàn diện hệ thống quản lý bộ thẻ học Kanji và ôn tập SRS:
- **Trải nghiệm thư mục chuẩn Google Drive**: Click chọn 1 lần, nhấn đúp/`Enter` để mở (chạm 1 lần trên Mobile), bấm `F2` đổi tên trực tiếp trên dòng, chuột phải mở Context Menu, kéo-thả di chuyển thư mục và điều hướng bàn phím (`↑↓←→`, `Del`).
- **Tạo cả cấu trúc thư mục & Sao lưu toàn bộ**: Tạo nhanh hàng loạt thư mục cha–con chỉ trong 1 lần nhập (thụt đầu dòng hoặc đường dẫn `/`), kèm nút **Xuất toàn bộ** cây thư mục ra 1 file `.json`.
- **Nhập hàng loạt & Modal Chi tiết Kanji**: Hỗ trợ nhập Kanji kèm từ ghép bằng Cú pháp Text nhanh hoặc JSON tối giản cho AI (tự tra nghĩa/âm đọc Kanji), kèm Modal **Xem chi tiết** cho phép sửa/thêm/nhập hàng loạt từ ghép ngay bên trong.
- **Modal Ôn tập Flashcard SRS Tập trung**: Khóa cuộn nền, căn giữa màn hình, bố cục 2 cột tối ưu, nút chuyển thẻ trái/phải và phím tắt `Space`, `←`/`→`, `1`/`2`/`3`.

- **🌐 Định tuyến React Router Đa trang Chuẩn mực (F5 Không mất trang)**:
  - `/` hoặc `/input`: **Nhập văn bản** - Giao diện nhập liệu tinh gọn, bo góc mềm mại, tích hợp bộ gõ Kanji IME và bộ chuyển đổi cỡ chữ.
  - `/kanji`: **Nét viết Kanji** - Bảng tra nét vẽ, hoạt ảnh SVG động, thanh chọn nhanh Kanji Quick Bar 1-chạm, chế độ lưới kẻ ô mễ và modal luyện viết tay.
  - `/decks`: **Quản lý Thư mục Bài học (Trải nghiệm kiểu Google Drive)** - Tổ chức thư mục phân cấp cha–con không giới hạn, tạo cả cấu trúc thư mục 1 lần, tìm kiếm nhanh, chọn 1 lần & nhấn đúp/`Enter` để mở (chạm 1 lần trên Mobile), bấm `F2` đổi tên trực tiếp, chuột phải mở Context Menu, kéo-thả (Drag & Drop) di chuyển thư mục, điều hướng bàn phím (`↑↓←→`, `Del`), **Xuất toàn bộ** & Nhập `.json` (Gộp hoặc Tạo bản sao).
  - `/decks/:folderId`: **Chi tiết Bài học, Nhập hàng loạt & Ôn tập Flashcard SRS** - Nhập hàng loạt Kanji & từ ghép bằng **Cú pháp Text nhanh** hoặc **JSON tối giản (AI)**, mở Modal **Xem chi tiết** để sửa/thêm/nhập hàng loạt từ ghép, nút phát âm ngay cạnh chữ Kanji, và ôn tập **Flashcard kép + SRS chuẩn Anki** trong Modal tập trung toàn màn hình.
  - `/share/:slug`: **Xem & Ôn bộ bài chia sẻ công khai** - Mở liên kết chia sẻ từ bạn bè/cộng đồng để ôn thử Flashcard ngay hoặc lưu về thư mục cá nhân (kích hoạt khi cấu hình Supabase).
  - `/romaji`: **Phiên âm Romaji** - Trang chuyên biệt hiển thị các cặp dòng song song `[JP]` & `[ROMAJI]` chuẩn Hepburn, phân tách từ ghép rõ ràng, kèm tính năng phát âm và sao chép.
  - `/translate`: **Dịch câu song ngữ** - Trang dịch thuật chuyên biệt Nhật - Việt với công nghệ Google Dịch & Gemini AI.
  - `/converter`: **Chuyển đổi Romaji ⇄ Kana có Hoàn tác (Undo/Redo)** - Trang chuyển đổi độc lập 2 ngăn Input - Output với tính năng Hoàn tác / Làm lại nhiều bước, tránh nhầm lẫn khi chỉnh sửa văn bản.
  - `/radicals`: **214 Bộ thủ Khang Hy** - Khám phá cấu trúc và ý nghĩa gốc các bộ thủ chữ Hán.
  - `/extension`: **Chrome Extension v3.0** - Trang tải tiện ích trình duyệt, hướng dẫn cài đặt 3 bước và hướng dẫn phím tắt khoanh vùng chụp màn hình OCR (Ctrl+Shift+K).
  - `/print`: **In phiếu tập viết A4** - Trang chuyên biệt cấu hình in ấn: tùy chọn từng chữ Kanji cần in, chọn các cột hiển thị (STT, Chữ Hán & Hán-Việt, Âm đọc, Nét vẽ, Ô kẻ mễ luyện tay) và xuất bản in / PDF chuẩn A4 đa trang.
  - `/history`: **Lịch sử tra cứu Nâng cấp** - Không giới hạn số lượng từ, lưu trữ đầy đủ toàn bộ dữ liệu chi tiết và nét vẽ ngoại tuyến (localStorage) không cần gọi lại API, hỗ trợ xem cả Bảng nét và Thẻ tương tự trang chính.
  - `/guide`: **Hướng dẫn sử dụng** - Cẩm nang học tập toàn diện dạng trang riêng.

- **🖨️ Trang In Phiếu Tập Viết A4 Chuyên Biệt (Tách Khỏi Modal)**:
  - Chuyển hoàn toàn tính năng in ấn từ Modal thành trang Route chuyên biệt (`/print`) có thể truy cập trực tiếp, lưu bookmark hoặc F5 không mất trạng thái.
  - Giao diện trắng thanh lịch, sạch đẹp thay cho nền xanh cũ.
  - Cho phép tích chọn hoặc bỏ chọn từng chữ Kanji cần in (kèm nút "Chọn tất cả" / "Bỏ chọn tất cả") thay vì bắt buộc in toàn bộ.
- **✨ Tinh gọn Giao diện, Xóa bỏ Trùng lặp & Cập nhật Hướng Dẫn**:
  - **Header thông minh**: Loại bỏ việc lặp lại tên web cạnh Sidebar; Header hiển thị chính xác tên trang và mô tả của tính năng đang truy cập.
  - **Trang Hướng dẫn sử dụng chuẩn mực**: Xóa bỏ banner gradient cồng kềnh, tối ưu hóa kích thước chữ nhỏ gọn dễ đọc, cập nhật nội dung bám sát 8 tính năng thực tế.
  - **Biểu tượng Chuyển đổi Romaji mới**: Thay biểu tượng ngôi sao bằng icon 2 chiều chuyển đổi `<->` trực quan (`ArrowLeftRight`).
  - **Dọn sạch mô tả và mẫu thừa**: Xóa các mô tả dài dòng và các nút mẫu có sẵn gây rối ở ô nhập liệu và modal quét OCR.
  - **Tách bạch tính năng**: Mỗi trang tập trung 100% vào nghiệp vụ riêng, không chèn lẫn nút của tính năng khác vào nhau.
  - **Không còn Toast phiền hà**: Lược bỏ các thông báo popup không cần thiết cho các thao tác gõ chữ thông thường.
  - **Footer tối giản bám sát đáy trang**: Loại bỏ banner bản quyền chiếm diện tích lớn, thay bằng thanh Footer gọn nhẹ dính sát đáy màn hình với liên kết mở hộp thoại *Nguồn dữ liệu & Bản quyền*.

---

## 🌐 English

### 📢 Release: Luyện Kanji v3.2.0 (Google Drive-style Decks, Batch Import & Focused SRS Modal)

Version **v3.2.0** transforms deck management and SRS review into a fast, distraction-free study workflow:
- **🌐 React Router Deep-linking (F5 Persistent Navigation)**:
  - `/` / `/input`: Minimalist, focused Japanese text input area with IME support.
  - `/kanji`: Dedicated stroke order list, SVG animation, practice modal, and horizontal Quick Bar.
  - `/decks`: **Hierarchical Study Folders (Google Drive-style UX)** — Manage nested parent/child folders, bulk-create entire folder trees (indentation or `/` paths), **Export All** folders in one JSON, single-click select & double-click/`Enter` to open (single-tap on mobile), `F2` inline rename, right-click context menu, drag-and-drop moving with cycle guard, keyboard navigation (`↑↓←→`, `Del`), and smart JSON Merge/Copy import.
  - `/decks/:folderId`: **Folder Detail, Batch Import & Focused SRS Modal** — Batch-import Kanji and compound words via **Quick Text Syntax** or **Minimalist AI-friendly JSON**, open the wide **Kanji Detail Modal** to edit/add/batch-import compound words, and review inside a **full-viewport focused Flashcard SRS Modal** (scroll-locked, centered fixed-height 2-column cards, `Space`, `←`/`→`, `1`/`2`/`3`).
  - `/share/:slug`: **Public Shared Deck Viewer** — Practice or clone shared community decks (when Supabase is configured).
  - `/romaji`: Dedicated Hepburn Romaji transliteration reading view with side-by-side line pairs.
  - `/translate`: Focused Japanese-Vietnamese translation powered by Google Translate & Gemini AI.
  - `/converter`: Dedicated Romaji ⇄ Kana converter featuring a dual-panel layout and full multi-step Undo/Redo history stack.
  - `/radicals`: 214 Kangxi Radicals explorer.
  - `/history`: Unlimited local storage caching with full offline Kanji details and reusable stroke tables/grids.
  - `/guide`: Dedicated full-page user guide.
- **✨ UI Decluttering & Header Breadcrumbs**:
  - Header displays current page context instead of repeating the application brand.
  - Removed redundant sample presets, cluttering banners, bulky footer license cards (replaced with a compact sticky footer bar), and noisy toasts on routine actions.

---

## 🛠️ Công nghệ cốt lõi / Core Technologies

- **Frontend Framework:** React 19, TypeScript 5.8, Vite 8
- **Routing:** React Router DOM v7 (HTML5 History API with full deep-linking & F5 persistence)
- **UI & Styling:** Tailwind CSS v4, Lucide React Icons
- **State Management:** React Context API (`KanjiContext`, `DeckContext`) with Offline-first `localStorage` persistence
- **Optional Cloud Sync & Sharing:** Supabase (`@supabase/supabase-js` Auth & PostgreSQL RLS via `docs/supabase_decks_schema.sql`)
- **Graphics & Vector Animation:** KanjiVG SVG Vector Paths, HTML5 Canvas API, `requestAnimationFrame`
- **OCR Engine:** Tesseract.js (Client-side WebAssembly OCR)
- **Speech Synthesis:** Web Speech Synthesis API (`ja-JP`)
- **Backend & AI:** Node.js Express Server, `@google/genai` (Gemini API)

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

> **Lưu ý cấu hình tùy chọn (`.env`)**:
> - `GEMINI_API_KEY`: Dùng cho tính năng dịch song ngữ AI.
> - `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`: Tùy chọn — ứng dụng mặc định chạy **100% Offline-first** với `localStorage`; khi khai báo thêm 2 biến này (và chạy `docs/supabase_decks_schema.sql` trên Supabase), tính năng đồng bộ tài khoản Cloud và chia sẻ liên kết công khai `/share/:slug` sẽ tự động kích hoạt.

---

## 📚 Giấy phép / License

- Mã nguồn toàn bộ ứng dụng được phát hành theo giấy phép **[MIT License](https://opensource.org/licenses/MIT)**.
- Dữ liệu thứ tự nét vẽ Kanji thuộc bản quyền dự án **KanjiVG** (Ulrich Apel và cộng sự) theo giấy phép **CC BY-SA 3.0**.
