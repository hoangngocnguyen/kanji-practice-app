# Kế hoạch Triển khai Bộ gõ IME Nhật Bản: Romaji → Hiragana → Kanji

## User Review & Critical Decisions (Xác nhận từ người dùng)

Dựa trên phản hồi làm rõ từ bạn, hệ thống bộ gõ Kanji sẽ tuân thủ nghiêm ngặt 3 quyết định cốt lõi sau:
1. **Cơ chế kích hoạt chuyển đổi**: Phím `Space` (hoặc `Tab`) kích hoạt mở menu gợi ý Kanji chuẩn IME Nhật (khi đang ở chế độ gõ tiếng Nhật). Tiếp tục nhấn `Space`/`Tab` hoặc `↑`/`↓` để chọn ứng viên; nhấn phím số `1`-`9` hoặc `Enter` để chèn từ đã chọn; nhấn `Esc` để hủy bảng gợi ý và giữ nguyên Hiragana.
2. **Nguồn dữ liệu chuyển đổi**: Kiến trúc lai (Hybrid).
   - **Ưu tiên 1 (Offline, tức thì 0ms)**: Sử dụng Inverted Index (bảng chỉ mục ngược) ánh xạ Hiragana → Danh sách Kanji từ dữ liệu có sẵn (`KANJI_DICTIONARY`, `SINO_VIETNAMESE_MAP`, và `kanji_meanings_vi.json`), hiển thị ngay lập tức kèm chữ Hán, âm On/Kun, âm Hán-Việt và nghĩa tiếng Việt.
   - **Ưu tiên 2 (Context API / Compound words)**: Tự động bổ sung các từ ghép và ngữ cảnh thực tế (ví dụ: `にほん` → `日本`, `がくせい` → `学生`, `とうきょう` → `東京`) thông qua API chuyển đổi ngữ cảnh Google Input Tools Transliterate (với fallback offline thông minh khi không có mạng).
3. **Phạm vi áp dụng**: Tích hợp đồng bộ ở cả hai vị trí quan trọng nhất:
   - **Khung nhập văn bản chính (`InputSection.tsx`)**: Hỗ trợ gõ đoạn văn dài, bài tập đọc, flashcard, chuyển đổi trực tiếp ngay vị trí con trỏ (caret).
   - **Thanh tìm kiếm & Quick Input (`App.tsx`, `KanjiListHeader.tsx`)**: Cho phép người dùng gõ romaji (như `ai`, `taberu`, `gakusei`) rồi bấm `Space` để chọn ngay Kanji cần lọc mà không cần cài thêm bàn phím tiếng Nhật trên hệ điều hành.

---

## 1. Tổng quan & Mục tiêu

Hiện tại ứng dụng đã hỗ trợ chuyển đổi Romaji → Hiragana/Katakana thông qua tiện ích `romajiConverter.ts`. Tuy nhiên, người học và người dùng tiếng Nhật khi soạn thảo đều cần gõ Kanji trực tiếp (ví dụ: gõ `taberu` ra `たべる`, nhấn `Space` để đổi thành `食べる`, hoặc `nihon` ra `日本`).

Mục tiêu của tính năng này là mang đến trải nghiệm **Bộ gõ IME chuẩn Nhật ngay trên giao diện web** (Web-based Japanese IME):
- Không phụ thuộc vào việc hệ điều hành người dùng đã cài bàn phím tiếng Nhật hay chưa.
- Cực kỳ trực quan cho người học tiếng Nhật tại Việt Nam: Mỗi ứng viên Kanji trong bảng gợi ý đều hiển thị rõ **Kanji**, **Furigana**, **Âm Hán-Việt** và **Ý nghĩa tiếng Việt**.
- Mượt mà, hiệu năng cao, không giật lag con trỏ soạn thảo.

---

## 2. Kiến trúc Kỹ thuật & Luồng Dữ liệu (IME Pipeline)

