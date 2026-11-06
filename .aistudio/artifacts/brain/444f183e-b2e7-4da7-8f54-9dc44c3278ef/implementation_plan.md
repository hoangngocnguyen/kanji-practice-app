# Kiết cấu Đa trang (Multi-View Architecture) & Tối ưu hóa Trải nghiệm Luyện Kanji Pro

Tái cấu trúc ứng dụng Luyện Kanji từ mô hình "1 trang cuộn dài (single scroll page)" thành **hệ thống đa trang (Multi-View Routing/Tab Architecture)** chuẩn React. Mỗi tab sidebar hoạt động như 1 trang view độc lập chuyên biệt, bổ sung **Trang Tra cứu & Tìm kiếm Kanji nâng cao**, loại bỏ tình trạng cuộn trang cồng kềnh và tối ưu hóa vị trí khung nhập liệu.

> [!IMPORTANT]
> **Tóm tắt các quyết định đã được xác nhận bởi người dùng (Phase 1):**
> 1. **Kiến trúc Đa trang View**: Mỗi tab sidebar là một trang view riêng biệt (`Nét viết Kanji`, `Phiên âm Romaji`, `Dịch câu song ngữ`, `Tra cứu & Tìm kiếm`, `214 Bộ thủ`, `Lịch sử tra cứu`).
> 2. **Trang Tra cứu & Tìm kiếm mới**: Hỗ trợ bộ lọc đa năng theo Từ khóa, Romaji, Hán-Việt, Bộ thủ, Số nét và Cấp độ JLPT (N5 - N1).
> 3. **Bố trí Khung nhập liệu Tối ưu**: Đưa khung nhập liệu chi tiết cùng các công cụ đọc/chuyển đổi vào trang chuyên dụng, các trang khác sử dụng Toolbar hoặc Thanh gõ nhanh/Quét ảnh thu gọn trên Header.

---

## 1. Overview & Core Concept

- **Mục tiêu**: Nâng cấp toàn diện ứng dụng Luyện Kanji Pro lên trải nghiệm SaaS học tập hiện đại. Người dùng có thể chuyển đổi mượt mà giữa các trang view chuyên biệt mà không bị vướng bởi một ô nhập liệu dài cố định luôn chiếm không gian ở mọi trang.
- **Đối tượng**: Học viên tiếng Nhật ở mọi cấp độ (JLPT N5 – N1), giáo viên, dịch thuật viên cần tra cứu nét vẽ vector KanjiVG, đọc phiên âm Romaji Hepburn, dịch câu song ngữ hoặc tra bộ thủ Khang Hy.
- **Giá trị cốt lõi**: Phân tách vai trò rõ ràng giữa các trang view, mở rộng không gian hiển thị danh sách nét vẽ & thẻ học, cung cấp công cụ tìm kiếm chuẩn từ điển chuyên sâu.

---

## 2. User Experience & Visual Design

