# ⛩️ Luyện Kanji (luyenkanji.vercel.app)
### Nền tảng tra cứu thứ tự nét viết, bộ thủ Khang Hy & Luyện tập chữ Hán Nhật Bản
*(漢字書き順・部首・練習・日越辞書ツール)*

[![Version](https://img.shields.io/badge/version-v2.0.0-teal.svg)](https://luyenkanji.vercel.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![KanjiVG](https://img.shields.io/badge/Data-KanjiVG%20(CC%20BY--SA%203.0)-orange.svg)](https://github.com/KanjiVG/kanjivg)

---

## 📢 Bản phát hành lớn: Luyện Kanji v2.0.0 (Grand Major Release)

### 🚀 **Luyện Kanji v2.0.0 — Hệ sinh thái Luyện viết chữ Hán, Tiện ích Trình duyệt & Bộ gõ Kana toàn diện**
*Ngày phát hành: Tháng 10/2026*

Bản phát hành **v2.0.0** đánh dấu bước chuyển mình lớn của **Luyện Kanji**, từ một công cụ web tra cứu đơn lẻ trở thành một **hệ sinh thái học tập toàn diện**: mở rộng sang tiện ích trình duyệt Chrome/Edge độc lập, bổ sung công nghệ so khớp kiểm tra nét vẽ trực tiếp và hỗ trợ bộ gõ Romaji sang Kana mượt mà.

---

### 🌟 Các tính năng đột phá trong phiên bản v2.0.0

#### 1. 🧩 Ra mắt Luyện Kanji Extension cho Chrome & Microsoft Edge
- **Tra cứu ngữ cảnh tức thì**: Khi đang đọc báo tiếng Nhật (NHK Easy, Asahi, Yahoo News...), chỉ cần bôi đen cụm từ hoặc câu tiếng Nhật bất kỳ, nút tra cứu thông minh sẽ lập tức xuất hiện.
- **Cửa sổ di chuyển tự do (Draggable Window)**: Người dùng có thể kéo thả thanh tiêu đề để di chuyển modal đến bất kỳ góc nào trên màn hình, không còn lo bị che khuất dòng chữ hay hình ảnh bài viết.
- **Công nghệ cô lập Shadow DOM**: Tách biệt hoàn toàn mã CSS/HTML của extension khỏi website gốc, triệt tiêu 100% nguy cơ vỡ layout hay lỗi font chữ.
- **Tích hợp liền mạch với Web qua URL Parameter (`?text=...`)**: Nút *"Mở trên luyenkanji.vercel.app"* hỗ trợ đẩy toàn bộ đoạn văn bản bôi đen sang trang web chính để phân tích chuyên sâu và dịch cả câu bằng AI.

#### 2. 🎯 Chế độ Luyện viết kiểm tra nét & Thứ tự chữ Kanji (Stroke Verification Engine)
- **So khớp vector hình học (`strokeMatcher`)**: So sánh trực tiếp nét vẽ tay của người dùng với đường cong vector gốc của KanjiVG qua 32 điểm lấy mẫu phân bố đều.
- **Tự động nhận diện nét vẽ ngược chiều (Reverse Detection)**: Sử dụng độ tương đồng vector (Cosine Similarity) để lập tức phát hiện và cảnh báo khi người dùng vẽ ngược quy tắc thư pháp (từ dưới lên trên hoặc từ phải sang trái).
- **Chấm điểm độ chính xác theo thời gian thực (0 - 100%)**:
  - Đánh giá tổng hòa độ lệch quỹ đạo (55%), hướng vector (25%) và độ chuẩn xác của điểm đầu/cuối (20%).
  - Đạt từ 55% trở lên sẽ được xác nhận hoàn thành và tự động chuyển sang nét kế tiếp.
- **Chỉ dẫn điểm bắt đầu phát sáng**: Chấm tròn xanh lá (`animate-ping`) hiển thị chính xác vị trí đặt bút kèm số thứ tự và đường nét đứt định hướng nét vẽ.
- **Thẻ tổng kết & Xếp loại**: Đánh giá điểm trung bình toàn bộ nét, trao cúp thành tích (Xuất sắc A+, Giỏi A, Đạt) kèm nút luyện lại nhanh.

#### 3. ⌨️ Bộ gõ Romaji chuyển trực tiếp sang Kana trong ô nhập (Live Kana IME)
- **Tùy chọn chuyển đổi nhanh**: `[⌨️ Gõ Romaji: Tắt | あ Hiragana | ア Katakana]`.
- **Gõ đến đâu đổi đến đó**: Tự động chuyển đổi các ký tự Romaji vừa gõ thành chữ Kana tương ứng ngay trong ô nhập liệu (ví dụ: gõ `nihon` ra `にほん`, `kohi` ra `コーヒ`, `watashi` ra `わたし`).
- **Hỗ trợ đầy đủ biến âm & âm ngắt**: Âm đục (`ga`, `za`, `da`), âm bán đục (`pa`), âm ghép (`kya`, `shu`, `cho`), âm ngắt sokuon (gõ lặp phụ âm `tt`, `kk`, `ss` ra `っ`) và `nn` thành `ん`.
- **Chuyển đổi hàng loạt cho văn bản dán**: Tự động phát hiện khi văn bản có chứa chữ cái Latinh và hiển thị 2 nút chuyển đổi toàn bộ thành Hiragana hoặc Katakana chỉ với 1 cú click.

#### 4. 🌳 Bóc tách 100% Cấu trúc Bộ thủ & Mẹo nhớ Mnemonic
- **Giải mã đệ quy từ KanjiVG SVG XML**: Bóc tách chi tiết 100% tất cả các bộ phận cấu thành của hơn 6.000 chữ Kanji, bao gồm cả các chữ Hán phức tạp nhiều nét.
- **Gán nhãn Hán học chuẩn mực**: Phân loại rõ vị trí bộ thủ (*Hen - Bên trái*, *Tsukuri - Bên phải*, *Kanmuri - Phía trên*, *Ashi - Phía dưới*, *Kamae - Bao quanh*...).
- **Mẹo nhớ thông minh (Mnemonics)**: Ghép nối ý nghĩa các bộ thủ thành câu chuyện liên tưởng ghi nhớ sâu sắc; cho phép người dùng tự chỉnh sửa và lưu lại theo ý muốn.
- **Bảng 214 Bộ thủ Khang Hy**: Khám phá danh mục 214 bộ thủ kinh điển theo số nét (1-17 nét).

#### 5. 🎨 Bảng màu nét vẽ Mazii & Chế độ vẽ lặp lại liên tục
- **Màu nét trực quan phong cách Mazii**: 10 màu sắc rực rỡ riêng biệt tương ứng với từng nét viết, giúp ghi nhớ thứ tự nét dễ dàng hơn bao giờ hết.
- **Tùy chọn màu đơn đồng nhất**: Dành cho người thích phong cách tối giản truyền thống (Đỏ chu sa, Xanh ngọc, Đen mực tàu...).
- **Vẽ nét liên tục (Auto-loop mode)**: Tự động chạy tuần tự các nét, dừng nghỉ ngắn cho người xem quan sát tổng thể rồi tự động lặp lại từ nét 1.

---

## ✨ Tổng quan tính năng của Luyện Kanji

| Tính năng | Mô tả chi tiết |
| :--- | :--- |
| **🔍 Tách lọc Kanji** | Tự động trích xuất mọi chữ Kanji từ văn bản hỗn hợp Nhật - Việt - Anh, loại bỏ trùng lặp và giữ nguyên thứ tự. |
| **🔤 Furigana & Nghĩa chữ** | Hiển thị chữ mềm Hiragana trên đầu và nhãn Hán-Việt/nghĩa tiếng Việt dưới chân chữ (chuẩn `<ruby>`). |
| **🌐 Dịch cả câu & Audio** | Dịch trọn vẹn đoạn văn sang tiếng Việt bằng Google Dịch (siêu tốc 150ms) hoặc Gemini AI kèm phát âm chuẩn bản xứ. |
| **🎯 Luyện viết chấm điểm** | Kiểm tra thứ tự và hướng vẽ từng nét, chấm điểm độ chính xác % và cảnh báo vẽ ngược chiều. |
| **⌨️ Gõ Romaji sang Kana** | Tự động chuyển trực tiếp chữ Latinh thành Hiragana/Katakana khi gõ vào ô nhập liệu. |
| **🧩 Extension Trình duyệt** | Bôi đen đọc báo tra cứu tức thì, cửa sổ kéo thả tự do, Shadow DOM cách ly và truyền văn bản qua `?text=...`. |
| **🌳 Bóc tách Bộ thủ 100%** | Sơ đồ cây phân giải các thành phần bộ thủ của 6.000+ Kanji kèm câu chuyện mẹo nhớ tự chỉnh sửa. |
| **🖨️ Phiếu in tập viết A4** | Bảng in chuẩn giấy A4 dạng kẻ ô chữ điền Genkouyoushi có nét đứt `+` chống cắt trang. |
| **📋 Xuất thẻ Anki & Ảnh** | Tải ảnh nét vẽ PNG 600×600px nền trắng có lưới và xuất file CSV nhập trực tiếp vào Anki. |
| **📷 Quét ảnh OCR** | Tesseract.js WebAssembly nhận diện chữ Kanji từ tệp ảnh hoặc ảnh dán từ clipboard (`Ctrl + V`). |

---

## 🛠️ Công nghệ cốt lõi

- **Frontend:** React 19, TypeScript 5.8, Vite 8
- **Thiết kế UI:** Tailwind CSS v4, Lucide React Icons
- **Đồ họa & Animation:** SVG Vector Paths, HTML5 Canvas API, `requestAnimationFrame` (60fps)
- **Thuật toán xử lý:** Vector Cosine Similarity Stroke Matching, Hepburn/Kunrei Romaji Parser
- **Nhận diện ký tự:** Tesseract.js (Client-side WebAssembly OCR)
- **Xử lý giọng nói:** Web Speech Synthesis API (`ja-JP`)
- **Backend & AI:** Node.js Express Server, `@google/genai` (Gemini API)

---

## 🌐 Thư viện & Nguồn dữ liệu mở

| Dịch vụ / Thư viện | Loại | Mục đích | Bản quyền / Giấy phép |
| :--- | :--- | :--- | :--- |
| **[KanjiVG](https://github.com/KanjiVG/kanjivg)** | Vector SVG Data | Thứ tự nét vẽ vector cho 6.000+ chữ Kanji | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) (Ulrich Apel) |
| **[kanjiapi.dev](https://kanjiapi.dev/)** | REST API | Tra cứu Onyomi, Kunyomi, JLPT, số nét | Miễn phí / Open Source |
| **[Google Translate](https://translate.google.com/)** | Dịch thuật | Dịch câu Nhật - Việt siêu tốc 150ms | Google Service |
| **[Gemini AI](https://ai.google.dev/)** | LLM API | Dịch hiểu sâu sắc văn hóa và ngữ cảnh | Google AI Studio |
| **[Tesseract.js](https://tesseract.projectnaptha.com/)** | OCR Engine | Quét ảnh trích xuất ký tự chữ Hán | Apache-2.0 |
| **[Web Speech API](https://www.w3.org/TR/speech-api/)** | Browser API | Tổng hợp giọng đọc tiếng Nhật chuẩn | Tiêu chuẩn web W3C |

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### 1. Khởi chạy ứng dụng Web
```bash
# Clone repository
git clone https://github.com/your-username/luyen-kanji.git
cd luyen-kanji

# Cài đặt thư viện dependencies
npm install

# Khởi động server phát triển (Port 3000)
npm run dev

# Đóng gói sản phẩm (Production Build)
npm run build
```

### 2. Cài đặt Tiện ích Chrome / Edge Extension
1. Mở trình duyệt Chrome hoặc Microsoft Edge, truy cập: `chrome://extensions` (hoặc `edge://extensions`).
2. Bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên.
3. Nhấp vào nút **Load unpacked** (Tải tiện ích đã giải nén).
4. Chọn thư mục `src/extension` trong mã nguồn dự án.
5. Tiện ích **Luyện Kanji** đã sẵn sàng sử dụng trên bất kỳ trang web nào!

---

## 📚 Giấy phép (License)

- Mã nguồn toàn bộ ứng dụng được phát hành theo giấy phép **[MIT License](https://opensource.org/licenses/MIT)**.
- Dữ liệu thứ tự nét vẽ Kanji thuộc bản quyền dự án **KanjiVG** (Ulrich Apel và cộng sự) theo giấy phép **CC BY-SA 3.0**.
