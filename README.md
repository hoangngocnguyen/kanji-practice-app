# ⛩️ Luyện Kanji Pro – Nền Tảng Luyện Viết Kanji & Sửa Lỗi Từng Nét

### *(Chấm Điểm & Sửa Lỗi Từng Nét · Phân Tích Bộ Thủ · Flashcard SRS & Anki · Đấu Trường & Streak Bạn Bè · 2.136 Jōyō Kanji N5–N1)*

[![Trang chủ](https://img.shields.io/badge/App-Luy%E1%BB%87n%20Kanji%20Pro-0f766e.svg)](https://luyenkanji.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![React Router](https://img.shields.io/badge/React_Router-v7-ca4245.svg)](https://reactrouter.com)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_&_Realtime-3ecf8e.svg)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![KanjiVG](https://img.shields.io/badge/Data-KanjiVG%20(CC%20BY--SA%203.0)-orange.svg)](https://github.com/KanjiVG/kanjivg)

---

## 📖 Giới Thiệu Dự Án

**Luyện Kanji Pro** là nền tảng luyện viết chữ Hán (Kanji) chuyên sâu dành cho người Việt, đặt trọng tâm vào **thực hành viết tay chuẩn thứ tự nét với cơ chế chấm điểm và chỉ ra lỗi sai trực tiếp theo từng nét**. Ứng dụng kết hợp kho vector nét chuẩn **KanjiVG**, thuật toán chấm nét hình học 2 chiều, Flashcard lặp lại ngắt quãng (SRS) toàn màn hình, hệ thống **Streak Bạn Bè + Băng Streak**, thông báo đa nền tảng **Web Push PWA**, đấu trường Kanji trực tuyến và dữ liệu **2.136 Jōyō Kanji** đã được chuẩn hóa nghĩa Nhật – Việt hiện đại.

*(Read the English documentation at [README_en.md](./README_en.md))*

---

## 🌟 Các Tính Năng Nổi Bật

### 1. Luyện Viết Kanji & Chấm Điểm Sửa Lỗi Từng Nét (`/kanji`)
- **3 chế độ luyện viết trực quan**: Tập tô theo bóng mờ chuẩn, **Viết mù** từ trí nhớ và **Viết tự do** nhiều màu mực để rèn tay.
- **Thuật toán chấm điểm & sửa lỗi hình học 2 chiều**: Đối chiếu từng nét viết tay với chuẩn KanjiVG theo khoảng cách *Chamfer*, hướng tiếp tuyến đường cong, tỷ lệ độ dài và dung sai nét ngắn qua 3 cấp độ (*Dễ, Chuẩn, Khắt khe*) — phát hiện ngay nét viết sai hướng, lệch vị trí hoặc sai thứ tự để người học sửa ngay trên ô viết.
- **Trải nghiệm tập viết linh hoạt**: Khung lọc & thanh công cụ tự thu gọn khi cuộn, hoạt ảnh thứ tự từng nét, xuất ảnh PNG/Google Docs và in phiếu tập viết khổ A4 (`/print`).

### 2. Flashcard SRS Toàn Màn Hình & Đồng Bộ Anki (`/decks`, `/decks/:folderId`)
- **Tổ chức thư mục kiểu Google Drive**: Cây thư mục nhiều tầng, nhập hàng loạt chữ Kanji và từ ghép, ôn gộp thẻ đến hạn SRS và kho luyện riêng chữ hay viết sai (*Mistake Bank*).
- **4 chế độ ôn tập chủ động**: `Lật thẻ` (giao diện toàn màn hình 40% Kanji cố định – 60% chi tiết cuộn độc lập), `Viết mù` (kiểm tra viết nét trực tiếp trên Flashcard), `Nghe` và `Điền câu`.
- **Chuẩn Anki & Theo dõi 365 ngày**: Tùy chỉnh mốc thời gian *Khó / Tốt / Dễ*, nhập/xuất gói thẻ AnkiDroid (`.apkg`) và biểu đồ nhiệt học tập **Heatmap 365 ngày** tích hợp hiển thị ngày được bảo vệ bằng Băng Streak.

### 3. Streak Bạn Bè, Băng Streak & Bảng Xếp Hạng (`/leaderboard`, `/invite/streak/:code`)
- **Streak Bạn Bè (tối đa 6 kết nối)**: Mời trực tiếp người học trong app hoặc chia sẻ **link mời nhanh** để cùng duy trì chuỗi ngày học chung (tính chuẩn theo múi giờ Việt Nam `Asia/Ho_Chi_Minh`), hỗ trợ nhắc bạn học mỗi ngày.
- **Băng Streak (tối đa 2 Băng · khởi đầu tặng 1 Băng)**:
  - **Tự động cứu chuỗi**: Tự tiêu tốn 1 Băng để đóng băng ngày lỡ học (hiển thị ô màu xanh băng trên thanh 30 ngày & Heatmap 365 ngày).
  - **Cứu chuỗi cho bạn bè**: Dùng 1 Băng của mình để cứu bạn học đang nguy cơ đứt chuỗi và gửi thông báo tức thì tới bạn đó.
  - **Hồi Băng tự động**: Hồi **+1 Băng Streak** sau mỗi **10 ngày học liên tục** tiếp theo.

### 4. Hệ Thống Thông Báo Đa Nền Tảng & Web Push PWA
- **Chuông Thông Báo & Menu Avatar**:
  - **Desktop Header**: Biểu tượng chuông cạnh Avatar với badge đếm chưa đọc, lọc *Tất cả / Chưa đọc*, đánh dấu đã đọc, xóa và điều hướng thẳng tới liên kết khi bấm.
  - **Mobile & Desktop Avatar Menu**: Tích hợp 2 tab *Tài khoản | Thông báo* đồng bộ theo thời gian thực qua **Supabase Realtime (`postgres_changes`)**.
- **Popup & Web Push chạy ngầm**: Banner thông báo tức thì khi vào trang hoặc có tương tác mới (thả tim, theo dõi, lời mời/cứu Streak), kèm **Web Push (VAPID)** qua Service Worker tùy chỉnh (`src/sw.ts`) giúp nhận thông báo trên điện thoại/máy tính ngay cả khi đóng trình duyệt, cùng **Vercel Cron** nhắc học lúc `20:00` (giờ Việt Nam).

### 5. Đấu Trường Kanji Trực Tuyến (`/arena`)
- **Thi đấu 1v1 & Phòng nhóm**: Tạo phòng đấu hoặc tham gia nhanh với bạn bè chỉ bằng mã mời 6 ký tự.
- **Kho bộ đề tùy chỉnh**: Tạo, sửa và xóa bộ đề từ bộ thẻ cá nhân hoặc cấp độ JLPT với cơ chế chống lộ đáp án phía máy chủ, chấm điểm nhanh và bảng xếp hạng trực tiếp.

### 6. Kho 2.136 Jōyō Kanji Chuẩn Nhật (KANJIDIC2) & Tra Cứu Vẽ Tay (`/levels`, `/search`, `/radicals`, `/compare`)
- **Chuẩn hóa nghĩa Nhật – Việt hiện đại**: Toàn bộ **2.136 Jōyō Kanji** và tệp từ ghép được rà soát đối chiếu **KANJIDIC2**, ưu tiên nghĩa tiếng Nhật hiện đại và loại bỏ các nghĩa Hán cổ / giản thể gây hiểu nhầm (như `予` ưu tiên *dự báo / trước*, `机` là *cái bàn*).
- **Quiz 4 dạng & Trò chơi bổ trợ**: Luyện viết kết hợp Quiz chống lộ đáp án, Ghép bộ thủ, Nối từ ghép và thẻ gợi nhớ *Mnemonic*.
- **Tra cứu đa chiều 3.000+ Kanji**: Tìm theo âm Hán-Việt, nghĩa Việt, On/Kun, số nét, **214 bộ thủ Khang Hy**, bảng so sánh Kanji dễ nhầm lẫn (`/compare`) hoặc **vẽ tay trực tiếp** để nhận diện chữ chưa biết cách đọc.

### 7. Tài Khoản Google Thông Minh & Bộ Công Cụ Tiếng Nhật
- **Hồ sơ Google OAuth (`/profile`, `/u/:userId`, `/shares`)**: Tự động lấy ảnh đại diện và `full_name` từ Google (làm sạch tên cho các tài khoản cũ từng lưu phần đầu Gmail), **luôn ưu tiên tên hiển thị người dùng tự chỉnh sửa** không bị ghi đè lại, đồng bộ hai chiều với PostgreSQL RLS và hoạt động mượt mà offline qua `localStorage`.
- **Công cụ tiếng Nhật & PWA**: Bộ gõ IME + quét ảnh OCR (`Tesseract.js`) tại `/input`, đọc song song `/romaji`, dịch AI tại `/translate`, chuyển đổi `/converter`, in phiếu `/print`, tiện ích Chrome (`/extension`), `/history` & `/guide`, cùng **PWA Offline** lưu đệm KanjiVG SVG.

---

## 🛠️ Công Nghệ Cốt Lõi

- **Frontend**: React 19, TypeScript 5.8, Vite 8, Tailwind CSS v4, Lucide Icons, Motion
- **Routing & SEO**: React Router DOM v7 (`RouteMetaManager` động từng trang, OpenGraph/Twitter Cards, Schema.org `WebSite` / `WebApplication` / `FAQPage`, `sitemap.xml`)
- **Backend & Cron**: Node.js + Express 5 (`server.ts`) & Vercel Serverless Functions (`/api/*`, Vercel Cron daily reminder)
- **Database, Auth & Realtime**: Offline-first `localStorage` + Supabase Auth (Google OAuth & Email) + PostgreSQL RLS + RPC + Realtime `postgres_changes`
- **Push & Offline PWA**: `vite-plugin-pwa` (`injectManifest` + `src/sw.ts` Workbox), `web-push` (VAPID)
- **Đồ họa, OCR & AI**: KanjiVG SVG Vector Paths, HTML5 Canvas, Tesseract.js WebAssembly OCR, JSZip (`.apkg`), Google `@google/genai` SDK, Web Speech API (`ja-JP`)

---

## 🚀 Hướng Dẫn Cài Đặt & Triển Khai

### 1. Cài đặt & Chạy Local
```bash
# Clone repository
git clone https://github.com/your-username/luyen-kanji.git
cd luyen-kanji

# Cài đặt thư viện
npm install

# Tạo tệp cấu hình môi trường từ mẫu
cp .env.example .env

# Chạy máy chủ phát triển (Port 3000)
npm run dev

# Kiểm tra TypeScript & Build bản production
npm run lint
npm run build
```

### 2. Biến Môi Trường (`.env.example`)
- **AI Dịch & Gợi ý**: `GEMINI_API_KEY`
- **Supabase Frontend & Backend**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- **Web Push PWA & Cron (VAPID)**: Tạo khóa bằng `npx web-push generate-vapid-keys`, sau đó điền `VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` và `CRON_SECRET`.
*(Khi chưa cấu hình biến đám mây, các tính năng luyện viết, chấm lỗi, tra cứu và Flashcard SRS vẫn hoạt động ngoại tuyến hoàn toàn qua `localStorage`).*

### 3. Khởi Tạo Cơ Sở Dữ Liệu Supabase
Chạy các tệp SQL trong thư mục `/docs` theo thứ tự trong **Supabase SQL Editor**:
1. `docs/supabase_decks_schema.sql` — Hồ sơ người dùng, thư mục & bộ thẻ Flashcard SRS
2. `docs/supabase_community_migration.sql` — Bộ thẻ cộng đồng, lượt thích & theo dõi
3. `docs/supabase_mistakes_heatmap_migration.sql` — Mistake Bank & đồng bộ dữ liệu ôn tập
4. `docs/supabase_study_streak_migration.sql` — Bảng Streak cá nhân & lịch sử ngày học
5. `docs/supabase_arena_migration.sql` — Phòng đấu trường Kanji 1v1 & nhóm
6. `docs/supabase_google_profile_fix_migration.sql` — Chuẩn hóa `full_name` & ảnh đại diện Google
7. `docs/supabase_friend_streak_notifications_migration.sql` — Streak Bạn Bè (tối đa 6 kết nối, RPC nguyên tử), Băng Streak, bảng `notifications` (Realtime) & `push_subscriptions`

---

## 📚 Bản Quyền & Nguồn Dữ Liệu

- **MIT License**: Mã nguồn ứng dụng.
- **KanjiVG**: Dữ liệu nét vẽ chữ Hán theo giấy phép CC BY-SA 3.0.
- **KANJIDIC2 / EDRDG & Tatoeba Corpus**: Chuẩn hóa nghĩa tiếng Nhật hiện đại và câu ví dụ song ngữ (CC BY-SA / CC BY 2.0 FR).
