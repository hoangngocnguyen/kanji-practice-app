# Kế hoạch Triển khai: Tính năng Chụp màn hình khoanh vùng OCR & Ô tìm kiếm đa năng trên Extension Luyện Kanji

Kế hoạch kiến trúc và trải nghiệm cho tính năng chụp màn hình khoanh vùng (Screen Snipping OCR) trên tiện ích mở rộng Chrome/Edge Luyện Kanji, tái sử dụng công nghệ trích xuất Hán tự từ Web App và bổ sung ô tìm kiếm đồng bộ trên cả Extension Popup và Floating Modal.

## User Review & Critical Decisions

> [!IMPORTANT]
> Dưới đây là các quyết định chính đã được xác nhận cùng người dùng trước khi tiến hành viết mã:

- **Cơ chế nhận diện OCR và hiển thị**: Nhận diện trực tiếp ngay trong cửa sổ nổi trên trang web (in-page Shadow DOM modal), đồng thời cung cấp nút chuyển nhanh dữ liệu sang Web App Luyện Kanji (`https://luyenkanji.vercel.app/?text=...`) để tra cứu sâu, luyện viết và xuất flashcard.
- **Vị trí ô tìm kiếm Kanji (Search Box)**: Tích hợp đồng bộ ở 2 vị trí:
  1. Trong **Extension Popup** (`popup.html` / `popup.js`): Hỗ trợ gõ trực tiếp Kanji / Kana / Romaji, có nút chụp màn hình và nút chuyển sang Web App.
  2. Trên **thanh Header của Floating Modal** (`content.js`): Cho phép người dùng gõ tìm kiếm Kanji bất cứ lúc nào ngay trên trang web đang duyệt mà không cần phải bôi đen văn bản mới.
- **Phương thức kích hoạt chụp màn hình**: Hỗ trợ 3 cách kích hoạt tiện lợi:
  1. Nút "Chụp & Quét Kanji" trong Extension Popup.
  2. Mục "Chụp khoanh vùng quét Kanji" trong Context Menu chuột phải (`chrome.contextMenus`).
  3. Phím tắt toàn cục (Keyboard shortcut: `Alt + Shift + S` hoặc `Ctrl + Shift + S`).

---

## 1. Overview & Core Concept

- **Mục tiêu tính năng**: Cho phép người học tiếng Nhật quét và tra cứu chữ Hán từ bất kỳ hình ảnh, video (như YouTube, Anime, truyện tranh online, tài liệu PDF, bản tin quét ảnh) trên mọi trang web mà bình thường không thể bôi đen chữ bằng chuột được.
- **Đối tượng sử dụng**: Người học tiếng Nhật mọi cấp độ (N5–N1), người đọc tin tức tiếng Nhật (NHK, Yahoo JP), xem phim, đọc manga hoặc tài liệu scan.
- **Giá trị cốt lõi**:
  - Không còn giới hạn ở văn bản có thể chọn (selectable text).
  - Tái sử dụng cơ chế xử lý OCR chuẩn xác (kết hợp Tesseract.js tối ưu cho chữ Hán CJK `[\u4e00-\u9faf]` và từ điển âm Hán Việt).
  - Trải nghiệm mượt mà, không làm gián đoạn việc duyệt web nhờ kiến trúc Shadow DOM độc lập.

---

## 2. User Experience & Visual Design

### A. Luồng trải nghiệm người dùng (User Flows)

```
[Người dùng thấy chữ Hán trên ảnh / video]
         │
         ├── Cách 1: Bấm biểu tượng Extension -> Bấm "Chụp & Quét Kanji"
         ├── Cách 2: Chuột phải vào trang -> Chọn "Chụp khoanh vùng quét Kanji"
         └── Cách 3: Nhấn tổ hợp phím tắt [Alt + Shift + S]
         │
         ▼
[Màn hình tối mờ (Snipping Overlay) xuất hiện trên toàn tab]
         │
         ├─ Kéo thả chuột để khoanh vùng chữ Hán cần quét
         ├─ Có thước đo kích thước khung (W x H) và hướng dẫn "Nhấn Esc để hủy"
         │
         ▼
[Cắt ảnh vùng chọn (Canvas Crop) dựa theo devicePixelRatio]
         │
         ▼
[Cửa sổ nổi Shadow DOM mở ra với thanh OCR Scanning HUD]
         │
         ├─ Hiển thị ảnh vừa cắt thu nhỏ
         ├─ Thanh tiến trình quét chữ Hán (Tesseract OCR)
         ├─ Danh sách các chữ Kanji bóc tách được (kèm âm Hán Việt)
         │
         ▼
[Tự động điền chuỗi Kanji vào Ô Tìm Kiếm ở Header Modal]
         │
         ├── Bấm vào từng chữ Kanji -> Mở Tab Hoạt ảnh nét vẽ, Bộ thủ, Tập viết
         ├── Bấm "Dán sang Web App" -> Mở https://luyenkanji.vercel.app/?text=...
         └── Bấm "Sao chép" -> Copy chuỗi chữ Hán vào Clipboard
```