```
[Bàn phím người dùng]
       │
       ▼ (Gõ ký tự Romaji: ví dụ "t-a-b-e-r-u")
┌────────────────────────────────────────────────────────┐
│ 1. Active Composition Tracker                          │
│    Theo dõi từ đang gõ tại vị trí con trỏ (caret)      │
└────────────────────────────────────────────────────────┘
       │
       ▼ (Tự động biến đổi tức thì theo KanaMode)
┌────────────────────────────────────────────────────────┐
│ 2. Live Kana Conversion (`たべる`)                      │
└────────────────────────────────────────────────────────┘
       │
       ▼ (Người dùng nhấn Space hoặc Tab)
┌────────────────────────────────────────────────────────┐
│ 3. IME Engine Event Interceptor                        │
│    - Chặn phím Space mặc định (preventDefault)         │
│    - Trích xuất buffer âm Hiragana hiện tại            │
└────────────────────────────────────────────────────────┘
       │
       ├─────────────────────────────────┐
       ▼ (Tìm kiếm Offline)              ▼ (Tìm kiếm Online song song)
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Inverted Index Dictionary    │  │ Context Transliteration API  │
│ (Âm đọc Kun/On -> Kanji đơn) │  │ (Từ ghép, ngữ cảnh Kanji)    │
│ + Âm Hán Việt + Nghĩa Việt   │  │                              │
└──────────────────────────────┘  └──────────────────────────────┘
       │                                 │
       └────────────────┬────────────────┘
                        ▼
┌────────────────────────────────────────────────────────┐
│ 4. Candidate Ranker & Deduplicator                     │
│    Hợp nhất ứng viên, xếp hạng phổ biến JLPT/tần suất  │
│    Thêm tùy chọn [1] Hiragana gốc, [2] Katakana gốc    │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ 5. Floating IME Popover UI                             │
│    Hiển thị menu con trỏ: 1. 食べる  2. 食  3. たべる ...│
│    (Phím số 1-9, ↑/↓ để di chuyển, Enter để chọn)      │
└────────────────────────────────────────────────────────┘
                        │
                        ▼ (Xác nhận chọn)
┌────────────────────────────────────────────────────────┐
│ 6. Text Replacement & Caret Restoration                │
│    Thay thế chuỗi Hiragana bằng Kanji được chọn        │
│    Cập nhật danh sách phân tích Kanji tự động          │
└────────────────────────────────────────────────────────┘
```

---

## 3. Trải nghiệm Người dùng & Thiết kế Giao diện (UI/UX)

### 3.1. Floating IME Candidate Popover (`ImeCandidatePopover.tsx`)
- **Vị trí hiển thị**: Xuất hiện ngay sát dưới vị trí con trỏ đang soạn thảo (sử dụng tọa độ caret từ textarea/input hoặc neo thông minh tại dòng đang gõ).
- **Thiết kế giao diện chuẩn Tailwind CSS**:
  - Khung bo góc `rounded-xl`, đổ bóng tinh tế `shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900`.
  - Header nhỏ hiển thị âm đang gõ: `Chuyển đổi: "たべる"` kèm hướng dẫn phím tắt `[Space] Tiếp  [Enter] Chọn  [Esc] Đóng`.
  - Danh sách ứng viên đánh số từ `1` đến `9`:
    - **Cột 1**: Số thứ tự (`1`, `2`, `3`...) dạng badge phím tắt nhanh.
    - **Cột 2**: Từ Kanji/Từ ghép lớn, nổi bật (`text-lg font-bold text-teal-700 dark:text-teal-400`).
    - **Cột 3**: Furigana / Hiragana chuẩn.
    - **Cột 4**: Âm Hán-Việt in hoa đậm (ví dụ: `THỰC`).
    - **Cột 5**: Nghĩa tiếng Việt tóm tắt (ví dụ: `Ăn, dùng bữa`).
    - Hàng cuối cùng luôn có tùy chọn giữ nguyên Hiragana (`たべる`) và Katakana (`タベル`).
  - Active item được highlight nền `bg-teal-50 dark:bg-teal-950/40 border-l-4 border-teal-600`.

### 3.2. Hệ thống Phím tắt Điều khiển
| Phím | Hành vi khi mở bảng IME |
| :--- | :--- |
| `Space` hoặc `Tab` | Mở bảng IME (lần 1); chuyển xuống ứng viên kế tiếp (lần 2, 3...) |
| `Mũi tên xuống (↓)` | Di chuyển xuống ứng viên phía dưới |
| `Mũi tên lên (↑)` | Di chuyển lên ứng viên phía trên |
| `Phím số 1 - 9` | Chọn ngay lập tức ứng viên tương ứng với số |
| `Enter` | Xác nhận chèn ứng viên đang được chọn vào văn bản |
| `Escape` | Đóng bảng gợi ý, giữ nguyên chuỗi Hiragana đang gõ |
| `Backspace` | Xóa ký tự cuối của buffer, cập nhật lại gợi ý hoặc đóng nếu rỗng |

### 3.3. Tùy chọn Bật/Tắt trực quan (Toolbar Toggle)
- Trong `InputSection.tsx`, thanh công cụ chuyển đổi Romaji/Kana hiện tại sẽ được nâng cấp thêm tùy chọn:
  - **Tắt bộ gõ (Off)**
  - **Romaji → Hiragana/Katakana**
  - **Romaji → Hiragana → Kanji (IME)** *(Tự động kích hoạt kèm hướng dẫn nhanh bằng tooltip)*
- Người dùng có thể dễ dàng chuyển đổi qua lại chỉ với 1 click hoặc phím tắt `Ctrl + Space` / `Alt + K`.

---

## 4. Chi tiết Kỹ thuật Triển khai

### 4.1. Tạo Module Quản lý Tra cứu IME: `src/utils/kanjiImeEngine.ts`
- **Tạo Inverted Index**:
  - Quét qua `KANJI_DICTIONARY` và `SINO_VIETNAMESE_MAP`.
  - Tạo bảng tra cứu ánh xạ âm đọc:
    - On-yomi (chuyển Katakana → Hiragana) → `[Kanji, Hán-Việt, Nghĩa]`.
    - Kun-yomi (bỏ các dấu chấm `・` phân tách okurigana) → `[Kanji, Hán-Việt, Nghĩa]`.
