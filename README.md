# ⛩️ Luyện Kanji - Japanese Kanji Learning & Stroke Order Platform (v3.1.0)
### *(Học Chữ Hán, Tra Cứu Nét Viết, Bộ Thủ, Romaji & Dịch Thuật Nhật - Việt)*

[![Version](https://img.shields.io/badge/version-v3.1.0-teal.svg)](https://luyenkanji.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![React Router](https://img.shields.io/badge/React_Router-v7-ca4245.svg)](https://reactrouter.com)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![KanjiVG](https://img.shields.io/badge/Data-KanjiVG%20(CC%20BY--SA%203.0)-orange.svg)](https://github.com/KanjiVG/kanjivg)

---

## 🇻🇳 Tiếng Việt (Vietnamese)

### 📢 Bản phát hành mới: Luyện Kanji v3.1.0 (Phân tách Bộ thủ Đa cấp Đa tầng)

Bản cập nhật **v3.1.0** nâng cấp thuật toán bóc tách bộ thủ KanjiVG lên mức độ chuyên sâu: hiển thị cấu trúc phân tầng (Cấp 1, 2, 3), hỗ trợ nút bấm toggle mở rộng/thu gọn các nhánh thành phần con trực quan, và gắn huy hiệu ★ Bộ thủ chính chuẩn xác cho 214 Bộ thủ Khang Hy. Cải thiện giao diện so sánh Kanji đồng bộ chiều cao ngang hàng.

Bản cập nhật **v3.1.0** tái cấu trúc toàn diện kiến trúc ứng dụng sang hệ thống **React Router DOM đa trang chuẩn mực**, loại bỏ hoàn toàn các thành phần lặp lại và mang lại trải nghiệm mượt mà, tối giản:

- **🌐 Định tuyến React Router Đa trang Chuẩn mực (F5 Không mất trang)**:
  - `/` hoặc `/input`: **Nhập văn bản** - Giao diện nhập liệu tinh gọn, bo góc mềm mại, tích hợp bộ gõ Kanji IME và bộ chuyển đổi cỡ chữ.
  - `/kanji`: **Nét viết Kanji** - Bảng tra nét vẽ, hoạt ảnh SVG động, thanh chọn nhanh Kanji Quick Bar 1-chạm, chế độ lưới kẻ ô mễ và modal luyện viết tay.
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

---

## 🌐 English

### 📢 Release: Luyện Kanji v3.1.0 (Multi-level Radical Decomposition)

Version **v3.1.0** upgrades the KanjiVG radical decomposition algorithm to provide deep, multi-level structural insights: it displays hierarchical component structures (Levels 1, 2, & 3), introduces toggle buttons for interactive expansion/collapse of sub-component branches, and accurately marks ★ Primary Radicals for all 214 Kangxi radicals. It also refines the Kanji comparison interface with standardized, row-aligned card heights.

Version **v3.1.0** introduces a complete architectural overhaul to **React Router DOM SPA**:
- **🌐 React Router Deep-linking (F5 Persistent Navigation)**:
  - `/` / `/input`: Minimalist, focused Japanese text input area with IME support.
  - `/kanji`: Dedicated stroke order list, SVG animation, practice modal, and horizontal Quick Bar.
  - `/romaji`: Dedicated Hepburn Romaji transliteration reading view with side-by-side line pairs.
  - `/translate`: Focused Japanese-Vietnamese translation powered by Google Translate & Gemini AI.
  - `/converter`: Dedicated Romaji ⇄ Kana converter featuring a dual-panel layout and full multi-step Undo/Redo history stack.
  - `/radicals`: 214 Kangxi Radicals explorer.
  - `/history`: Unlimited local storage caching with full offline Kanji details and reusable stroke tables/grids.
  - `/guide`: Dedicated full-page user guide.
- **✨ UI Decluttering & Header Breadcrumbs**:
  - Header displays current page context instead of repeating the application brand.
  - Removed redundant sample presets, cluttering banners, and noisy toasts on routine actions.

---

## 🛠️ Công nghệ cốt lõi / Core Technologies

- **Frontend Framework:** React 19, TypeScript 5.8, Vite 8
- **Routing:** React Router DOM v7 (HTML5 History API with full deep-linking & F5 persistence)
- **UI & Styling:** Tailwind CSS v4, Lucide React Icons
- **State Management:** React Context API (`KanjiContext`) with persistent LocalStorage caching
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

---

## 📚 Giấy phép / License

- Mã nguồn toàn bộ ứng dụng được phát hành theo giấy phép **[MIT License](https://opensource.org/licenses/MIT)**.
- Dữ liệu thứ tự nét vẽ Kanji thuộc bản quyền dự án **KanjiVG** (Ulrich Apel và cộng sự) theo giấy phép **CC BY-SA 3.0**.
