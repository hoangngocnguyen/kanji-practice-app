# 🖨️ 07. Cơ Chế In Ấn A4 Đa Trang & Điều Hướng Modal Trái / Phải

Tài liệu này giải thích chi tiết kiến trúc kỹ thuật của hệ thống **In Ấn Phiếu Luyện Viết A4 Đa Trang (Multi-Page Print Engine)** và **Cơ Chế Điều Hướng Trái / Phải (Modal Fast Navigation)** trong ứng dụng Luyện Kanji v3.0.0.

---

## 1. Cơ Chế In Ấn Chuẩn A4 Đa Trang (Multi-Page Print Engine)

### 1.1 Vấn đề cốt lõi của in ấn trong Single-Page Application (SPA)
Trong các ứng dụng React thông thường, các hộp thoại xem trước (modal) thường có cấu trúc CSS:
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  max-height: 90vh;
  overflow: hidden;
}
.scrollable-body {
  overflow-y: auto;
}
```
Khi người dùng gọi lệnh `window.print()` từ trong modal:
1. **Viewport Truncation (Cắt ngắn trang)**: Trình duyệt coi phần tử `position: fixed` và `max-height: 90vh` là một khung nhìn tĩnh. Mọi nội dung bị tràn trong `overflow-y: auto` sẽ bị loại bỏ hoàn toàn và chỉ in được trang đầu tiên (thường là 10–12 chữ Kanji đầu).
2. **Duplication Artifacts (Nhân bản thành phần cố định)**: Các phần tử `position: fixed` (như nền mờ đen `bg-slate-900/60`, thanh tiêu đề modal, thanh chọn cột) bị trình duyệt ép vẽ lại chồng chéo trên các trang in ảo.
3. **Background Leaks (Lọt giao diện web)**: Các thành phần phía sau như Header chính, thanh công cụ, ô nhập liệu... có thể bị lọt vào bản in nếu không được xử lý cẩn thận.

---

### 1.2 Giải Pháp Kỹ Thuật: CSS Paged Media Unrolling
Hệ thống sử dụng cơ chế **Unroll Container** thông qua CSS `@media print` trong `src/index.css`:

```css
@media print {
  @page {
    size: A4 portrait;
    margin: 10mm 8mm 10mm 8mm;
  }

  /* 1. Triệt tiêu toàn bộ giao diện tương tác */
  header, footer, main, nav, button, input, textarea, select, .no-print {
    display: none !important;
  }

  /* 2. Giải phóng nền và chiều cao trang */
  html, body {
    background: #ffffff !important;
    color: #000000 !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* 3. Mở cuộn Modal thành tài liệu in tự nhiên nhiều trang */
  .kanji-print-modal-backdrop,
  .kanji-print-modal-dialog,
  .kanji-print-modal-scrollable,
  .kanji-print-paper-sheet {
    position: static !important;
    inset: auto !important;
    background: #ffffff !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* 4. Ẩn thanh công cụ & tùy chọn cột của modal khi in */
  .kanji-print-modal-header,
  .kanji-print-modal-controls,
  .kanji-print-modal-toolbar,
  .kanji-print-modal-footer {
    display: none !important;
  }

  /* 5. Phân trang bảng & lặp tiêu đề bảng chuẩn */
  table {
    width: 100% !important;
    border-collapse: collapse !important;
  }

  thead {
    display: table-header-group !important; /* Lặp lại tiêu đề ở đầu mỗi trang in mới */
  }

  tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  td, th {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    color: #000000 !important;
  }

  img, svg {
    max-width: 100% !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
```

### 1.3 Tùy Chọn Cột Linh Hoạt
Người dùng có thể bật/tắt độc lập 5 cột dữ liệu trước khi bấm in:
1. `printStt`: Cột Số thứ tự (1, 2, 3...)
2. `printKanji`: Cột Chữ Hán to, Hiragana furigana, âm Hán-Việt in hoa và nhãn JLPT.
3. `printReadings`: Cột Âm On, Kun và ý nghĩa tiếng Việt chi tiết.
4. `printImage`: Cột vector SVG nét vẽ chuẩn có đánh số thứ tự nét.
5. `printPracticeBoxes`: Cột ô luyện viết tay gồm 1 ô watermark mờ để đồ chữ và 3 ô chia lưới đứt nét để tự viết.

Nút tiện ích **"Chọn tất cả" / "Bỏ chọn tất cả"** giúp thao tác nhanh chỉ với 1 cú click.

---

## 2. Cơ Chế Điều Hướng Modal Trái / Phải (Modal Fast Navigation)

### 2.1 Động Lực Trải Nghiệm Người Dùng (UX Rationale)
Khi học tập danh sách 20–50 chữ Kanji, người dùng thường xuyên cần kiểm tra chi tiết từng chữ (xem hoạt ảnh nét, tra từ ghép, luyện viết tay). Nếu mỗi lần đều phải:
1. Bấm nút Đóng (X)
2. Cuộn chuột tìm vị trí chữ tiếp theo
3. Nhấp mở lại modal

Điều này gây gián đoạn luồng suy nghĩ và giảm tốc độ học tập. Tính năng Điều hướng Trái / Phải giải quyết triệt để vấn đề này.

### 2.2 Kiến Trúc & Xử Lý Sự Kiện (Event Handling)

#### A. Định vị vị trí hiện tại trong danh sách
`PracticeModal` nhận danh sách `kanjiList` (danh sách chữ hiện tại sau khi đã lọc theo thanh tìm kiếm) và tính toán:
```typescript
const currentIndex = kanjiList && item
  ? kanjiList.findIndex((k) => k.kanji === item.kanji || k.hex === item.hex)
  : -1;

const hasPrev = currentIndex > 0;
const hasNext = kanjiList && currentIndex >= 0 && currentIndex < kanjiList.length - 1;
```

#### B. Hàm chuyển tiếp (Transition Callbacks)
Khi chuyển sang chữ kế tiếp hoặc quay lại chữ trước đó:
```typescript
const goToPrev = useCallback(() => {
  if (kanjiList && item) {
    const idx = kanjiList.findIndex((k) => k.kanji === item.kanji || k.hex === item.hex);
    if (idx > 0 && onNavigateKanji) {
      onNavigateKanji(kanjiList[idx - 1]);
    }
  }
}, [kanjiList, item, onNavigateKanji]);

const goToNext = useCallback(() => {
  if (kanjiList && item) {
    const idx = kanjiList.findIndex((k) => k.kanji === item.kanji || k.hex === item.hex);
    if (idx >= 0 && idx < kanjiList.length - 1 && onNavigateKanji) {
      onNavigateKanji(kanjiList[idx + 1]);
    }
  }
}, [kanjiList, item, onNavigateKanji]);
```
`onNavigateKanji` gọi `handleInspectKanji` trong `App.tsx`, tự động:
1. Nạp dữ liệu tra cứu chi tiết (On, Kun, Meanings, Radicals, JLPT).
2. Tải trước vector nét vẽ SVG vào bộ nhớ đệm (Cache).
3. Ghi nhận ký tự vừa xem vào danh sách Lịch Sử Tra Cứu Gần Đây (`recentlyViewed`).

#### C. Lắng nghe phím tắt bàn phím (`ArrowLeft` & `ArrowRight`)
```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    onClose();
  } else if (event.key === 'ArrowLeft') {
    const target = event.target as HTMLElement;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
    if (hasPrev) {
      event.preventDefault();
      goToPrev();
    }
  } else if (event.key === 'ArrowRight') {
    const target = event.target as HTMLElement;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
    if (hasNext) {
      event.preventDefault();
      goToNext();
    }
  }
};
```
*Lưu ý bảo vệ*: Nếu người dùng đang gõ trong một thẻ `<input>` hoặc `<textarea>`, phím mũi tên sẽ không kích hoạt chuyển modal mà giữ nguyên hành vi di chuyển con trỏ văn bản.

#### D. Giao diện người dùng đa nền tảng (Responsive UI)
- **Desktop**: Nút mũi tên nổi 2 bên hông modal (`-left-14`, `-right-14`) với hiệu ứng hover và bóng đổ nổi bật.
- **Header Modal**: Thanh đếm chỉ mục mini `[ < ] 3 / 15 [ > ]` hiển thị vị trí chữ hiện tại trên tổng số chữ.
- **Mobile**: Nút bấm nhanh `← Trước` và `Sau →` tích hợp ngay thanh footer dưới cùng của modal.

---

## 3. Tóm Tắt & Lợi Ích Kỹ Thuật

| Tính năng | Giải pháp kỹ thuật | Lợi ích |
| :--- | :--- | :--- |
| **In A4 Đa Trang** | Mở cuộn Container CSS (`position: static; max-height: none`), `thead` lặp lại | In trọn vẹn mọi số lượng Kanji, không cắt ngắn, không nhân bản khung hình |
| **Tùy Chọn Cột In** | Quản lý state 5 cờ cột độc lập (`printStt`, `printKanji`, ...) | Tùy biến bảng in cho người học (chỉ nét vẽ, hoặc chỉ chữ Hán) |
| **Phím Tắt ← / →** | Global `keydown` listener với thẻ loại trừ input | Lướt xem nhanh toàn bộ danh mục Kanji không cần chạm chuột |
| **Chỉ Mục Header** | `currentIndex + 1 / total` phản ứng theo bộ lọc tìm kiếm | Nắm rõ tiến độ ôn tập trong danh sách |
