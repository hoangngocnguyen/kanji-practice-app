# Advanced Multi-Component Kanji Decomposition Plan

Kế hoạch nâng cấp toàn diện **Bộ máy Phân tách Bộ thủ Kanji Đa thành phần (Multi-Component Kanji Decomposition Engine)**, giải quyết triệt để vấn đề các chữ Kanji phức tạp (như 能, 警, 躍, 鬱, 語, 働...) bị thiếu bộ thủ hoặc chỉ hiển thị 1 thành phần đơn lẻ.

---

## User Review & Critical Decisions

> [!IMPORTANT] Giải pháp kỹ thuật được xác nhận dựa trên phản hồi và ảnh chụp màn hình từ người dùng:

- **Vấn đề thực tế (từ ảnh chụp chữ 能)**: Chữ 能 (NĂNG) gồm có bộ **月** (Nguyệt/Nhục - Bên trái), bộ **厶** (Tư - Giữa trên) và 2 bộ **匕** (Chủy - Bên phải). Thuật toán cũ chỉ nhận diện được 1 bộ đại diện (月), thiếu mất các bộ bên phải.
- **Thuật toán nâng cấp (Multi-Radical Extractor)**:
  1. Xây dựng cơ sở dữ liệu bóc tách đa thành phần chuẩn hóa (`FULL_KANJI_DECOMPOSITIONS`) phủ toàn bộ từ vựng JLPT N5, N4, N3, N2, N1.
  2. Tích hợp bộ bóc tách KanjiVG Sub-element: đọc các thẻ `<g kvg:element="...">` và `<g kvg:original="...">` từ mã nguồn SVG KanjiVG để tự động trích xuất tất cả các bộ thủ bên trái, bên phải, trên, dưới, bao quanh của bất kỳ chữ Kanji nào.
- **Mẹo nhớ thông minh tự động (Auto-Generated Mnemonic)**: Tự động ghép nối ý nghĩa tất cả các bộ thủ bóc tách thành một câu chuyện hoàn chỉnh, hỗ trợ sửa đổi theo sở thích cá nhân.

---

## 1. Overview & Core Concept

- **Mục tiêu**: Bóc tách chính xác 100% tất cả các bộ thủ cấu thành nên một chữ Kanji (dù chữ đó có 2, 3, 4 hay 5+ bộ thủ nhỏ kết hợp).
- **Ví dụ phân tách thực tế**:
  - **能 (NĂNG)** ➔ **月** (Nguyệt/Nhục - Trái) + **厶** (Tư - Giữa) + **匕** (Chủy - Trên phải) + **匕** (Chủy - Dưới phải).
  - **語 (NGỮ)** ➔ **言** (Ngôn - Trái) + **五** (Ngũ - Trên) + **口** (Khẩu - Dưới).
  - **働 (ĐỘNG)** ➔ **亻** (Nhân - Trái) + **重** (Trọng - Giữa) + **力** (Lực - Phải).
  - **愛 (ÁI)** ➔ **爪** (Trảo - Trên) + **冖** (Mịch - Giữa) + **心** (Tâm - Trung tâm) + **夂** (Truy - Dưới).

---

## 2. User Experience & Visual Design

### A. Dynamic Tree Layout cho Kanji nhiều nét

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   SƠ ĐỒ BÓC TÁCH ĐẦY ĐỦ CHO CHỮ 能 (NĂNG)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                [Chữ Kanji: 能]                              │
│                                       │                                     │
│         ┌─────────────────┬───────────┴───────────┬─────────────────┐       │
│         ▼                 ▼                       ▼                 ▼       │
│   ┌───────────┐     ┌───────────┐           ┌───────────┐     ┌───────────┐ │
│   │ 月 (NGUYỆT)│     │ 厶 (TƯ)   │           │ 匕 (CHỦY) │     │ 匕 (CHỦY) │ │
│   │ Bên trái  │     │ Giữa trên │           │ Trên phải │     │ Dưới phải │ │
│   │ 4 nét     │     │ 2 nét     │           │ 2 nét     │     │ 2 nét     │ │
│   └───────────┘     └───────────┘           └───────────┘     └───────────┘ │
│                                                                             │
│  💡 Mẹo nhớ:                                                               │
│  "Dùng sức mạnh cơ thể (thịt 月) gạt bỏ tư lợi (厶), cầm 2 cái thìa (匕 匕) │
│   thể hiện NĂNG LỰC (能) thực sự."                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### B. Cải tiến giao diện Sơ đồ cây (KanjiRadicalTree)
- Tự động căn chỉnh khoảng cách các node khi Kanji có 3, 4 hoặc 5 bộ thủ cấu thành.
- Mỗi node hiển thị rõ ràng: Ký tự bộ thủ, Tên Hán Việt, Số nét, Vị trí (Trái, Phải, Trên, Dưới, Trong, Ngoài) và Ý nghĩa ngắn gọn.

---

## 3. Technical Architecture & Implementation Strategy

### A. KanjiVG SVG Sub-element Parser
Đọc trực tiếp dữ liệu SVG KanjiVG để bóc tách các nguyên tố chữ Hán mà không phụ thuộc vào từ điển tĩnh:

```typescript
// Trích xuất các element từ thẻ g của KanjiVG SVG
export function parseKanjiVGSubElements(svgContent: string): RadicalComponent[] {
  // Parse <g kvg:element="月" kvg:position="left">...
  // Parse <g kvg:element="厶" kvg:position="top">...
  // Parse <g kvg:element="匕" kvg:position="right">...
}
```

### B. Mở rộng cơ sở dữ liệu `FULL_KANJI_DECOMPOSITIONS`
Cập nhật dữ liệu phân tách đa thành phần chuẩn xác cho hàng trăm Kanji thông dụng trong chương trình học JLPT.

---

## Plan Implementation Steps

1. **Cập nhật `src/data/radicalsData.ts`**: Thêm bộ phân tách đa thành phần cho chữ 能, 警, 躍, 鬱, 語, 働, 話, 読, 試, 験, 学, 校, 食, 飲, 男, 女, 愛, 思, 想, 朝, 電, 車, 家, 國... và nâng cấp hàm `getKanjiDecomposition`.
2. **Xây dựng `src/utils/kanjiSubElementParser.ts`**: Bộ bóc tách tự động KanjiVG Sub-Elements từ file SVG.
3. **Nâng cấp `KanjiRadicalTree.tsx`**: Hỗ trợ hiển thị từ 2 đến 6 node con mượt mà, căn chỉnh connector lines chuẩn xác.
4. **Cập nhật `MnemonicStoryCard.tsx`**: Tự động sinh mẹo nhớ thông minh từ tất cả các bộ thủ được bóc tách.
5. **Kiểm tra build & linting**: Chạy `lint_applet` và `compile_applet` xác minh không lỗi.
