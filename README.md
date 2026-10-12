# 🌸 Kanji Stroke Order & Dictionary Tool (漢字書き順・辞書ツール)

Một ứng dụng web hiện đại, tinh tế giúp tra cứu chi tiết Kanji, tự động giải mã thứ tự nét vẽ (Stroke Order), phát hoạt ảnh nét động (Stroke Animation), luyện viết chữ Hán và tra cứu nghĩa tiếng Việt, âm Hán-Việt, On/Kun, JLPT và từ vựng ví dụ.

Được tối ưu hoá đặc biệt cho người học tiếng Nhật, giáo viên và người soạn thẻ Anki, flashcard, tài liệu giảng dạy.

---

## ✨ Tính năng nổi bật

### 1. 🔍 Trích xuất & Lọc Kanji thông minh
- Tự động nhận diện và trích xuất mọi chữ Kanji từ văn bản hỗn hợp (Nhật - Việt - Anh).
- Tự động loại bỏ chữ trùng lặp mà vẫn giữ nguyên thứ tự xuất hiện ban đầu.
- Hỗ trợ các bộ mẫu nhanh theo cấp độ JLPT (N5, N4, N3) và mẫu cụm từ thông dụng.

### 2. 📖 Tra cứu từ điển Kanji toàn diện (Tiếng Việt)
- **Âm Hán-Việt:** Hiển thị rõ ràng, chuẩn xác (ví dụ: 日 - NHẬT, 月 - NGUYỆT, 水 - THỦY...).
- **Nghĩa tiếng Việt:** Giải nghĩa súc tích, dễ hiểu theo ngữ cảnh.
- **Âm On / Âm Kun:** Trình bày bằng Katakana và Hiragana với màu sắc phân biệt trực quan.
- **Cấp độ JLPT:** Phân loại từ N5 đến N1 kèm mã màu nhã nhặn, hài hòa.
- **Từ vựng ví dụ phong phú:** Mỗi chữ đi kèm các từ ghép thực tế, phiên âm Furigana và nghĩa tiếng Việt tương ứng.
- **Phát âm tiếng Nhật chuẩn:** Tích hợp Web Speech API cho phép nghe phát âm trực tiếp từng chữ.

### 3. ✍️ Hoạt ảnh thứ tự nét vẽ (Stroke Animation)
- Mô phỏng quá trình viết chữ từng nét tự nhiên với dữ liệu vector vector chuẩn xác.
- **Trình điều khiển hoạt ảnh linh hoạt:**
  - Phát / Tạm dừng / Phát lại (Replay).
  - Tua tiến / lùi từng nét riêng biệt (`Step back` / `Step forward`).
  - Thanh trượt điều chỉnh tốc độ hoạt ảnh mượt mà từ 0.5x đến 2.5x.
  - Bật/tắt số thứ tự nét vẽ (Stroke Numbers).
  - Bật/tắt lưới hướng dẫn chữ điền (Lưới chữ Điền / Ô chia tâm).
  - Bộ chọn bảng màu nét vẽ trực quan (Đen truyền thống, Xanh ngọc bích, Chàm thư pháp, Đỏ chu sa...).

### 4. 🖌️ Chế độ Luyện viết tương tác (Canvas Practice)
- Modal tương tác chuyên sâu với 3 tab:
  - **Hoạt ảnh nét vẽ:** Xem chi tiết từng nét chuyển động.
  - **Bảng luyện viết tay:** Vẽ trực tiếp bằng chuột, bút cảm ứng hoặc ngón tay trên màn hình cảm ứng, có tính năng ẩn/hiện chữ mờ để tập đồ nét, đổi màu cọ và xoá bảng.
  - **Ý nghĩa & Ví dụ:** Đọc sâu về ngữ nghĩa và các từ vựng mở rộng.

