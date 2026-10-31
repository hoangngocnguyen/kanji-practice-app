# Kế hoạch triển khai: Kiểm tra nét Kanji & Bộ gõ Romaji sang Kana

Người dùng yêu cầu bổ sung 2 tính năng trọng tâm cho ứng dụng:
1. **Kiểm tra viết đúng nét và thứ tự chữ Kanji**: Có hướng dẫn từng nét tuần tự, phát hiện vẽ đúng/sai hướng nét, chấm điểm độ chính xác (accuracy score %) và phản hồi trực quan.
2. **Bộ gõ chuyển đổi Romaji sang tiếng Nhật (Kana)**: Tự động chuyển đổi trực tiếp khi gõ chữ Romaji (Latinh) trong ô nhập văn bản thành Hiragana/Katakana.

---

## I. User Review Required (Điểm cần xác nhận)

> [!NOTE]
> - **Chế độ kiểm tra nét**: Trong tab "Tập viết tay", người dùng có thể linh hoạt chuyển đổi giữa **"Viết tự do"** (chế độ vẽ tay tự do trước đây) và **"Kiểm tra nét & Thứ tự"** (chế độ mới có chấm điểm, hướng dẫn nét tiếp theo, phát hiện ngược nét).
> - **Bộ gõ Romaji**: Tích hợp thanh công cụ chuyển đổi `[⌨️ Romaji: Tắt | あ Hiragana | ア Katakana]` ngay trên ô nhập văn bản tiếng Nhật. Hỗ trợ đầy đủ âm ghép (`kya`, `sho`...), âm ngắt (`tt` -> `っ`), âm mũi (`nn` -> `ん`), trường âm (`-` -> `ー`).

---

## II. Đề xuất Thay đổi Chi tiết

### 1. Module Thuật toán Kiểm tra Nét Kanji (`src/utils/strokeMatcher.ts`)
- **Phân tích KanjiVG Vector Paths**:
  - Trích xuất danh sách các thẻ `<path d="...">` từ SVG KanjiVG của từng chữ Hán.
  - Sử dụng `SVGPathElement.getPointAtLength()` để lấy mẫu $N = 32$ điểm tọa độ cách đều cho mỗi nét chuẩn (chuẩn hóa về khung tọa độ 109x109).
- **Thuật toán Đánh giá Nét vẽ người dùng**:
  - Chuẩn hóa nét vẽ từ canvas (quy đổi tỷ lệ kích thước canvas sang hệ tọa độ 109x109).
  - So khớp điểm bắt đầu (Start Point) và điểm kết thúc (End Point) theo bán kính sai số cho phép.
  - Phân tích vector hướng nét (Directional Angle / Cosine Similarity): Phát hiện lỗi viết ngược nét (ví dụ nét ngang viết từ phải sang trái, nét sổ viết từ dưới lên trên).
  - Đo độ lệch trung bình (Mean Euclidean Distance / Modified Frechet Distance) giữa nét người dùng vẽ và nét chuẩn.
  - Tính điểm độ chính xác (0 - 100%):
    - $\ge 60\%$: Nét ĐẠT -> Hiệu ứng xanh lá, âm thanh báo hoàn thành nét, tự động chuyển sang nét kế tiếp.
    - $< 60\%$: Nét CHƯA ĐẠT -> Hiệu ứng cảnh báo cam/đỏ, hiển thị mũi tên hướng dẫn nét đúng và cho phép vẽ lại ngay nét đó mà không cần xóa lại từ đầu.
- **Tổng kết hoàn thành chữ**:
  - Hiển thị điểm trung bình toàn bộ chữ (VD: 92% - Xuất sắc).
  - Huy hiệu động viên và nút "Luyện lại" hoặc chuyển sang chữ Kanji tiếp theo.