- **Cơ chế Contextual Lookup (Google Input Tools API)**:
  - Endpoint: `https://inputtools.google.com/request?text={reading}&itc=ja-t-i0-und&num=8`
  - Thư viện xử lý trả về danh sách từ ghép hoàn chỉnh tiếng Nhật kèm Kanji thực tế.
  - Tích hợp bộ đệm (In-memory LRU Cache) để các từ đã tra không cần gọi lại mạng.
  - Khi không có mạng hoặc mạng chậm (> 300ms), bảng offline lập tức trả kết quả ngay không gián đoạn người dùng.

### 4.2. Xử lý Con trỏ và Vùng đệm gõ (Composition Buffer)
- Tạo custom hook `useImeInput`:
  - Quản lý trạng thái `activeWord`, vị trí con trỏ `selectionStart`, `selectionEnd`.
  - Tính toán tọa độ pixel của con trỏ (Caret Coordinates) trong `textarea` hoặc `input` để hiển thị Popover đúng vị trí đang gõ.
  - Hàm `commitCandidate(candidateText)`: thay thế đoạn text composition bằng Kanji và di chuyển con trỏ về sau ký tự vừa chèn.

### 4.3. Tích hợp vào Khung nhập chính (`src/components/InputSection.tsx`)
- Lắng nghe sự kiện `onKeyDown` trên `textarea`:
  - Khi người dùng đang ở chế độ Kanji IME và nhấn `Space`/`Tab`:
    - Nếu Popover chưa mở: kiểm tra từ Hiragana cuối cùng tại vị trí con trỏ; nếu hợp lệ, chặn sự kiện gõ phím cách mặc định và mở Popover gợi ý.
    - Nếu Popover đang mở: chuyển sang chọn ứng viên tiếp theo.
- Lắp ráp component `<ImeCandidatePopover />`.

### 4.4. Tích hợp vào Thanh tìm kiếm nhanh (`src/App.tsx` & `SearchBar.tsx`)
- Áp dụng cùng logic IME cho thanh tìm kiếm nhanh để người học có thể gõ `gakkou` + `Space` → chọn `学校` để tra cứu cực kỳ tiện lợi mà không cần bộ gõ ngoài.

---

## 5. Kế hoạch Các bước Thực hiện (Step-by-Step Implementation)

1. **Bước 1: Xây dựng Core IME Engine (`src/utils/kanjiImeEngine.ts`)**
   - Xây dựng chỉ mục ngược `Hiragana -> KanjiItem[]` từ từ điển offline sẵn có.
   - Viết API fetcher kết nối Google Transliterate API với bộ đệm cache.
   - Viết hàm chuẩn hóa âm đọc và xếp hạng ứng viên (ưu tiên từ ghép chính xác, Kanji thông dụng N5-N1).

2. **Bước 2: Xây dựng UI Component Popover (`src/components/ImeCandidatePopover.tsx`)**
   - Thiết kế giao diện danh sách gợi ý đẹp mắt, nhỏ gọn, chuẩn IME Nhật.
   - Hỗ trợ số thứ tự `1`-`9`, âm Hán-Việt, Furigana và nghĩa tiếng Việt.
   - Thêm hiệu ứng focus, bàn phím điều hướng `↑`, `↓`, `Enter`, `Esc`.

3. **Bước 3: Tích hợp vào `InputSection.tsx`**
   - Nâng cấp trạng thái `kanaMode` thành có thêm mode `'kanji'`.
   - Kết nối sự kiện bàn phím `Space`, `Tab`, `ArrowUp`, `ArrowDown`, `Enter`, `Esc`.
   - Tính toán vị trí hiển thị Popover theo caret position.

4. **Bước 4: Tích hợp vào Search Bar (`App.tsx`)**
   - Thêm chế độ gõ IME cho ô tìm kiếm nhanh Kanji.

5. **Bước 5: Cập nhật Tài liệu & Hướng dẫn sử dụng**
   - Cập nhật `src/components/UserGuideModal.tsx` để người dùng biết cách dùng phím `Space`/`Tab` gõ Kanji.
   - Cập nhật tài liệu markdown hướng dẫn tính năng mới.

6. **Bước 6: Kiểm thử & Tối ưu hóa**
   - Kiểm tra gõ từ đơn: `hi` → `日`, `mizu` → `水`, `hito` → `人`.
   - Kiểm tra từ ghép: `nihon` → `日本`, `sensei` → `先生`, `gakusei` → `学生`.
   - Kiểm tra phím `Esc`, `Enter`, phím số `1`-`9`, phím mũi tên.
   - Kiểm tra hoạt động mượt mà khi gõ văn bản dài và trên cả thiết bị di động (tap chọn ứng viên).
   - Chạy `compile_applet` và `lint_applet` đảm bảo không phát sinh bất kỳ lỗi nào.

---

Vui lòng xem xét kế hoạch chi tiết trên. Khi bạn đã sẵn sàng, hãy nhấn nút **Proceed** hoặc gửi phản hồi để tôi tiến hành triển khai mã nguồn!
