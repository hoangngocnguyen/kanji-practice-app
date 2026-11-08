# Kế hoạch Tái cấu trúc Hệ thống Route React Router & Tinh gọn Giao diện Luyện Kanji

Tái cấu trúc ứng dụng sang mô hình đa trang chuẩn với **React Router DOM** (`react-router-dom`), phân tách các tính năng thành các route độc lập (F5 không mất trang), dọn dẹp triệt để các thành phần trùng lặp ở Header/Sidebar, loại bỏ banner extension và các mô tả/mẫu có sẵn thừa thãi, xây dựng trang Chuyển đổi Romaji có chức năng Hoàn tác (Undo/Redo), và nâng cấp Lịch sử tra cứu không giới hạn có hiển thị bảng nét vẽ đầy đủ.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Các quyết định then chốt đã được thống nhất:

- **Routing chuẩn React Router DOM**: Sử dụng `react-router-dom` (với `BrowserRouter`, `<Routes>`, `<Route>`, `<NavLink>`). Mỗi tính năng có route URL riêng biệt (ví dụ: `/`, `/kanji`, `/romaji`, `/translate`, `/converter`, `/radicals`, `/history`, `/guide`), tải lại trang (F5) giữ nguyên trạng thái.
- **Header tinh giản & Trực quan**: Loại bỏ việc lặp lại thương hiệu "Luyện Kanji" ở Header khi Sidebar đã có logo/tên app. Header sẽ hiển thị **Tên tính năng/Trang hiện tại** (như "Nhập văn bản", "Phiên âm Romaji", "Lịch sử tra cứu") giúp người dùng định vị chính xác vị trí đang đứng.
- **Tách riêng trang Chuyển đổi Romaji (`/converter`)**: Chuyển đổi Romaji sang Hiragana/Katakana không còn chèn ép vào ô nhập văn bản chính; chuyển thành 1 trang chuyên biệt với 2 khung Input - Output và **nút Hoàn tác (Undo / Redo)** nhiều bước.
- **Độc lập tính năng, không lồng ghép chéo**: Trang Phiên âm Romaji chỉ tập trung hiển thị câu phiên âm xen dòng; trang Dịch câu chỉ tập trung dịch thuật song ngữ; không chèn lẫn nút của tính năng khác vào nhau.
- **Loại bỏ Banner Extension & Mẫu rác**: Gỡ bỏ hoàn toàn Banner Chrome Extension ở chân trang; xóa bỏ các nút "Mẫu có sẵn" (Tục ngữ, Thành ngữ, JLPT) ở ô nhập liệu và modal quét OCR để giao diện sạch sẽ, tối giản.
- **Nâng cấp Lịch sử tra cứu (`/history`)**: Bỏ giới hạn 25 từ, cho phép lưu trữ không giới hạn; lưu trữ toàn bộ dữ liệu chi tiết của Kanji vào LocalStorage để lần sau truy cập không cần gọi lại API; tái sử dụng trực tiếp các thành phần `KanjiTable`, `KanjiGrid`, `KanjiQuickBar` như bên trang Nét viết Kanji.
- **Lược bỏ Toast phiền hà**: Xóa các thông báo toast thừa thãi khi thực hiện các thao tác nhập liệu thông thường.
- **Cập nhật tài liệu**: Đồng bộ toàn bộ kiến trúc mới vào `README.md`.

---

## 1. Overview & Core Concept

- **Mục tiêu**: Nâng cấp ứng dụng từ dạng SPA đơn trang ẩn/hiện điều kiện sang hệ thống Route trang chuẩn mực, mạch lạc, dễ sử dụng, chuyên nghiệp và tải nhanh.
- **Kiến trúc Route dự kiến**:
  - `/` hoặc `/input`: **Nhập văn bản** (Giao diện nhập liệu tối giản, sạch, không mô tả thừa, hỗ trợ IME).
  - `/kanji`: **Nét viết Kanji** (Thanh chọn nhanh Kanji Quick Bar, Bảng nét vẽ SVG động, Thẻ lưới, Luyện viết).
  - `/romaji`: **Phiên âm Romaji** (Hiển thị văn bản kèm phiên âm Romaji Hepburn xen dòng chi tiết).
  - `/translate`: **Dịch câu song ngữ** (Hộp dịch song ngữ tiếng Nhật sang Tiếng Việt bằng Gemini AI & Google Dịch).
  - `/converter`: **Chuyển đổi Romaji ⇄ Kana** (Trang chuyển đổi chữ Latinh sang Hiragana/Katakana có ngăn Input/Output và nút Hoàn tác Undo/Redo).
  - `/radicals`: **214 Bộ thủ Khang Hy** (Trang tra cứu bộ thủ và cấu trúc chữ Hán).
  - `/history`: **Lịch sử tra cứu** (Kho lưu trữ Kanji đã xem không giới hạn, lưu offline không cần gọi API, xem bảng nét vẽ & luyện viết tương tự trang chính).
  - `/guide`: **Hướng dẫn sử dụng** (Cẩm nang sử dụng ứng dụng).

