# 08. Cơ Chế Bộ Gõ IME Tiếng Nhật: Romaji → Hiragana → Kanji (Japanese IME Engine)

Tài liệu này giải thích kiến trúc kỹ thuật, thuật toán và luồng xử lý sự kiện của bộ gõ tiếng Nhật tích hợp sẵn (**Web-based Japanese IME**) trong ứng dụng **Luyện Kanji**, cho phép người dùng chuyển đổi trực tiếp từ phiên âm Latinh (Romaji) sang Hiragana/Katakana và gợi ý chữ Hán (Kanji) chuẩn IME Nhật Bản.

---

## 1. Mục Tiêu & Thách Thức

### 1.1. Thách thức thông thường
- Khi học tiếng Nhật trên máy tính hoặc điện thoại, người dùng thường phải cài đặt thêm bộ gõ của hệ điều hành (như Google Japanese Input, Microsoft IME, Mozc hoặc bàn phím tiếng Nhật iOS/Android).
- Quá trình chuyển đổi bàn phím qua lại giữa tiếng Việt/tiếng Anh và tiếng Nhật gây bất tiện khi chỉ cần tra cứu nhanh vài từ Kanji hoặc lọc danh sách.

### 1.2. Giải pháp của Luyện Kanji
- Xây dựng bộ gõ IME chạy 100% trên nền tảng Web:
  1. Gõ Romaji tự động chuyển tức thì sang Hiragana (hoặc Katakana).
  2. Bấm phím **Space** hoặc **Tab** mở popup gợi ý chữ Hán chuẩn Nhật ngay tại vị trí con trỏ soạn thảo.
  3. Cung cấp đầy đủ thông tin hỗ trợ người Việt: **Chữ Kanji**, **Furigana**, **Âm Hán-Việt** và **Ý nghĩa tiếng Việt tóm tắt**.
  4. Hỗ trợ phím tắt số **1 - 9**, phím mũi tên `↑` / `↓`, `Enter` để chọn và `Esc` để hủy.

---

## 2. Kiến Trúc Dữ Liệu Lai (Hybrid Inverted Index + Context API)

Để đảm bảo tốc độ phản hồi 0ms ngay khi bấm phím Space đồng thời hỗ trợ tra cứu các từ ghép phức tạp, hệ thống sử dụng kiến trúc lai 2 tầng:

```
                  [Ký tự Hiragana đang gõ]
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
    [Tầng 1: Offline Inverted Index]  [Tầng 2: Context Transliterate API]
    - Quét KANJI_DICTIONARY           - Google Input Tools Transliterate
    - Ánh xạ On/Kun/Examples          - Hỗ trợ từ ghép ngữ cảnh sâu
    - Phản hồi tức thì 0ms            - Bộ đệm in-memory LRU Cache
              │                             │
              └──────────────┬──────────────┘
                             ▼
              [Bộ Hợp Nhất & Khử Trùng Lặp]
              - Gắn âm Hán-Việt & nghĩa Việt
              - Thêm tùy chọn Hiragana & Katakana gốc
              - Trả về danh sách Top 10 ứng viên
```

### 2.1. Tầng 1: Chỉ mục ngược Offline (Inverted Index)
Hệ thống tiền xử lý và lập chỉ mục ngược từ dữ liệu `KANJI_DICTIONARY`:
- **Âm Kun-yomi**: Phân tách phần tiền tố và hậu tố okurigana (ví dụ: `た.べる` → từ `食べる`, âm đọc `たべる`; `うた.う` → từ `歌う`, âm đọc `うたう`).
- **Âm On-yomi**: Chuyển Katakana sang Hiragana (ví dụ: `ショク` → `しょく` ánh xạ đến `食`).
- **Ví dụ từ ghép có sẵn**: Ánh xạ `にほん` → `日本` (NHẬT BẢN), `かしゅ` → `歌手` (CA THỦ), `ちゅうしん` → `中心` (TRUNG TÂM).

### 2.2. Tầng 2: API Chuyển đổi Ngữ cảnh (Context API)
- Sử dụng endpoint:
  ```
  https://inputtools.google.com/request?text={hiragana}&itc=ja-t-i0-und&num=10
  ```
- Kết quả từ API được giải mã, tự động phân tích từng ký tự chữ Hán qua `SINO_VIETNAMESE_MAP` để gắn âm Hán-Việt tương ứng (ví dụ: `東京` → `ĐÔNG KINH`).
- Kết quả được lưu vào `apiCache` trong bộ nhớ để không gọi mạng lại nếu người dùng gõ lại cùng một âm.

---

## 3. Quản Lý Vùng Đệm Soạn Thảo (Active Composition Tracker)

Hàm `getActiveKanaComposition(text, caretPos)` trong `src/utils/kanjiImeEngine.ts` chịu trách nhiệm xác định từ Hiragana đang được gõ tại con trỏ:

```typescript
export function getActiveKanaComposition(
  text: string,
  caretPos: number
): { word: string; start: number; end: number } | null {
  if (!text || caretPos <= 0) return null;

  let start = caretPos;
  // Quét ngược về trước chừng nào còn là ký tự Kana
  while (start > 0 && isKanaChar(text[start - 1])) {
    start--;
  }

  let end = caretPos;
  // Quét tiếp về sau chừng nào còn là ký tự Kana
  while (end < text.length && isKanaChar(text[end])) {
    end++;
  }

  if (start === end) return null;
  return { word: text.slice(start, end), start, end };
}
```

---

## 4. Bảng Phím Tắt Điều Khiển Chuẩn IME

| Phím Tắt | Khi Popover Đang Mở | Khi Popover Đang Đóng |
| :--- | :--- | :--- |
| **`Space`** hoặc **`Tab`** | Chuyển sang ứng viên kế tiếp (`selectedIndex + 1`) | Kích hoạt mở bảng gợi ý Kanji cho từ đang gõ |
| **`ArrowDown (↓)`** | Chuyển xuống ứng viên bên dưới | Di chuyển con trỏ văn bản bình thường |
| **`ArrowUp (↑)`** | Chuyển lên ứng viên bên trên | Di chuyển con trỏ văn bản bình thường |
| **`Số 1 - 9`** | Chọn ngay lập tức ứng viên số tương ứng | Gõ số bình thường |
| **`Enter`** | Chèn ứng viên đang được chọn vào văn bản | Xuống dòng (textarea) / Thực hiện tìm kiếm |
| **`Esc`** | Đóng popup, giữ nguyên chuỗi Hiragana gốc | - |
| **`Shift + Space`** | Chèn ký tự dấu cách trắng bình thường | Chèn ký tự dấu cách trắng bình thường |

---

## 5. Tích Hợp Đa Vị Trí Trong Ứng Dụng

Tính năng IME được đóng gói thành custom hook `useJapaneseIme.ts` và component `ImeCandidatePopover.tsx`, phục vụ đồng bộ cho 3 khu vực:
1. **Khung Nhập Văn Bản Chính (`InputSection.tsx`)**: Hỗ trợ gõ bài văn, đoạn hội thoại hoặc từ vựng dài với nút gạt `漢 Kanji IME`.
2. **Thanh Lọc Tìm Kiếm Nhanh (`App.tsx`)**: Có nút toggle `IME` nhỏ gọn, cho phép gõ `sakura` + `Space` để lọc ngay các chữ `桜`.
3. **Ô Thêm Kanji Nhanh (`App.tsx`)**: Thêm trực tiếp chữ Hán vào danh sách thực hành ngay từ thanh công cụ.
