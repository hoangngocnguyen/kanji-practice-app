# ⛩️ Luyện Kanji - Japanese Kanji Learning & Stroke Order Platform (v3.0.0)
### *(漢字書き順・部首・練習・日越辞書ツール)*

[![Version](https://img.shields.io/badge/version-v3.0.0-teal.svg)](https://luyenkanji.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![KanjiVG](https://img.shields.io/badge/Data-KanjiVG%20(CC%20BY--SA%203.0)-orange.svg)](https://github.com/KanjiVG/kanjivg)

---

## 🇻🇳 Tiếng Việt (Vietnamese)

### 📢 Bản phát hành mới: Luyện Kanji v3.0.0 (Hepburn Romaji Engine, Snipping OCR, Google Docs Exporter & 4-Tier Radicals)

Bản cập nhật **v3.0.0** mang đến bước tiến đột phá cho hệ sinh thái **Luyện Kanji**:
- **🔤 Phiên âm Romaji Xen kẽ Từng dòng (Interleaved Hepburn Romaji Transliteration Engine)**: Tự động phân tích và chuyển đổi toàn bộ đoạn văn tiếng Nhật (chứa mọi Kanji, Hiragana, Katakana) sang phiên âm Romaji chuẩn Hepburn với khoảng trắng tách từ ngữ cảnh, trường âm nguyên âm (`ō`, `ū`), trợ từ ngữ pháp (`は` → `wa`, `を` → `o`, `へ` → `e`). Trình bày dạng cặp dòng song song `[JP]` & `[ROMAJI]` giúp theo dõi dễ dàng, kèm nút tùy chỉnh cỡ chữ `A-`/`A+` (12px - 18px) trực tiếp trên ô nhập liệu và Cài đặt chung.
- **⌨️ Bộ gõ IME Nhật Bản Toàn diện (Romaji → Hiragana → Kanji)**: Gõ phiên âm Latinh, bấm phím `Space` hoặc `Tab` để hiển thị menu gợi ý Kanji chuẩn IME Nhật (kèm chữ Hán, Furigana, âm Hán-Việt và nghĩa tiếng Việt). Hỗ trợ phím số `1`-`9`, `Enter`, `↑`/`↓`, tích hợp trên khung nhập chính và thanh tìm kiếm nhanh.
- **📸 Chụp màn hình khoanh vùng (Screen Snipping OCR - `Ctrl + Shift + K`)**: Khoanh vùng chụp bất kỳ chữ Hán nào trên video YouTube, phim Anime, truyện tranh Manga scan, hình ảnh hoặc tệp PDF để tra cứu tức thì.
- **📋 Xuất Bảng 1 Cột Tùy Chỉnh (Google Docs Table Exporter)**: Tùy chọn bật/tắt linh hoạt các cột (STT, Chữ Hán & Hán-Việt, Âm đọc & Ý nghĩa, Ảnh nét vẽ) và sao chép toàn bộ bảng ảnh chỉ với 1 cú nhấp để dán trực tiếp (`Ctrl + V`) vào Google Docs hoặc Microsoft Word.
- **🖨️ In Ấn A4 Đa Trang & Tùy Chọn Cột (Multi-Page Print Engine)**: Thuật toán unroll CSS paged media giúp in trọn vẹn danh sách Kanji qua nhiều trang A4 sạch sẽ, không bị giới hạn 1 trang hay lặp lại giao diện, tùy chọn cột in linh hoạt.
- **⚡ Điều Hướng Modal Trái / Phải (Modal Fast Navigation)**: Lướt nhanh qua các chữ Kanji trong danh sách bằng phím mũi tên `←` / `→` trên bàn phím hoặc nút điều hướng nổi mà không phải đóng modal rồi cuộn trang.
- **🌳 Mô hình Tra cứu 4 Tầng Bộ Thủ & Cấu Phần**: Phân tích cấu trúc đệ quy KanjiVG kết hợp 214 Bộ thủ Khang Hi và từ điển 11,000+ chữ Hán-Việt với độ chính xác tuyệt đối.
- **🎯 Chế độ Luyện viết kiểm tra nét (Stroke Verification Engine)**: So khớp vector hình học, nhận diện vẽ ngược chiều và chấm điểm độ chính xác theo thời gian thực (0 - 100%).

---

### 🌐 English

### 📢 Release: Luyện Kanji v3.0.0 (Interleaved Hepburn Romaji Engine, Japanese IME, Snipping OCR & Google Docs Exporter)

Version **v3.0.0** introduces major enhancements to the **Luyện Kanji** ecosystem:
- **🔤 Interleaved Hepburn Romaji Transliteration Engine**: Automatically converts full Japanese text (containing Kanji, Hiragana, Katakana) into Hepburn Romaji with word spacing, long vowel macrons (`ō`, `ū`), and contextual particle pronunciations (`は` → `wa`, `を` → `o`, `へ` → `e`). Displays side-by-side line pairs `[JP]` & `[ROMAJI]` for easy reading, equipped with font size controls (`A-`/`A+`, 12px - 18px) in the input toolbar and General Settings.
- **⌨️ Built-in Japanese IME Engine (Romaji → Hiragana → Kanji)**: Type Latin Romaji, press `Space` or `Tab` to open the standard Japanese IME candidate popover with Kanji, Furigana, Sino-Vietnamese readings, and meanings. Supports keys `1`-`9`, `Enter`, `↑`/`↓`, available in both main textarea and quick search bars.
- **📸 Screen Snipping OCR (`Ctrl + Shift + K`)**: Capture and extract Kanji characters from YouTube videos, Anime, scanned Manga, images, or PDFs using global shortcut or extension popup.
- **📋 Google Docs Table Exporter**: Export and customize 1-column Kanji stroke order tables with selectable columns (Index, Kanji & Sino-Vietnamese, Readings & Meanings, Stroke Order Images). Copy the entire table with 1 click and paste (`Ctrl + V`) directly into Google Docs or Microsoft Word.
- **🖨️ Multi-Page A4 Print Engine with Column Options**: CSS paged media unroll engine that paginates all Kanji seamlessly across multiple A4 sheets without single-page truncation or duplicate fixed headers.
- **⚡ Modal Fast Navigation (Left/Right Keys)**: Instantly cycle through Kanji in the inspection/practice dialog using `←` / `→` arrow keys or floating buttons without closing and scrolling.
- **🌳 4-Tier Radical & Component Decomposition Engine**: Recursive KanjiVG DOM parsing combined with 214 Kangxi radicals and an 11,000+ Sino-Vietnamese offline dictionary.
- **🎯 Stroke Verification Engine**: Real-time geometric vector matching for handwriting practice with reverse-stroke detection and accuracy scoring (0 - 100%).

---

## ✨ Tổng quan tính năng / Feature Overview

| Tính năng (Feature) | Mô tả chi tiết (Description) |
| :--- | :--- |
| **🔍 Tách lọc Kanji** | Tự động trích xuất mọi chữ Kanji từ văn bản hỗn hợp Nhật - Việt - Anh. / Extract unique Kanji from text. |
| **🔤 Furigana & Hán-Việt** | Hiển thị chữ mềm Hiragana trên đầu và nhãn Hán-Việt dưới chân chữ (chuẩn `<ruby>`). |
| **📋 Xuất Google Docs** | Tạo bảng 1 cột chứa ảnh nét vẽ với tùy chọn cột linh hoạt, dán trực tiếp vào Google Docs/Word. |
| **🎯 Luyện viết chấm điểm** | Kiểm tra thứ tự và hướng vẽ từng nét, chấm điểm độ chính xác % và cảnh báo vẽ ngược chiều. |
| **⌨️ Gõ Romaji sang Kana** | Tự động chuyển trực tiếp chữ Latinh thành Hiragana/Katakana khi gõ vào ô nhập liệu. |
| **🧩 Extension Trình duyệt** | Bôi đen đọc báo tra cứu tức thì, chụp khoanh vùng màn hình OCR với phím tắt `Ctrl + Shift + K`. |
| **🌳 Bóc tách Bộ thủ 4 Tầng** | Sơ đồ cây phân giải các thành phần bộ thủ của 6,000+ Kanji kèm câu chuyện mẹo nhớ. |
| **🖨️ Phiếu in tập viết A4** | Bảng in chuẩn giấy A4 dạng kẻ ô chữ điền Genkouyoushi có nét đứt `+` chống cắt trang. |
| **📋 Xuất thẻ Anki & CSV** | Tải ảnh nét vẽ PNG 600×600px nền trắng có lưới và xuất file CSV nhập trực tiếp vào Anki. |

---

## 🛠️ Công nghệ cốt lõi / Core Technologies

- **Frontend:** React 19, TypeScript 5.8, Vite 8
- **UI Design:** Tailwind CSS v4, Lucide React Icons
- **Graphics & Animation:** SVG Vector Paths, HTML5 Canvas API, `requestAnimationFrame` (60fps)
- **Algorithms:** Vector Cosine Similarity Stroke Matching, Hepburn/Kunrei Romaji Parser
- **OCR Engine:** Tesseract.js (Client-side WebAssembly OCR)
- **Speech Synthesis:** Web Speech Synthesis API (`ja-JP`)
- **Backend & AI:** Node.js Express Server, `@google/genai` (Gemini API)

---

## 🌐 Thư viện & Dữ liệu mở / Open Source Data & Libraries

- **[KanjiVG](https://github.com/KanjiVG/kanjivg)** (CC BY-SA 3.0): Stroke order vector data for 6,000+ Kanji.
- **[kanjiapi.dev](https://kanjiapi.dev/)**: REST API for Onyomi, Kunyomi, JLPT, stroke counts.
- **[Google Translate & Gemini AI](https://ai.google.dev/)**: Translation and contextual AI features.
- **[Tesseract.js](https://tesseract.projectnaptha.com/)**: Client-side OCR engine.

---

## 🚀 Hướng dẫn Cài đặt / Installation Guide

### 1. Khởi chạy ứng dụng Web (Run Web App)
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

### 2. Cài đặt Tiện ích Chrome / Edge Extension (Install Extension)
1. Mở trình duyệt Chrome / Edge, truy cập: `chrome://extensions` (hoặc `edge://extensions`).
2. Bật công tắc **Developer mode** ở góc trên bên phải.
3. Nhấp vào nút **Load unpacked** và chọn thư mục `src/extension` trong dự án.
4. Tiện ích **Luyện Kanji v3.0** đã sẵn sàng sử dụng!

---

## 📚 Giấy phép / License

- Mã nguồn toàn bộ ứng dụng được phát hành theo giấy phép **[MIT License](https://opensource.org/licenses/MIT)**.
- Dữ liệu thứ tự nét vẽ Kanji thuộc bản quyền dự án **KanjiVG** (Ulrich Apel và cộng sự) theo giấy phép **CC BY-SA 3.0**.