---

## 2. User Experience & Visual Design

### 2.1. Thanh Header & Sidebar đồng bộ
- **Sidebar**:
  - Logo và tên thương hiệu "Luyện Kanji Pro" đặt cố định trên đầu Sidebar.
  - Menu điều hướng với các liên kết route rõ ràng (`NavLink` tự động active theo URL hiện tại).
  - Badge số lượng chữ Kanji chỉ hiển thị duy nhất 1 lần bên cạnh mục "Nét viết Kanji" (không hiển thị tràn lan ở Header).
  - Dưới cùng chỉ gồm các tiện ích cần thiết: In trang tập viết, Hướng dẫn sử dụng, Cài đặt ứng dụng.
- **Header**:
  - Bỏ tên web "Luyện Kanji" bị trùng.
  - Hiển thị **Tiêu đề trang hiện tại** (ví dụ: `Trang chủ · Nhập văn bản`, `Nét viết Kanji (24 chữ)`, `Chuyển đổi Romaji`).
  - Nút In tập viết và Cài đặt ở góc phải với layout thoáng đãng, không bị chật chội trên tablet/mobile.

### 2.2. Tinh gọn ô Nhập văn bản (`/input`)
- Bỏ dòng mô tả dài dòng: *"Tự động lọc Kanji, phiên âm Hiragana, dịch nghĩa từng chữ..."*.
- Bỏ hàng nút *"Mẫu có sẵn: Tục ngữ & Danh ngôn, Thành ngữ Yojijukugo..."*.
- Khung `textarea` được thiết kế lại: bo góc mềm mại, viền trung tính, padding rộng rãi, hỗ trợ bộ gõ IME trực quan.
- Nút bấm hành động gồm: Chọn ảnh/Dán ảnh, Xóa trắng, và nút "Xem nét viết Kanji" chuyển ngay sang trang `/kanji`.

### 2.3. Trang Chuyển đổi Romaji có Hoàn tác (`/converter`)
- Bố cục 2 cột (hoặc xếp chồng trên mobile):
  - Cột trái: Ô nhập Romaji (hỗ trợ nhập văn bản có chữ Latinh).
  - Cột phải: Ô kết quả Hiragana / Katakana tương ứng.
- Thanh công cụ thao tác:
  - Nút **Đổi sang Hiragana (あ)**.
  - Nút **Đổi sang Katakana (ア)**.
  - Nút **Hoàn tác (Undo)**: Quay lại trạng thái trước khi chuyển đổi.
  - Nút **Làm lại (Redo)**.
  - Nút **Sao chép kết quả** & **Áp dụng vào ô nhập chính**.

### 2.4. Trang Lịch sử tra cứu nâng cấp (`/history`)
- Không giới hạn 25 từ (hỗ trợ lưu hàng trăm từ trong `localStorage`).
- Cấu trúc dữ liệu lưu trữ gồm cả `detail` (Hán-Việt, On, Kun, nghĩa, số nét) và `svgUrl` để khi mở lại không cần gửi bất kỳ request API nào.
- Giao diện có:
  - Thanh chọn nhanh Kanji Quick Bar ở đầu trang.
  - Chuyển đổi chế độ xem **Bảng (Table)** và **Thẻ (Grid)** tái sử dụng trực tiếp `KanjiTable` và `KanjiGrid`.
  - Nút Xóa lịch sử và Xuất dữ liệu đã lưu.

---

## 3. Key Product Decisions & Trade-Offs

- **Quyết định 1: Cài đặt `react-router-dom` chính thức**:
  - *Lựa chọn*: Cài đặt gói `react-router-dom` để xử lý định tuyến SPA.
  - *Lý do*: Đáp ứng đúng yêu cầu của người dùng ("đường dẫn là react router page cơ, chứ không phải đường dẫn kiểu cho html"), quản lý history state, deep linking, và URL sạch chuẩn SEO.
- **Quyết định 2: Quản lý State chung (Văn bản & Kanji List)**:
  - *Lựa chọn*: Tạo một React Context (`KanjiContext`) hoặc nâng state chung lên cấp độ Router Layout bọc quanh các Route.
  - *Lý do*: Giúp văn bản nhập vào ở trang `/input` được chia sẻ liền mạch sang trang `/kanji`, `/romaji`, `/translate` mà không bị mất dữ liệu khi người dùng chuyển qua lại giữa các trang.
- **Quyết định 3: Gỡ bỏ Extension Exporter Banner**:
  - *Lựa chọn*: Bỏ hoàn toàn component `<ExtensionExporter />` khỏi luồng hiển thị chính.
  - *Lý do*: Theo yêu cầu người dùng, banner này hiện không còn cần thiết và làm rối chân trang.