### 5. 📋 Sao chép ảnh nét vẽ vào Clipboard chỉ với 1 cú click (Có hỗ trợ Lưới ô)
- Render ảnh nét vẽ từ vector SVG sang định dạng **PNG độ nét cao có nền trắng tinh khiết**.
- **Kèm lưới ô chữ điền:** Khi bật chế độ `Kèm lưới (+ Grid)`, ảnh xuất ra sẽ được tự động vẽ kèm lưới nét đứt chuẩn thư pháp màu nhã nhặn `#e2e8f0` chia 4 phần.
- Ghi trực tiếp vào bộ nhớ tạm (Clipboard), sẵn sàng dán ngay (`Ctrl + V` / `Cmd + V`) vào:
  - **Anki** (để tạo thẻ flashcard cực nhanh)
  - **Notion**, **GoodNotes**, **OneNote**
  - **Microsoft Word**, **Google Docs** hoặc slide bài giảng.
- Giao diện nút bấm tinh gọn, hiển thị thông báo toast xác nhận trực quan.

### 6. 🕒 Lịch sử tra cứu Kanji (Recently Viewed Kanji)
- Tự động ghi nhớ các chữ Kanji đơn lẻ mà người dùng đã bấm xem chi tiết hoặc mở modal hoạt ảnh nét vẽ.
- Lưu trữ bền vững trong `localStorage` (tối đa 15 chữ gần nhất, tự động khử trùng lặp, chữ mới xem luôn đẩy lên đầu).
- Dải chip chữ Hán trực quan hiển thị ngay trên danh sách: click vào chữ bất kỳ để mở lại ngay hoạt ảnh và từ điển.
- Nút biểu tượng thùng rác giúp dọn dẹp và xóa nhanh toàn bộ lịch sử khi cần.

### 7. 🎨 Giao diện hiện đại & Thẩm mỹ cao (UI/UX)
- Thiết kế theo phong cách tối giản, hiện đại với dải màu **Emerald / Teal** dịu mắt, thư thái khi học tập lâu dài.
- Đồng bộ hiển thị lưới ô nét đứt (`+ Grid`) xuyên suốt: từ **Dạng Bảng (Table)**, **Dạng Thẻ (Grid)**, cho đến **Modal Hoạt ảnh** và **Bảng vẽ tay**.
- Hai chế độ hiển thị linh hoạt: **Dạng bảng chi tiết (Table)** và **Dạng lưới thẻ (Grid cards)**.
- Tương thích hoàn hảo trên cả máy tính để bàn, máy tính bảng và điện thoại di động.

---

## 🛠️ Công nghệ sử dụng

- **Frontend Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite 8](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Animation:** Motion / CSS Transitions
- **Audio:** Web Speech Synthesis API (Native Browser Engine)

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### Yêu cầu hệ thống
- [Node.js](https://nodejs.org/) (phiên bản 18+ hoặc 20+)
- Quản lý gói: `npm`, `pnpm`, hoặc `yarn`

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

## 📚 Nguồn dữ liệu & Bản quyền (Attribution & Licenses)

Dự án tuân thủ nghiêm ngặt và trân trọng ghi nhận các nguồn tài nguyên mở:

1. **Dữ liệu nét vẽ Kanji (Stroke Order Data):**
   - Được cung cấp bởi dự án [KanjiVG](https://github.com/KanjiVG/kanjivg) (bản quyền Ulrich Apel và cộng sự).
   - Phân phối theo giấy phép [Creative Commons Attribution-Share Alike 3.0 (CC BY-SA 3.0)](https://creativecommons.org/licenses/by-sa/3.0/).
2. **Dữ liệu từ điển & Hán-Việt:**
   - Dựa trên dữ liệu từ điển mã nguồn mở tiếng Nhật - tiếng Việt và dự án từ điển EDICT/KanjiDic.
3. **Mã nguồn ứng dụng:**
   - Phát hành theo giấy phép [MIT License](https://opensource.org/license/mit). Tự do sử dụng, chỉnh sửa và tích hợp vào mục đích học tập cũng như thương mại.