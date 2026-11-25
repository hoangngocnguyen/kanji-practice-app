# ⛩️ Luyện Kanji Pro – Nền Tảng Học Kanji & Luyện Nét Viết Tiếng Nhật

### *(Học 2.136 Jōyō Kanji JLPT N5–N1 · Luyện Nét Viết SVG · Flashcard SRS 4 Chế Độ & Đồng Bộ Anki · Đấu Trường Kanji Trực Tuyến · Tra Cứu Vẽ Tay & OCR)*

[![Trang chủ](https://img.shields.io/badge/App-Luy%E1%BB%87n%20Kanji%20Pro-0f766e.svg)](https://luyenkanji.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![React Router](https://img.shields.io/badge/React_Router-v7-ca4245.svg)](https://reactrouter.com)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![KanjiVG](https://img.shields.io/badge/Data-KanjiVG%20(CC%20BY--SA%203.0)-orange.svg)](https://github.com/KanjiVG/kanjivg)

---

## 📖 Giới Thiệu Dự Án

**Luyện Kanji Pro** là nền tảng web toàn diện giúp người Việt học chữ Hán (Kanji) và từ vựng tiếng Nhật một cách bài bản, trực quan và có tính tương tác cao. Ứng dụng kết hợp lộ trình 2.136 chữ Jōyō chuẩn JLPT N5–N1, hệ thống chấm điểm nét viết thông minh, Flashcard lặp lại ngắt quãng (SRS) toàn màn hình, đấu trường Kanji trực tuyến theo thời gian thực và kho công cụ tra cứu hoạt động mượt mà ngay cả khi ngoại tuyến (PWA).

*(Read the English documentation at [README_en.md](./README_en.md))*

---

## 🌟 Các Tính Năng Nổi Bật

### 1. Luyện Nét Viết Thông Minh & Chấm Điểm Hình Học (`/kanji`)
- **3 chế độ luyện viết**: Theo bóng mờ chuẩn, Viết mù từ trí nhớ và Viết tự do nhiều màu mực.
- **Chấm điểm hình học 2 chiều**: Đánh giá khoảng cách Chamfer, hướng tiếp tuyến đường cong, tỷ lệ độ dài và dung sai nét ngắn với 3 mức độ (*Dễ, Chuẩn, Khắt khe*).
- **Trải nghiệm mượt mà**: Khung lọc & công cụ tự thu gọn thành nút tròn nổi ở góc trên phải khi cuộn trang, thanh chọn nhanh loại/mở chữ, xuất ảnh PNG/Google Docs và in phiếu tập viết khổ A4.

### 2. Lộ Trình JLPT N5–N1, Quiz 4 Dạng & Trò Chơi Tương Tác (`/levels`)
- **Trọn bộ 2.136 Jōyō Kanji**: Phân chia rõ theo cấp độ JLPT N5 → N1 kèm âm Hán-Việt, On/Kun, nghĩa tiếng Việt, số nét và câu ví dụ Nhật–Việt nạp sẵn tức thì.
- **Quiz ôn tập 4 dạng chống lộ đáp án**: Nhận diện Kanji, chọn nghĩa, chọn âm đọc (khóa nghe đến khi chọn xong) và điền khuyết câu ngữ cảnh.
- **Luyện tập bổ trợ**: Trò chơi Ghép bộ thủ, Nối từ ghép, thẻ gợi nhớ hình ảnh (*Mnemonic*) và luyện phân biệt các cặp chữ Kanji dễ nhầm lẫn.

### 3. Flashcard SRS Toàn Màn Hình & Đồng Bộ Anki (`/decks`, `/decks/:folderId`)
- **Tổ chức thư mục kiểu Google Drive**: Tạo cây thư mục nhiều tầng, nhập hàng loạt chữ Kanji và từ ghép, ôn gộp theo hạn SRS hoặc ôn lại chữ hay sai (*Mistake Bank*).
- **4 chế độ ôn tập chủ động**: `Lật thẻ` (giao diện toàn màn hình chia cột 40% Kanji cố định căn giữa dọc – 60% chi tiết cuộn độc lập), `Viết mù`, `Nghe` và `Điền câu`.
- **Chuẩn Anki & Theo dõi tiến độ**: Tùy chỉnh mốc thời gian *Khó / Tốt / Dễ*, nhập/xuất gói thẻ AnkiDroid (`.apkg`), biểu đồ nhiệt học tập 365 ngày và trung tâm nhắc ôn hàng ngày.

### 4. Đấu Trường Kanji Trực Tuyến (`/arena`)
- **Thi đấu 1v1 & Phòng nhóm**: Tạo phòng đấu hoặc tham gia nhanh với bạn bè chỉ bằng mã mời 6 ký tự và tên hiển thị.
- **Kho bộ đề tùy chỉnh**: Tự tạo, chỉnh sửa và xóa bộ đề câu hỏi từ bộ thẻ cá nhân hoặc theo cấp độ JLPT với cơ chế chống lộ đáp án phía máy chủ.
- **Phản hồi tức thì**: Chấm điểm nhanh không độ trễ trên giao diện, đồng bộ tiến độ phòng đấu và bảng xếp hạng trực tiếp.

### 5. Tra Cứu Kanji Ngược & Nhận Diện Vẽ Tay (`/search`, `/radicals`, `/compare`)
- **Tìm kiếm đa chiều trên 3.000+ Kanji**: Lọc theo âm Hán-Việt, nghĩa tiếng Việt, âm On/Kun, số nét hoặc mã bộ thủ.
- **Bảng vẽ nhận diện chữ Hán**: Vẽ nét trực tiếp bằng chuột hoặc cảm ứng để tìm chữ Kanji khi không biết cách đọc.
- **214 Bộ thủ & So sánh chữ**: Cây bóc tách cấu trúc Kanji theo bộ thủ Khang Hy và màn hình đối chiếu các chữ dễ nhầm lẫn.

### 6. Tài Khoản Google, Cộng Đồng & Bảng Xếp Hạng (`/shares`, `/leaderboard`, `/profile`)
- **Đăng nhập Google & Đồng bộ Cloud**: Đăng nhập qua popup Google (Supabase Auth) tự đồng bộ tên hiển thị và ảnh đại diện, đồng bộ hai chiều với cơ sở dữ liệu PostgreSQL RLS và giữ chế độ dùng ngoại tuyến qua `localStorage`.
- **Cộng đồng chia sẻ bộ thẻ**: Xuất bản bộ thẻ công khai, thả tim, theo dõi tác giả, xem hồ sơ công khai (`/u/:userId`) và nhân bản bộ thẻ về kho cá nhân.
- **Streak học tập**: Theo dõi chuỗi ngày học liên tục ngay trên thanh tiêu đề và cạnh tranh trên bảng xếp hạng.

### 7. Kho Công Cụ Tiếng Nhật & PWA (`/routes`)
- `/input`: Nhập văn bản tiếng Nhật, bộ gõ IME chuyển Romaji → Kanji và quét chữ từ ảnh OCR (`Tesseract.js`).
- `/romaji`: Hiển thị văn bản tiếng Nhật song song phiên âm Romaji chuẩn Hepburn.
- `/translate`: Dịch câu song ngữ Nhật – Việt qua Google GTX và Gemini AI.
- `/converter`: Chuyển đổi qua lại Romaji ⇄ Hiragana ⇄ Katakana có hoàn tác nhiều bước.
- `/print`: Tạo và in phiếu luyện viết Kanji khổ A4 tùy chỉnh số cột.
- `/extension`: Tiện ích mở rộng Chrome (`Ctrl+Shift+K`) tra cứu nhanh trên mọi trang web.
- `/history` & `/guide`: Lịch sử tra cứu ngoại tuyến và cẩm nang hướng dẫn sử dụng.
- **Hỗ trợ PWA**: Cài đặt trực tiếp lên máy tính và điện thoại, lưu bộ đệm SVG nét vẽ để học mượt mà khi mất mạng.

---

## 🛠️ Công Nghệ Cốt Lõi

- **Frontend**: React 19, TypeScript 5.8, Vite 8, Tailwind CSS v4, Lucide Icons, Motion
- **Routing**: React Router DOM v7 (quản lý SEO động theo từng đường dẫn)
- **Backend & API**: Node.js + Express 5 (`server.ts`) cho các tuyến Đấu trường, Dịch thuật AI, Đồng bộ Anki và Auth Callback
- **Xác thực & Lưu trữ**: Offline-first `localStorage` kết hợp Supabase Auth (Google OAuth & Email) + PostgreSQL RLS
- **Đồ họa, OCR & Dữ liệu**: KanjiVG SVG Vector Paths, HTML5 Canvas, Tesseract.js WebAssembly OCR, JSZip (`.apkg`), Google `@google/genai` SDK
- **PWA & Âm thanh**: Vite PWA (Workbox Runtime Caching) & Web Speech Synthesis API (`ja-JP`)

---

## 🚀 Hướng Dẫn Cài Đặt & Phát Triển

```bash
# Clone repository
git clone https://github.com/your-username/luyen-kanji.git
cd luyen-kanji

# Cài đặt thư viện
npm install

# Chạy máy chủ phát triển (Port 3000)
npm run dev

# Kiểm tra kiểu TypeScript & Build bản production
npm run lint
npm run build
```

> **Biến môi trường cấu hình (`.env`)**:
> - `GEMINI_API_KEY`: Kích hoạt dịch song ngữ và gợi ý thông minh phía máy chủ.
> - `VITE_SUPABASE_URL` & `VITE_SUPABASE_PUBLISHABLE_KEY`: Kết nối Supabase Auth (bao gồm Google OAuth) và đồng bộ dữ liệu đám mây.
> *(Khi chưa cấu hình Supabase, các tính năng học tập và tra cứu cốt lõi vẫn chạy hoàn toàn ngoại tuyến với `localStorage`).*

---

## 📚 Bản Quyền & Nguồn Dữ Liệu

- **MIT License**: Mã nguồn ứng dụng.
- **KanjiVG**: Dữ liệu nét vẽ chữ Hán theo giấy phép CC BY-SA 3.0.
- **Tatoeba Corpus**: Dữ liệu câu ví dụ song ngữ (CC BY 2.0 FR).