- **Quyết định 4: Loại bỏ Toast thừa thãi**:
  - *Lựa chọn*: Tắt bỏ các lệnh gọi toast không cần thiết khi thao tác thông thường (nhập chữ, đổi tab, chuyển chế độ). Chỉ giữ toast cho những hành động quan trọng như lỗi mạng hoặc sao chép.

---

## 4. Technical Architecture & Data Strategy

### 4.1. Sơ đồ Kiến trúc Định tuyến React Router (System Architecture Diagram)

```
                              ┌────────────────────────────────────────┐
                              │             BrowserRouter              │
                              └───────────────────┬────────────────────┘
                                                  │
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │             KanjiProvider              │
                              │  (inputText, kanjiList, history, etc.) │
                              └───────────────────┬────────────────────┘
                                                  │
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │              AppLayout                 │
                              │  ┌─────────────┐   ┌────────────────┐  │
                              │  │ AppSidebar  │   │     Header     │  │
                              │  │ (NavLinks)  │   │ (Current Page) │  │
                              │  └─────────────┘   └────────────────┘  │
                              │  ┌──────────────────────────────────┐  │
                              │  │             <Outlet />           │  │
                              │  └──────────────────────────────────┘  │
                              └───────────────────┬────────────────────┘
                                                  │
         ┌───────────────┬────────────────┬───────┴────────┬───────────────┬───────────────┐
         ▼               ▼                ▼                ▼               ▼               ▼
   ┌───────────┐   ┌───────────┐    ┌───────────┐    ┌───────────┐   ┌───────────┐   ┌───────────┐
   │  /input   │   │  /kanji   │    │  /romaji  │    │/translate │   │/converter │   │ /history  │
   │Nhập liệu  │   │Bảng nét & │    │Phiên âm   │    │Dịch thuật │   │Chuyển Kana│   │Bảng nét & │
   │tối giản   │   │Luyện viết │    │Romaji độc │    │độc lập    │   │có Undo    │   │Offline db │
   │           │   │           │    │lập        │    │           │   │           │   │           │
   └───────────┘   └───────────┘    └───────────┘    └───────────┘   └───────────┘   └───────────┘
```

### 4.2. Danh sách các bước triển khai chi tiết:

1. **Cài đặt thư viện**:
   - Chạy lệnh cài đặt `react-router-dom` qua `install_applet_package`.
2. **Khởi tạo KanjiContext (`src/context/KanjiContext.tsx`)**:
   - Quản lý `inputText`, `extractedKanjiList`, `mergedKanjiList`, `recentlyViewedHistory` (với full cached detail), `settings`, và các action cập nhật.
3. **Tách và hoàn thiện các View độc lập**:
   - `InputSection.tsx` -> Trang `/` & `/input`: Dọn sạch mô tả, xóa các nút mẫu có sẵn, chỉ giữ ô nhập liệu tinh gọn, bộ gõ IME và nút chuyển sang xem nét.
   - `KanjiStrokesView.tsx` -> Trang `/kanji`: Chứa sticky toolbar, KanjiQuickBar, KanjiTable, KanjiGrid và PracticeModal.
   - `RomajiReaderView.tsx` -> Trang `/romaji`: Chỉ hiển thị văn bản kèm phiên âm Romaji xen dòng, nút sao chép Romaji, không lồng ghép nút dịch.
   - `TranslationView.tsx` -> Trang `/translate`: Giao diện dịch song ngữ chuyên sâu (Gemini AI + Google Translate), phát âm audio TTS.
   - `RomajiConverterView.tsx` -> Trang `/converter`: Trang mới độc lập chuyển đổi Latinh sang Hiragana/Katakana với ngăn Input/Output, phím chuyển đổi và lịch sử Undo/Redo hoàn tác.
   - `RecentlyViewedKanji.tsx` -> Trang `/history`: Lưu trữ không giới hạn, lưu kèm toàn bộ dữ liệu Kanji offline, tái sử dụng `KanjiQuickBar` + `KanjiTable` / `KanjiGrid`.
   - `UserGuideView.tsx` -> Trang `/guide`.
   - `RadicalExplorer.tsx` -> Trang `/radicals`.
4. **Cập nhật Header & Sidebar**:
   - Sidebar: Dùng `NavLink` của `react-router-dom`, cập nhật danh sách menu có thêm mục "Chuyển đổi Romaji", xóa các mục trùng lặp.
   - Header: Lấy tiêu đề từ route hiện tại (`useLocation()`), hiển thị tên tính năng thay cho tên web bị trùng lặp.
5. **Gỡ bỏ Extension Exporter và các Toast phiền hà**:
   - Xóa `ExtensionExporter` khỏi giao diện.
   - Lọc bỏ các lời gọi toast không cần thiết.
6. **Xác minh & Cập nhật README**:
   - Chạy `compile_applet` và `lint_applet` đảm bảo 0 lỗi.
   - Cập nhật tài liệu `README.md` mô tả cấu trúc route mới và các tính năng đã được tinh gọn.