### B. Thiết kế giao diện (Visual Theme & Token Matching)

- **Màu sắc chủ đạo**:
  - Tông màu đồng bộ với Web App: Xanh mòng két (`#0f766e` / `#0d9488`), nền than đen sâu (`#0f172a`), và xám dịu (`#f8fafc`).
  - Lớp phủ chụp màn hình: `rgba(15, 23, 42, 0.55)` với khung viền nét đứt màu xanh mòng két sáng (`#2dd4bf`) và vệt cắt trong suốt (clear cutout).
- **Thanh tìm kiếm (Search Box) mới**:
  - Chiều cao chuẩn `h-10`, bo góc `rounded-xl`, viền nhạt `border-slate-200`, có icon kính lúp (`Search`) và nút xóa nhanh (`X`).
  - Hỗ trợ gõ Romaji tự động chuyển thành Kana hoặc dán chuỗi chữ Hán.
- **Snipping Toolbar & Badge HUD**:
  - Nút chụp ảnh nổi bật trong Popup: màu xanh Teal Gradient, icon Camera + Scan.
  - Khung hướng dẫn trong lúc khoanh vùng: HUD đen mờ bo tròn nổi bật, chữ trắng tinh tế.

---

## 3. Key Product Decisions & Trade-Offs

- **Quyết định 1: Cơ chế chụp ảnh màn hình trong Manifest V3**
  - *Phương án chọn*: Dùng `chrome.tabs.captureVisibleTab(null, { format: 'png' })` từ Background Service Worker khi nhận lệnh từ Popup, Context Menu hoặc Shortcut, sau đó chuyển `dataUrl` sang `content.js` để kích hoạt công cụ khoanh vùng.
  - *Lý do*: Đây là API tiêu chuẩn của trình duyệt Chrome/Edge trong Manifest V3, không cần cấp thêm quyền nhạy cảm như `desktopCapture`, chạy cực nhanh và hỗ trợ đầy đủ độ phân giải màn hình Retina/4K thông qua tỉ lệ `window.devicePixelRatio`.
  - *Phương án loại bỏ*: Dùng `getDisplayMedia` (bắt người dùng phải chọn lại cửa sổ qua hộp thoại hệ điều hành, gây phiền toái).

- **Quyết định 2: Tái sử dụng và đồng bộ bộ máy OCR giữa Web App và Extension**
  - *Phương án chọn*: Đóng gói module xử lý OCR thống nhất:
    1. Nhận ảnh cắt (Blob/DataURL) -> Tiền xử lý tương phản đơn giản qua HTML5 Canvas.
    2. Chạy nhận diện ký tự Hán tự CJK `[\u4e00-\u9faf]`.
    3. Tra cứu nhanh từ điển Hán Việt nội tuyến (`KANJI_DICTIONARY`).
    4. Cung cấp nút chuyển tiếp 1-click mở Web App với tham số URL `/?text={kanji}` đã được Web App hỗ trợ sẵn.
  - *Lý do*: Đảm bảo tính nhất quán 100% giữa phiên bản Web và Extension, không phát sinh chi phí server hay phụ thuộc API ngoài.

- **Quyết định 3: Tích hợp ô tìm kiếm mới trong Extension Popup và Floating Modal**
  - *Phương án chọn*:
    - Bổ sung thanh tìm kiếm nhanh ở đầu Floating Modal trên mọi trang web. Khi có kết quả quét OCR, kết quả được tự động điền vào đây. Người dùng cũng có thể tự gõ thêm bất kỳ chữ nào.
    - Cập nhật ô tìm kiếm trong Extension Popup với nút phím tắt kích hoạt Chụp màn hình ngay cạnh.
  - *Đồng bộ mã nguồn*: Cập nhật đồng thời cả thư mục `/src/extension` lẫn bộ sinh mã nén ZIP trong `src/components/ExtensionExporter.tsx` và màn hình demo `src/components/ExtensionPlayground.tsx`.

---

## 4. Technical Architecture & Component Structure

