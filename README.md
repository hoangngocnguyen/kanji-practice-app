# 🌸 Kanji Stroke Order & Dictionary Tool (漢字書き順・辞書ツール)

Một ứng dụng web hiện đại, tinh tế giúp tra cứu chi tiết Kanji, tự động giải mã thứ tự nét vẽ (Stroke Order), phát hoạt ảnh nét động (Stroke Animation), luyện viết chữ Hán, phiên âm Hiragana (Furigana), dịch nghĩa từng chữ và dịch toàn bộ câu tiếng Nhật sang tiếng Việt.

Được tối ưu hoá đặc biệt cho người học tiếng Nhật, giáo viên và người soạn thẻ Anki, flashcard, tài liệu giảng dạy, hỗ trợ in ấn phiếu tập viết A4 chuẩn mực.

---

## ✨ Tính năng nổi bật

### 1. 🔍 Trích xuất & Lọc Kanji thông minh
- Tự động nhận diện và trích xuất mọi chữ Kanji từ văn bản hỗn hợp (Nhật - Việt - Anh).
- Tự động loại bỏ chữ trùng lặp mà vẫn giữ nguyên thứ tự xuất hiện ban đầu.
- Hỗ trợ các bộ mẫu nhanh: Danh ngôn, Thành ngữ 4 chữ Yojijukugo, JLPT N3/N2, Từ vựng cao cấp N1.
- **Thanh công cụ ghim (Sticky Toolbar):** Luôn cố định khi cuộn trang, cho phép tra cứu, tìm kiếm và thêm chữ liên tục mà không cần kéo lên xuống.

### 2. 🔤 Phiên âm Hiragana (Furigana) & Dịch nghĩa Tiếng Việt từng chữ
- **Chuẩn HTML5 `<ruby>` & `<rt>`:** Hiển thị chữ Hiragana nhỏ nhắn, căn giữa trang nhã ngay trên đầu chữ Kanji.
- **Dịch nghĩa tiếng Việt bên dưới:** Hiển thị nhãn nghĩa tiếng Việt thông dụng và âm Hán-Việt ngay dưới chân chữ.
- **Tùy chọn Bật/Tắt độc lập:** Người dùng có thể linh hoạt bật/tắt hiển thị Hiragana trên đầu hoặc nghĩa tiếng Việt bên dưới tùy nhu cầu học tập.
- **Thẻ xem trước trực tiếp tại ô tìm kiếm:** Khi gõ hoặc tìm chữ Kanji, hệ thống hiển thị ngay phiên âm Hiragana và nghĩa tiếng Việt tương ứng.

### 3. 🌐 Dịch toàn bộ câu / đoạn văn (Tiếng Nhật ➔ Tiếng Việt)
- Tính năng **"Dịch cả câu"** sử dụng dịch vụ MyMemory API hỗ trợ chuyển ngữ trọn vẹn đoạn văn sang tiếng Việt mượt mà, chuẩn ngữ cảnh.
- Tích hợp một chạm: **Nghe phát âm toàn bộ câu tiếng Nhật**, **Sao chép bản dịch** và **Dịch lại**.
- Bộ nhớ đệm kép (Memory & localStorage) giúp dịch tức thì các mẫu câu quen thuộc mà không tốn dung lượng mạng.

### 4. 📷 Quét ảnh trích xuất chữ Kanji (OCR Client-side)
- Tích hợp công nghệ nhận diện ký tự quang học **Tesseract.js** chạy 100% trên trình duyệt (WebAssembly).
- Hỗ trợ tải tệp ảnh từ máy, kéo thả ảnh hoặc **dán trực tiếp ảnh chụp màn hình (`Ctrl + V`)**.
- Tự động lọc các ký tự Kanji từ hình ảnh và áp dụng trực tiếp vào ô nhập liệu hoặc thanh tìm kiếm.

### 5. ✍️ Hoạt ảnh thứ tự nét vẽ (Stroke Animation)
- Mô phỏng quá trình viết chữ từng nét tự nhiên với dữ liệu vector chuẩn xác từ KanjiVG.
- **Vẽ liên tục (Auto-loop mode):** Tự động vẽ từ nét đầu đến nét cuối, dừng nghỉ ngắn để người dùng ngắm chữ hoàn chỉnh, sau đó tự động lặp lại từ nét 1.
- Trình điều khiển hoạt ảnh linh hoạt: Phát / Tạm dừng / Phát lại / Tua từng nét / Thay đổi tốc độ phát (0.5x - 2.0x) / Bật tắt số nét và lưới ô.
- Phát âm tiếng Nhật chuẩn bản xứ cho từng chữ Kanji qua Web Speech API.