### Key User Flows by Page View

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 HEADER (Thanh điều hướng top)                          │
├──────────────┬─────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR      │ MAIN VIEWPORT (Đổi linh hoạt theo tab được chọn)                       │
│ (Co giãn     │                                                                         │
│  260px/68px) │ 1. View Nét viết Kanji: Bảng nét SVG, hoạt ảnh stroke order, thẻ học    │
│              │ 2. View Phiên âm Romaji: Đoạn văn song ngữ, chuyển đổi Kana/Romaji       │
│              │ 3. View Dịch câu song ngữ: Khung dịch AI (Google / Gemini), chép kết quả│
│              │ 4. View Tra cứu & Tìm kiếm: Tìm theo Kanji, Hán-Việt, JLPT, Bộ thủ, Số nét│
│              │ 5. View 214 Bộ thủ Khang Hy: Khám phá cây cấu trúc chữ Hán               │
│              │ 6. View Lịch sử tra cứu: Các chữ Kanji đã xem gần đây                   │
└──────────────┴─────────────────────────────────────────────────────────────────────────┘
```

1. **Trang 1: Nét viết Kanji (Kanji Stroke Order View)**
   - Hiển thị danh sách chữ Kanji được lọc từ đoạn văn hoặc thêm trực tiếp.
   - Tập trung không gian hiển thị bảng nét SVG vector, nút hoạt ảnh viết từng nét, tùy chọn Grid/Furigana/Anki CSV export mà không bị che bởi khung nhập liệu khổng lồ.
   - Có công cụ gõ/dán chữ nhanh (Quick Add Bar) nhỏ gọn ở trên đầu.

2. **Trang 2: Phiên âm Romaji (Romaji Transliteration View)**
   - Chuyên biệt cho việc đọc hiểu đoạn văn tiếng Nhật.
   - Hiển thị bản dịch phiên âm Romaji chuẩn Hepburn từng dòng/từng câu, công cụ chuyển đổi Hiragana/Katakana linh hoạt, chỉnh cỡ chữ đọc (sm, md, lg, xl).

3. **Trang 3: Dịch câu song ngữ (Bilingual Sentence Translation View)**
   - Chuyên biệt cho dịch thuật với 2 Engine (Google Dịch siêu tốc 150ms & Gemini AI phân tích ngữ cảnh).
   - So sánh câu gốc tiếng Nhật và bản dịch tiếng Việt, nút copy kết quả 1-click.

4. **Trang 4: Tra cứu & Tìm kiếm Kanji (Kanji Search & Lookup View - MỚI)**
   - Ô tìm kiếm thông minh hỗ trợ gõ Romaji (IME), Hán-Việt, âm On/Kun.
   - Bộ lọc đa tiêu chí: Cấp độ JLPT (N5, N4, N3, N2, N1), Số nét (1 - 30+ nét), Bộ thủ liên quan.
   - Hiển thị dạng Bảng chi tiết (Table) hoặc Thẻ chữ (Grid).

5. **Trang 5: 214 Bộ thủ Khang Hy (Kangxi Radicals Explorer View)**
   - Giao diện tra cứu 214 bộ thủ theo số nét, xem ý nghĩa tiếng Việt và các Kanji chứa bộ thủ đó.

---

## 3. Key Product Decisions & Trade-Offs

- **Quyết định 1: Phân tách View theo State thay vì Router URL phức tạp**
  - *Lựa chọn*: Sử dụng React state `activeTab` để render các component view chuyên biệt (`KanjiStrokesView`, `RomajiReaderView`, `TranslationView`, `SearchView`, `RadicalsView`, `HistoryView`).
  - *Lý do*: Đảm bảo trạng thái dữ liệu (đoạn văn đang nhập, kết quả dịch, lịch sử tra cứu) được giữ đồng bộ liên tục khi người dùng chuyển đổi qua lại giữa các trang mà không bị re-render mất dữ liệu.

- **Quyết định 2: Đưa Khung nhập liệu cồng kềnh vào Trang chuyên dụng & Quick Bar trên Header**
  - *Lựa chọn*: Tạo component `InputWorkspaceView` cho thao tác soạn thảo/dán văn bản dài/quét OCR từ ảnh. Các trang xem nét vẽ hoặc tìm kiếm sẽ có Quick Input Bar thu gọn ở top toolbar.
  - *Lý do*: Giúp người dùng tập trung vào tác vụ hiện tại (ví dụ: đang tập viết nét Kanji thì không cần ô dán văn bản chiếm nửa màn hình).

---

## 4. Technical Architecture & Data Strategy

```
                          ┌───────────────────────────┐
                          │         App.tsx           │
                          │ (Global State & ActiveView)│
                          └─────────────┬─────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
┌─────────────────────┐      ┌────────────────────┐       ┌────────────────────┐
│     AppSidebar      │      │       Header       │       │  View Controller   │
│ (Nav items & Badges)│      │ (Quick Search Bar) │       │ (Conditional View) │
└─────────────────────┘      └────────────────────┘       └──────────┬─────────┘
                                                                     │
     ┌──────────────────┬─────────────────┬──────────────────┬───────┴──────────┬─────────────────┐
     ▼                  ▼                 ▼                  ▼                  ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│  KanjiStrokes│ │ RomajiReader │ │ Translation  │ │   KanjiSearch    │ │ RadicalsView │ │ HistoryView  │
│     View     │ │     View     │ │     View     │ │      View        │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘ └──────────────┘ └──────────────┘
```

### Component & State Mapping

1. **`App.tsx`**: Quản lý global state (`activeTab`, `inputText`, `recentlyViewed`, `kanjiList`, `isSidebarCollapsed`).
2. **`KanjiSearchView.tsx` (Component Mới)**: Trang tìm kiếm Kanji chuyên dụng với bộ lọc JLPT / Số nét / Từ khóa.
3. **`KanjiStrokesView.tsx`**: Giao diện bảng nét Kanji gọn gàng, tập trung xem hoạt ảnh SVG vector & tập viết.
4. **`RomajiReaderView.tsx`**: Giao diện chuyên đọc phiên âm Romaji Hepburn & chuyển đổi chữ mềm/chữ cứng.
5. **`TranslationView.tsx`**: Giao diện chuyên dịch thuật với Google Dịch & Gemini AI.
6. **`Footer.tsx`**: Giữ ở đáy layout chính, thiết kế tone-on-tone đồng nhất với giao diện.

---

## 5. Implementation Steps & Verification Plan

1. **Bước 1**: Tạo component `KanjiSearchView.tsx` hỗ trợ lọc theo Từ khóa, Hán-Việt, JLPT N1-N5, số nét và bộ thủ.
2. **Bước 2**: Tách biệt và tái cấu trúc các View component trong `src/components/views/`:
   - `KanjiStrokesView.tsx`
   - `RomajiReaderView.tsx`
   - `TranslationView.tsx`
   - `KanjiSearchView.tsx`
3. **Bước 3**: Cập nhật `AppSidebar.tsx` bổ sung tab "Tra cứu & Tìm kiếm" (`search`) vào danh sách điều hướng.
4. **Bước 4**: Cập nhật `App.tsx` render chính xác trang View tương ứng theo `activeTab`, tối ưu hóa giao diện tràn lề 2 bên (full-width container).
5. **Bước 5**: Kiểm tra build với `compile_applet` và `lint_applet` để đảm bảo 0 lỗi TypeScript/Syntax.