### 2. Nâng cấp Giao diện Luyện viết (`src/components/PracticeModal.tsx`)
- Thêm bộ chuyển đổi chế độ trong Tab "Tập viết tay":
  - **Chế độ Tự do**: Vẽ phác thảo tự do như hiện tại, đổi màu mực, xóa nét.
  - **Chế độ Kiểm tra nét & Chấm điểm**:
    - Hiển thị nét hiện tại cần vẽ (nét $i$ sáng lên, kèm số thứ tự và chấm tròn định vị điểm bắt đầu).
    - Các nét đã vẽ đúng được lưu lại với màu nét chuẩn hoặc màu người dùng chọn.
    - Thanh tiến trình nét (Ví dụ: `Nét 3/8: Nét ngang`).
    - Nút thao tác: "Vẽ lại nét hiện tại", "Gợi ý nét này", "Bỏ qua nét".
    - Bảng thông báo kết quả chấm điểm từng nét và tổng kết sau khi hoàn tất.

### 3. Module Bộ gõ Romaji sang Kana (`src/utils/romajiConverter.ts`)
- Triển khai bộ chuyển đổi Romaji chuẩn (Hepburn & Kunrei mở rộng) không cần cài thư viện ngoài:
  - Bản đồ chuyển đổi nguyên âm (`a, i, u, e, o`), phụ âm đơn, phụ âm đôi (`kka -> っか`, `tte -> って`), âm ghép (`kya -> きゃ`, `ryo -> りょ`...), âm đặc biệt (`shi, chi, tsu, fu, ji`).
  - Xử lý thông minh ký tự `n`: gõ `n` đứng trước phụ âm hoặc `nn` sẽ chuyển thành `ん`, nếu gõ `na` sẽ thành `な`.
  - Hỗ trợ chuyển đổi sang cả Hiragana và Katakana.
- Hàm hỗ trợ chèn và thay thế tại vị trí con trỏ chuột (`selectionStart`, `selectionEnd`) để gõ tự nhiên, không bị giật con trỏ.

### 4. Tích hợp Bộ gõ vào Giao diện Nhập liệu (`src/components/InputSection.tsx`)
- Thêm thanh chuyển đổi chế độ gõ Romaji ngay phía trên góc phải của textarea:
  - Các chế độ: `[Tắt | Hiragana (あ) | Katakana (ア)]`.
  - Gợi ý phím tắt chuyển nhanh.
  - Khi người dùng gõ phím ký tự Latinh trong ô, từ ngữ được tự động chuyển thành chữ Kana tương ứng theo thời gian thực.
  - Có nút "Chuyển toàn bộ đoạn văn Romaji đã dán thành Kana" cho người dùng khi họ copy cả đoạn Romaji từ nguồn khác dán vào.

---

## III. Kế hoạch Kiểm tra (Verification Plan)

### Kiểm tra tự động & Biên dịch
- Chạy `compile_applet` để đảm bảo TypeScript biên dịch thành công 100%, không phát sinh lỗi types hay cú pháp.
- Chạy `lint_applet` để xác thực tuân thủ tiêu chuẩn mã nguồn.

### Kiểm tra tính năng bằng kịch bản thực tế
1. **Kiểm tra Bộ gõ Romaji sang Kana**:
   - Gõ `watashi no namae wa tanaka desu` -> Kiểm tra kết quả tự động chuyển thành `わたしのなまえはたなかです`.
   - Gõ `nihon` -> `にほん`, gõ `tokyo` -> `とうきょう` hoặc `to-kyo-` -> `とうきょう`.
   - Chuyển sang Katakana, gõ `konpyu-ta-` -> `コンピューター`.
   - Tắt chế độ Romaji -> Nhập text thông thường và dán văn bản vẫn hoạt động trơn tru.
2. **Kiểm tra Chức năng Luyện nét & Chấm điểm**:
   - Mở modal luyện tập của chữ `日` (4 nét) hoặc `本` (5 nét).
   - Chọn chế độ "Kiểm tra nét & Chấm điểm".
   - Vẽ nét 1 đúng chiều (từ trên xuống dưới) -> Hệ thống ghi nhận nét đạt, chấm điểm (ví dụ: 88%), mở khóa nét 2.
   - Thử cố ý vẽ nét 2 ngược chiều (từ dưới lên trên hoặc từ phải sang trái) -> Hệ thống cảnh báo vẽ ngược hướng nét, giữ nguyên ở nét 2 cho vẽ lại.
   - Hoàn thành đủ các nét -> Hiển thị popup tổng kết điểm số kèm nút luyện lại.