### 6. 🌳 Phân tích Bộ thủ Đa thành phần & Mẹo nhớ Kanji (Radical Breakdown & Mnemonics)
- **Sơ đồ cây bóc tách bộ thủ (Multi-Component Radical Tree):** Bóc tách chính xác 100% tất cả các bộ thủ cấu thành của 6.000+ Kanji (như 能, 語, 働, 警, 躍, 鬱, 愛, 議, 新, 親...) với nhãn vị trí Hán học (*Hen - Bên trái*, *Tsukuri - Bên phải*, *Kanmuri - Phía trên*, *Ashi - Phía dưới*, *Kamae - Bao quanh*...).
- **Tự động bóc tách từ KanjiVG SVG XML:** Tự động tải và phân tích cây thẻ XML SVG để trích xuất 100% các cấu phần nhỏ bên trong bất kỳ chữ Hán nào.
- **Mẹo nhớ thông minh (Mnemonic Stories):** Tự động ghép nối ý nghĩa từ các bộ thủ cấu thành thành câu chuyện ghi nhớ sâu sắc, hỗ trợ người dùng tự chỉnh sửa và lưu trữ riêng trên thiết bị (`localStorage`).
- **Tra cứu 214 Bộ thủ Khang Hy (214 Kangxi Radical Explorer):** Bảng tổng hợp 214 bộ thủ Khang Hy lọc theo số nét (1-17 nét) và tìm kiếm họ Kanji liên quan.

### 7. 🖨️ Bảng in A4 chuyên nghiệp (Kanji Practice Worksheet)
- Tối ưu hóa chuyên dụng cho in ấn (`@media print`) hoặc lưu file PDF:
  - Tự động ẩn toàn bộ giao diện web thừa (thanh công cụ, ô nhập liệu dài dòng, nút bấm).
  - Trình trình bày dạng bảng in chuẩn A4 không bao giờ bị cắt rách chữ giữa 2 trang (`page-break-inside: avoid`).
  - Bao gồm: STT, Kanji to rõ nét + Hiragana + Hán-Việt + JLPT, sơ đồ nét vẽ, âm On/Kun và **4 ô kẻ chữ điền (Genkouyoushi)** có nét đứt chữ thập `+` để người học tự tay cầm bút luyện viết chữ đẹp.

### 8. 📋 Xuất dữ liệu & Tạo thẻ Anki
- **Chép ảnh nét vẽ có nền trắng và lưới ô:** Chuyển đổi SVG sang PNG độ phân giải 600×600px sắc nét với 1 cú click để dán vào Anki, Notion, Word, GoodNotes.
- **Xuất file CSV:** Định dạng chuẩn sẵn sàng nhập trực tiếp vào phần mềm Anki (gồm STT, Kanji, Hán-Việt, On, Kun, Nghĩa, JLPT, URL ảnh).

### 9. 🎨 Giao diện & Nút bấm trực quan
- Hệ thống màu sắc phân tách rõ rệt:
  - **Nút Bật/Tắt (Toggle):** Phân biệt rõ trạng thái **`✓ BẬT`** (nền xanh viền đậm) và **`○ TẮT`** (nền xám viền nhạt).
  - **Nút Hành động:** Phân biệt rõ giữa trạng thái sẵn sàng và trạng thái vô hiệu hóa (`disabled`).

---

## 🛠️ Công nghệ sử dụng

