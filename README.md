# ⛩️ Luyện Kanji - Nền Tảng Học Tiếng Nhật & Luyện Nét Viết Kanji (v3.3.0)
### *(Học Kanji JLPT N5–N1, 2.136 Jōyō Kanji, Bộ Thẻ Flashcard SRS, Ghép Bộ Thủ & Nối Từ, Streak & Bảng Xếp Hạng, Tra Cứu OCR, Romaji & Dịch Thuật)*

[![Version](https://img.shields.io/badge/version-v3.3.0-teal.svg)](https://luyenkanji.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![React Router](https://img.shields.io/badge/React_Router-v7-ca4245.svg)](https://reactrouter.com)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![KanjiVG](https://img.shields.io/badge/Data-KanjiVG%20(CC%20BY--SA%203.0)-orange.svg)](https://github.com/KanjiVG/kanjivg)

---

## 📖 Giới Thiệu Dự Án

**Luyện Kanji** là nền tảng học tiếng Nhật và Kanji toàn diện, hiện đại, tối ưu cho người Việt. Phiên bản **v3.3.0** tích hợp lộ trình học JLPT N5–N1 chuẩn xác, hệ thống luyện nét viết thông minh với phản hồi trực tiếp, trò chơi tương tác (Ghép bộ thủ & Nối từ ghép), chuỗi Streak học tập liên tục cùng bảng xếp hạng, ôn tập SRS Flashcard và mạng cộng đồng chia sẻ bộ thẻ.

*(Xem bản tiếng Anh tại [README_en.md](./README_en.md))*

---

## 🌟 Các Tính Năng Nổi Bật & Tương Tác

### 1. Luyện Nét Viết & Chấm Điểm Thông Minh (`/kanji`)
- **3 Chế độ luyện viết**: Có mẫu mờ (bóng mờ chuẩn), Viết mù (từ trí nhớ) và Viết tự do (phóng tác với 7 màu mực).
- **Chấm điểm hình học 2 chiều**: Kết hợp khoảng cách Chamfer gần nhất, hướng tiếp tuyến đường cong, kiểm tra tỷ lệ độ dài và dung sai nét ngắn.
- **Tùy chỉnh độ khó**: 3 mức độ (Dễ, Chuẩn, Khắt khe).
- **Trải nghiệm mượt mà**: Chuyển nét vector `0ms` ngay khi đạt, tự xóa nhanh nét sai sau ~280ms để viết lại ngay lập tức, hỗ trợ hoàn tác nét trước và gợi ý 1 nét.

### 2. Trò Chơi & Luyện Tương Tác (`/levels` & Drills)
- **Ghép Bộ Thủ**: Chọn các bộ thủ thành phần để ghép lại thành chữ Kanji chính xác.
- **Nối Từ Ghép**: Luyện phản xạ ghép nghĩa từ vựng theo ngữ cảnh thực tế.

### 3. Streak Học Tập & Bảng Xếp Hạng (`/leaderboard` & Header)
- **Biểu tượng lửa Streak trên Header**: Theo dõi số ngày học liên tục, menu thả xuống nhanh kèm lối tắt mở bảng xếp hạng.
- **Trang Bảng xếp hạng riêng biệt**: Cập nhật thành tích học tập và sự kiên trì của cộng đồng.

### 4. Kanji Theo Cấp Độ & Quiz 0ms (`/levels`)
- **JLPT N5–N1 & 2.136 Jōyō Kanji**: Dữ liệu chuẩn phân theo cấp N5 tới N1 và trọn bộ Jōyō kèm âm Hán-Việt, On/Kun, nghĩa và số nét.
- **Câu ví dụ Tatoeba 0ms**: Kho câu ví dụ Nhật–Việt nạp tĩnh sẵn (`/data/kanji_sentences_static.json`), hiển thị tức thì không chờ API.
- **Quiz 4 dạng tương tác**: Nhận diện Kanji, Nghĩa, Âm On/Kun và Điền khuyết câu ví dụ với phím tắt (`1–4`, `Enter`).

### 5. Flashcard SRS & Cộng Đồng Chia Sẻ Bộ Thẻ (`/decks`, `/shares`)
- **Thư mục kiểu Google Drive**: Quản lý thư mục cha–con nhiều tầng, nhập hàng loạt nhanh chóng và ôn tập tập trung (*Again, Good, Easy*).
- **Cộng đồng & Optimistic UI**: Thả tim và Follow phản hồi ngay lập tức, xem danh sách người thích/theo dõi qua modal, tải bộ thẻ công khai.
- **Đồng bộ Cloud**: Lưu trữ offline `localStorage` kết hợp Supabase Auth & PostgreSQL RLS.

### 6. Kho Công Cụ Tra Cứu Toàn Diện (`/routes`)
- `/input`: Nhập văn bản tiếng Nhật, bộ gõ IME & quét ảnh OCR (Tesseract.js).
- `/compare`: Đối chiếu các chữ Hán gần giống nhau về nét vẽ và cấu trúc.
- `/romaji`: Đọc bài song song `[JP]` & `[ROMAJI]` chuẩn Hepburn.
- `/translate`: Dịch câu song ngữ Nhật – Việt qua Google GTX & Gemini AI.
- `/converter`: Chuyển đổi Romaji ⇄ Kana với Undo/Redo nhiều bước.
- `/radicals`: 214 Bộ thủ Khang Hy & cây bóc tách cấu trúc chữ Hán.
- `/extension`: Hỗ trợ Chrome Extension v3.0 (`Ctrl+Shift+K`).
- `/print`: In phiếu tập viết A4 tùy chỉnh cột và xuất PDF.
- `/history`: Lịch sử tra cứu ngoại tuyến không giới hạn.
- `/guide`: Cẩm nang hướng dẫn chi tiết.

---

## 🛠️ Công Nghệ Cốt Lõi

- **Frontend**: React 19, TypeScript 5.8, Vite 8, Tailwind CSS v4, Lucide Icons
- **Routing**: React Router DOM v7 (Hỗ trợ F5 bền vững)
- **State & Storage**: React Context API + Offline-first `localStorage` + Supabase Cloud Sync
- **Graphics & OCR**: KanjiVG SVG Vector Paths, HTML5 Canvas API, Tesseract.js WebAssembly OCR
- **Speech**: Web Speech Synthesis API (`ja-JP`)

---

## 🚀 Hướng Dẫn Cài Đặt Nhanh

```bash
# Clone repository
git clone https://github.com/your-username/luyen-kanji.git
cd luyen-kanji

# Cài đặt thư viện
npm install

# Chạy máy chủ phát triển (Port 3000)
npm run dev

# Build bản production
npm run build
```

> **Lưu ý cấu hình (`.env`)**:
> - `GEMINI_API_KEY`: Dùng cho dịch song ngữ AI.
> - `VITE_SUPABASE_URL` & `VITE_SUPABASE_PUBLISHABLE_KEY`: Dùng cho đồng bộ Cloud.
> *(Khi chưa cấu hình, ứng dụng chạy hoàn toàn 100% Offline-first với `localStorage`).*

---

## 📚 Bản Quyền & Nguồn Dữ Liệu

- **MIT License**: Mã nguồn toàn bộ ứng dụng.
- **KanjiVG**: Dữ liệu nét vẽ chữ Hán theo giấy phép CC BY-SA 3.0.
- **Tatoeba Corpus**: Dữ liệu câu ví dụ (CC BY 2.0 FR).