### A. Sơ đồ kiến trúc luồng dữ liệu (Data & Event Flow)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EXTENSION ENTRY POINTS                          │
│                                                                        │
│  [Popup UI (popup.html)]     [Context Menu]     [Shortcut: Alt+Shift+S]│
│         │                           │                      │           │
│         └─────────────────────┬─────┴──────────────────────┘           │
│                               ▼                                        │
│                 [background.js Service Worker]                         │
│                               │                                        │
│               captureVisibleTab({format: 'png'})                       │
│                               │                                        │
│                               ▼ (START_SCREEN_SNIP + fullDataUrl)      │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    CONTENT SCRIPT (Shadow DOM)                         │
│                                                                        │
│  [Snipping Overlay Canvas]                                             │
│    - Vẽ lớp tối che toàn màn hình                                      │
│    - Bắt sự kiện mousedown -> mousemove -> mouseup                    │
│    - Tính toán crop coordinates: x, y, width, height * devicePixelRatio│
│    - Cắt vùng chọn thành croppedCanvas DataURL                         │
│                                                                        │
│  [Kanji OCR Extractor Module]                                          │
│    - Trích xuất chữ Hán CJK [\u4e00-\u9faf]                            │
│    - Tra cứu Hán Việt, âm On/Kun, số nét từ từ điển nội tuyến          │
│                                                                        │
│  [Floating Kanji Modal with Top Search Bar]                            │
│    ┌────────────────────────────────────────────────────────────────┐  │
│    │ 🔍 [Ô Tìm Kiếm Kanji & Kana]        [📸 Quét lại]   [✕ Đóng]  │  │
│    ├────────────────────────────────────────────────────────────────┤  │
│    │ Kết quả OCR: [東: ĐÔNG] [京: KINH] [駅: DỊCH]                  │  │
│    │ [Thẻ chi tiết chữ Hán] ──▶ Xem nét / Âm On-Kun / Tập viết      │  │
│    │ [Nút chuyển dữ liệu sang Web App Luyện Kanji]                  │  │
│    └────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (Truyền tham số /?text=...)
┌────────────────────────────────────────────────────────────────────────┐
│                     LUYÊN KANJI WEB APPLICATION                        │
│                (https://luyenkanji.vercel.app/?text=...)               │
│                                                                        │
│  - Tự động nhận tham số ?text= từ URL                                  │
│  - Phân tích bảng Hán tự, phát âm, lưới tập viết, xuất PDF/Anki        │
└────────────────────────────────────────────────────────────────────────┘
```

### B. Các file trọng tâm sẽ được cập nhật khi thực thi

1. **`src/extension/manifest.json`**:
   - Thêm command shortcut: `"capture-screen"` (`suggested_key: { default: "Alt+Shift+S" }`).
   - Đảm bảo quyền `"activeTab"`, `"scripting"`, `"storage"`, `"contextMenus"`.

2. **`src/extension/background.js`**:
   - Lắng nghe `chrome.commands.onCommand` cho shortcut chụp màn hình.
   - Thêm context menu item: `"luyen-kanji-snipping"`.
   - Lắng nghe message `"TRIGGER_CAPTURE_SCREEN"` từ popup/contextMenu, gọi `chrome.tabs.captureVisibleTab` và gửi kết quả sang `content.js`.

3. **`src/extension/popup.html` & `popup.js`**:
   - Thêm nút hành động nổi bật: `📸 Chụp khoanh vùng quét Kanji`.
   - Tối ưu ô tìm kiếm nhanh, hỗ trợ gõ phím Enter tra cứu ngay.

4. **`src/extension/content.js`**:
   - Bổ sung module Snipping Overlay Canvas (vẽ khung khoanh vùng, phím Esc để hủy, tính toán devicePixelRatio chuẩn xác).
   - Bổ sung module OCR trích xuất chữ Hán (với cơ chế canvas image pre-processing).
   - Bổ sung thanh tìm kiếm nhanh (Search Box) ngay ở đầu cửa sổ nổi Shadow DOM Modal.
   - Thêm nút chuyển tiếp ảnh/chữ sang Web App Luyện Kanji.

5. **`src/components/ExtensionPlayground.tsx` & `src/components/ExtensionExporter.tsx`**:
   - Đồng bộ tính năng chụp màn hình demo trong Playground trực tiếp trên giao diện web.
   - Cập nhật bộ đóng gói ZIP để người dùng tải về bản tiện ích đầy đủ nhất (v2.1.0).

---

## 5. Kế hoạch Kiểm thử & Xác minh (Verification Plan)

1. **Kiểm thử chụp khoanh vùng**:
   - Kéo chuột chọn một vùng chứa chữ Hán, xác nhận tọa độ và ảnh cắt sắc nét, không bị lệch tỷ lệ trên cả màn hình chuẩn (1x) và Retina (2x).
2. **Kiểm thử trích xuất chữ Hán & Ô tìm kiếm**:
   - Kiểm tra kết quả bóc tách các ký tự Hán tự và tự động đẩy vào ô tìm kiếm trên Header của Modal.
   - Kiểm tra tính năng gõ tìm kiếm thủ công trực tiếp trên Modal.
3. **Kiểm thử điều hướng sang Web App**:
   - Nhấn nút "Mở trên Web App Luyện Kanji", xác minh URL `https://luyenkanji.vercel.app/?text=...` nhận đầy đủ các chữ Hán đã quét.
4. **Kiểm thử xuất tệp Extension ZIP**:
   - Tải tệp zip từ trang web và xác minh tính toàn vẹn của các tệp `manifest.json`, `background.js`, `content.js`, `popup.html`, `popup.js`.