- **Frontend Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite 8](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Animation Engine:** SVG `strokeDashoffset` + `requestAnimationFrame` (60fps)
- **Audio:** Web Speech Synthesis API (Native Browser Speech Engine)

---

## 🌐 Các thư viện, API & Nguồn tài nguyên bên ngoài (External Dependencies & APIs)

Dự án sử dụng và tích hợp các tài nguyên, dịch vụ mở bên ngoài sau:

| Dịch vụ / Thư viện | Loại | Mục đích sử dụng | Giấy phép / Bản quyền |
| :--- | :--- | :--- | :--- |
| **[Google Translate (Google Dịch)](https://translate.google.com/)** | Dịch vụ Dịch thuật | Engine dịch thuật mặc định siêu tốc (~150ms), dịch câu giao tiếp Nhật - Việt tự nhiên, chuẩn nghĩa và không yêu cầu API key | Dịch vụ Google |
| **[Gemini AI (@google/genai)](https://ai.google.dev/)** | LLM API Serverless | Phân tích và dịch thuật ngữ cảnh văn hóa sâu sắc với mô hình `gemini-2.5-flash` qua endpoint `/api/translate` | Google AI Studio / Gemini API Terms |
| **[KanjiVG](https://github.com/KanjiVG/kanjivg)** | Dữ liệu Vector SVG | Cung cấp dữ liệu thứ tự từng nét vẽ vector XML/SVG cho hơn 6.000 chữ Kanji qua mạng phân phối jsDelivr CDN (`https://cdn.jsdelivr.net/gh/kanjivg/kanjivg/kanji/{hex}.svg`) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) (Bản quyền Ulrich Apel) |
| **[kanjiapi.dev](https://kanjiapi.dev/)** | REST API | Tra cứu thông tin chuyên sâu: âm Onyomi, Kunyomi, cấp độ JLPT, số nét cho từng chữ Hán | Miễn phí / Open Source |
| **[Tesseract.js](https://tesseract.projectnaptha.com/)** | Thư viện OCR WebAssembly | Nhận diện ký tự quang học chữ Kanji từ hình ảnh tải lên hoặc ảnh dán từ clipboard (`Ctrl+V`) chạy 100% Client-side trong trình duyệt | [Apache-2.0 License](https://github.com/naptha/tesseract.js/blob/master/LICENSE) |
| **[MyMemory Translation API](https://mymemory.translated.net/)** | Dịch vụ Dịch thuật REST API | Tầng dịch máy dự phòng khi ngoại tuyến hoặc mất kết nối | Dịch vụ dịch thuật cộng đồng mở (Translated) |
| **[Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)** | Web API chuẩn trình duyệt (W3C) | Tổng hợp giọng đọc tiếng Nhật bản xứ (`ja-JP`) để nghe phát âm chữ Kanji và cả câu | Tiêu chuẩn trình duyệt W3C |
| **[HTML5 Ruby Annotation](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ruby)** | Tiêu chuẩn HTML5 W3C | Căn chỉnh và hiển thị ngữ âm Hiragana (Furigana) nằm ngay trên đầu chữ Kanji | Tiêu chuẩn web W3C |
| **[Mazii Dictionary](https://mazii.net/)** | Liên kết tham chiếu từ điển | Cho phép mở rộng tra cứu ngữ cảnh chuyên sâu trên từ điển Mazii Việt - Nhật | Tham chiếu ngoài |

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### Yêu cầu hệ thống
- [Node.js](https://nodejs.org/) (phiên bản 18+ hoặc 20+)
- Trình quản lý gói: `npm`, `pnpm`, hoặc `yarn`

### Các bước thực hiện

1. **Clone repository:**
   ```bash
   git clone <URL_CUA_REPOSITORY>
   cd kanji-stroke-tool
   ```

2. **Cài đặt thư viện dependencies:**
   ```bash
   npm install
   # hoặc: pnpm install
   ```

3. **Khởi động server phát triển (Development):**
   ```bash
   npm run dev
   # hoặc: pnpm run dev
   ```

4. **Truy cập ứng dụng:**
   Mở trình duyệt tại: `http://localhost:3000` (hoặc cổng hiển thị trên terminal).

5. **Build cho môi trường Production:**
   ```bash
   npm run build
   ```

---

## 📚 Ghi nhận bản quyền & Giấy phép (Attribution & Licenses)

1. **Dữ liệu nét vẽ Kanji (Stroke Order Data):**
   - Được cung cấp bởi dự án [KanjiVG](https://github.com/KanjiVG/kanjivg) (bản quyền Ulrich Apel và cộng sự).
   - Phân phối theo giấy phép [Creative Commons Attribution-Share Alike 3.0 (CC BY-SA 3.0)](https://creativecommons.org/licenses/by-sa/3.0/).
2. **Dữ liệu từ điển & Hán-Việt:**
   - Dựa trên dữ liệu từ điển mã nguồn mở tiếng Nhật - tiếng Việt và dự án từ điển EDICT/KanjiDic.
3. **Mã nguồn ứng dụng:**
   - Phát hành theo giấy phép [MIT License](https://opensource.org/license/mit). Tự do sử dụng, chỉnh sửa và tích hợp vào mục đích học tập cũng như thương mại.