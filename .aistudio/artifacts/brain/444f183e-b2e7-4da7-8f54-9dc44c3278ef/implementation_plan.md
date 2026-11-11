# Hệ Thống Ôn Tập Kanji Theo Thư Mục, Flashcard & SRS Chuẩn Anki

Nâng cấp nền tảng Luyện Kanji với phân hệ **Ôn tập theo bài & thư mục phân cấp**, **Flashcard kép (Kanji & Từ ghép)** kết hợp **thuật toán lặp lại ngắt quãng (SRS)** 3 mức (Khó / Tốt / Dễ), hỗ trợ **xuất/nhập tệp JSON** và **đồng bộ, chia sẻ thư mục cộng đồng qua Supabase** theo kiến trúc Offline-first.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Các quyết định cốt lõi đã được thống nhất và sẽ làm kim chỉ nam cho quá trình triển khai:

- **Kiến trúc lưu trữ Offline-first + Supabase**: Toàn bộ dữ liệu thư mục, từ vựng và tiến độ ôn tập hoạt động mượt mà ngoại tuyến qua `localStorage` mà không bắt buộc đăng nhập; tự động mở khóa tính năng đăng nhập, đồng bộ đám mây và chia sẻ link cộng đồng khi phát hiện cấu hình Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- **Cơ chế Flashcard kép (Dual-Card Deck)**:
  - *Thẻ Kanji*: Mặt trước hiển thị chữ Kanji đứng độc lập; Mặt sau hiển thị âm Hán-Việt, On/Kun, ý nghĩa, bộ thủ và hoạt ảnh thứ tự nét vẽ.
  - *Thẻ Từ ghép*: Mỗi từ ghép nhập vào bảng Kanji tự động sinh ra một thẻ ôn tập độc lập (Mặt trước: Từ ghép Kanji; Mặt sau: Cách đọc Kana/Romaji + âm Hán-Việt + Nghĩa tiếng Việt).
- **Thuật toán lặp lại ngắt quãng (SRS) chuẩn Anki tùy chỉnh**: 3 mức đánh giá **Khó** (mặc định 10 phút), **Tốt** (mặc định 1 ngày), **Dễ** (mặc định 4 ngày) với hệ số nhân Ease Factor tăng dần theo từng lần ôn và cho phép người dùng tùy chỉnh mốc thời gian.
- **Định dạng Xuất/Nhập tệp**: Sử dụng định dạng **JSON (`.json`)** chuẩn hóa, bảo toàn toàn bộ cây thư mục cha–con, bảng Kanji, danh sách từ ghép và siêu dữ liệu (kèm tùy chọn giữ hoặc đặt lại tiến độ SRS khi bạn bè import).

---

### 1. Overview & Core Concept

- **What It Does**: Cung cấp một không gian học tập có cấu trúc bài bản ngay trong ứng dụng: người học tự tổ chức cây thư mục theo giáo trình/chủ đề (ví dụ: *Minna no Nihongo → Bài 1, Bài 2* hoặc *JLPT N3 → Tuần 1*), nhập danh sách Kanji để tạo bảng học, thêm từ ghép cho từng chữ, rồi ôn tập tập trung từng bài hoặc ôn gộp toàn bộ thư mục cha thông qua Flashcard SRS.
- **Target Audience / Persona**: Người học tiếng Nhật tự học hoặc theo lớp giáo trình muốn tự xây dựng bộ thẻ bài học cá nhân, ghi nhớ cả mặt chữ Kanji lẫn từ vựng ghép đi kèm, và chia sẻ bộ bài với bạn bè hoặc cộng đồng.
- **Key Value**: Chuyển từ tra cứu đơn lẻ sang **quy trình khép kín (Tổ chức bài học → Học bảng Kanji & Từ ghép → Ôn tập SRS dài hạn → Chia sẻ)**, không lo mất dữ liệu khi offline và sẵn sàng mở rộng đa thiết bị khi kết nối Supabase.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Quản lý cây thư mục & Bài học (`/decks` - Ôn tập Kanji)**:
     - Cột trái hiển thị cây thư mục phân cấp (tạo thư mục gốc/thư mục con, đổi tên, xóa, xem số thẻ đến hạn ôn `due count`).
     - Nhấp vào bất kỳ thư mục nào: nếu là thư mục cha, hệ thống tự động gom toàn bộ Kanji và từ ghép của các thư mục con bên trong để thống kê và ôn tập gộp.
     - Vùng chính hiển thị **Bảng Kanji của bài**: cho phép dán/nhập nhanh danh sách Kanji (tự động trích xuất và điền sẵn Hán-Việt, On/Kun, nghĩa, số nét từ từ điển sẵn có), bấm vào từng dòng Kanji để thêm/sửa/xóa các **Từ ghép** (Từ vựng, Hiragana, Hán-Việt, Nghĩa).
  2. **Phiên ôn tập Flashcard SRS**:
     - Nút **Ôn tập ngay** mở giao diện tập trung (Split/Stage layout): thanh tiến độ phía trên (`Số thẻ còn lại / Tổng thẻ đến hạn`), bộ lọc chế độ ôn (*Ôn cả Kanji & Từ ghép*, *Chỉ Kanji*, hoặc *Chỉ Từ ghép*).
     - Hiệu ứng lật thẻ 3D mượt mà (`transform` + `opacity` ≤ 200ms); nút nghe phát âm tiếng Nhật trực tiếp trên thẻ.
     - Sau khi lật mặt sau, 3 nút đánh giá **Khó / Tốt / Dễ** hiển thị chính xác thời gian hẹn ôn lại tiếp theo (ví dụ: `10 phút`, `1 ngày`, `4 ngày`).
     - Màn hình tổng kết sau khi hoàn thành phiên ôn (số thẻ đã thuộc, thời gian ôn tiếp theo).
  3. **Xuất / Nhập File JSON & Chia sẻ Cộng đồng**:
     - Nút **Xuất File (.json)** trên từng thư mục để tải xuống trọn vẹn thư mục đó (bao gồm mọi thư mục con bên trong).
     - Nút **Nhập File (.json)** cho phép kéo-thả hoặc chọn tệp để import thành thư mục mới hoặc gộp vào thư mục hiện có, kèm hộp thoại xem trước nội dung trước khi lưu.
     - Khi cấu hình Supabase sẵn sàng: có thêm mục **Tài khoản & Đồng bộ** và nút **Chia sẻ công khai** tạo mã/đường dẫn chia sẻ (ví dụ `/share/:slug`) để người khác xem trước, ôn tập thử ngay hoặc **Lưu bản sao về thư mục cá nhân**.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Kế thừa phong cách sáng sủa, tinh gọn, tập trung vào việc đọc và ghi nhớ của ứng dụng Luyện Kanji hiện tại (Editorial Educational Workspace).
  - *Color Palette & Mood*: Tuân thủ tỷ lệ **60-30-10**: 60% nền trắng/xám nhạt trung tính (`--background: #F8FAFC`), 30% bề mặt thẻ trắng sạch với đường viền mảnh (`1px solid #E2E8F0`), 10% màu nhấn chủ đạo **Teal (`#0F766E`)** cho hành động chính; sử dụng màu ngữ nghĩa đi kèm nhãn chữ rõ ràng cho 3 mức SRS: **Khó** (Coral/Rose `#DC2626` + nhãn), **Tốt** (Azure/Blue `#0284C7` + nhãn), **Dễ** (Emerald `#059669` + nhãn).
  - *Typography & Hierarchy*: Giữ cặp font hiện tại của dự án cho chữ Latinh và font Kanji sắc nét cho mặt trước Flashcard (cỡ chữ lớn `clamp(3rem, 6vw, 4.5rem)`), số đếm thẻ và khoảng thời gian sử dụng `tabular-nums` để căn thẳng hàng.
  - *Component Styling & Layout*: Bố cục 2 vùng rõ ràng trên màn hình desktop (Sidebar cây thư mục 30% + Vùng bảng Kanji / Sân khấu Flashcard 70%), tránh lồng thẻ trong thẻ quá 1 cấp, dùng khoảng trắng và đường kẻ mảnh thay vì viền trái dày.

- **Interactive Feedback & Motion**:
  - Hiệu ứng lật thẻ 3D CSS `rotateY(180deg)` mượt mà, hỗ trợ phím tắt bàn phím (`Space` để lật thẻ, `1 / 2 / 3` cho Khó / Tốt / Dễ).
  - Trạng thái rỗng (Empty State) rõ ràng khi thư mục chưa có Kanji hoặc khi đã hoàn thành hết thẻ cần ôn trong ngày (kèm nút "Ôn tập lại tất cả" nếu muốn luyện thêm).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Kiến trúc lưu trữ Offline-first kết hợp đồng bộ Supabase tùy chọn**
  - *Chosen Approach*: Lưu trữ cục bộ toàn bộ cây thư mục, bảng Kanji, từ ghép và trạng thái SRS trong `localStorage` qua một tầng dịch vụ trừu tượng (`StorageAdapter`), đồng thời cung cấp `SupabaseSyncAdapter` kích hoạt tự động khi có biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
  - *Why*: Người dùng có thể sử dụng ngay lập tức mọi tính năng tạo bài, học, ôn tập và xuất/nhập JSON mà không gặp rào cản đăng nhập hay lỗi khi chưa cấu hình DB; khi triển khai Supabase, chỉ cần điền `.env` là mở khóa Auth, đồng bộ đa thiết bị và kho chia sẻ cộng đồng an toàn qua Row Level Security (RLS).
  - *Alternatives Considered*: Bắt buộc kết nối server/Supabase ngay từ đầu — bị loại vì làm gián đoạn trải nghiệm dùng thử ngoại tuyến.

- **Decision 2: Tách biệt lịch trình SRS cho Thẻ Kanji và từng Thẻ Từ ghép**
  - *Chosen Approach*: Mỗi chữ Kanji trong bài có trạng thái SRS riêng, và mỗi từ ghép gắn với Kanji đó cũng là một thẻ ôn độc lập với lịch trình SRS riêng.
  - *Why*: Người học có thể nhớ mặt chữ Kanji nhưng lại quên cách đọc một từ ghép khó (hoặc ngược lại). Việc tách thẻ giúp thuật toán Anki lặp lại đúng những từ ghép còn yếu mà không bắt ôn lại cả chữ Kanji đã thuộc.
  - *Alternatives Considered*: Gộp từ ghép vào chung mặt sau của thẻ Kanji — bị loại theo xác nhận của người dùng để đảm bảo độ sâu ghi nhớ từ vựng.

- **Decision 3: Thuật toán Anki SM-2 rút gọn với 3 nút bấm (Khó / Tốt / Dễ)**
  - *Chosen Approach*: Sử dụng biến thể SM-2 với 3 mức đánh giá rõ ràng, có bảng cài đặt khoảng thời gian khởi tạo (mặc định: Khó `10m`, Tốt `1d`, Dễ `4d`) và tính toán `nextReviewAt`, `intervalMinutes`, `easeFactor`, `repetitions`.
  - *Why*: Giữ giao diện đơn giản hơn Anki truyền thống (3 nút thay vì 4) nhưng vẫn giữ đúng bản chất giãn cách thời gian tăng dần theo trí nhớ dài hạn và cho phép tùy chỉnh mốc phút/ngày theo nhịp học cá nhân.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         UI Views & Components                           │
│  ┌────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐  │
│  │  FolderTreeSidebar │  │  FolderKanjiTable &  │  │  FlashcardSrs   │  │
│  │  (Phân cấp cha-con)│  │  CompoundWordsEditor │  │  ReviewSession  │  │
│  └─────────┬──────────┘  └──────────┬───────────┘  └────────┬────────┘  │
│            │                        │                       │           │
│  ┌─────────▼────────────────────────▼───────────────────────▼────────┐  │
│  │               Decks & SRS Context / State Manager                 │  │
│  │  • Quản lý cây thư mục & gom thẻ đệ quy từ thư mục cha            │  │
│  │  • Tính toán lịch ôn SRS (Anki 3 mức: Khó / Tốt / Dễ)             │  │
│  │  • Export / Import JSON Validator & Merger                        │  │
│  └─────────┬───────────────────────────────────────────────┬─────────┘  │
└────────────┼───────────────────────────────────────────────┼────────────┘
             │                                               │
             ▼                                               ▼
┌──────────────────────────┐                   ┌──────────────────────────┐
│  LocalStorage Persistence│                   │  Supabase Client (Optional│
│  (Luôn hoạt động 100%)   │◄── Sync Engine ──►│  Auth + Postgres + RLS)  │
└──────────────────────────┘                   └──────────────────────────┘
                                                             │
                                               ┌─────────────▼────────────┐
                                               │  Public Shared Decks     │
                                               │  (/share/:slug -> Clone) │
                                               └──────────────────────────┘
```

- **Data Model & State**:
  - **Folder (`StudyFolder`)**: `id`, `parentId` (null nếu là thư mục gốc), `name`, `description`, `sortOrder`, `isPublic`, `shareSlug`, `createdAt`, `updatedAt`.
  - **Kanji Entry (`FolderKanjiItem`)**: `id`, `folderId`, `kanji`, `hanViet`, `onReadings`, `kunReadings`, `meanings`, `srsState` (`dueAt`, `intervalMinutes`, `easeFactor`, `repetitions`, `lastRating`), `compoundWords[]`.
  - **Compound Word (`CompoundWordCard`)**: `id`, `word`, `reading` (Hiragana/Katakana), `hanViet`, `meaning`, `srsState` (độc lập với thẻ Kanji).
  - **SRS Settings (`SrsConfig`)**: `hardMinutes` (mặc định 10), `goodDays` (mặc định 1), `easyDays` (mặc định 4).
  - **JSON Export Bundle (`KanjiDeckExportBundle`)**: `schemaVersion`, `exportedAt`, `rootFolder`, `folders[]` (toàn bộ cây con), `items[]` (Kanji + từ ghép).

- **Interactive Component & State Mapping**:
  - **Cây thư mục**: Tạo thư mục gốc/con, đổi tên inline, xóa (có xác nhận), click chọn thư mục để nạp toàn bộ item thuộc thư mục đó và mọi thư mục con đệ quy.
  - **Bảng Kanji & Từ ghép**: Ô nhập nhanh chuỗi Kanji -> tự động tách ký tự Hán duy nhất và tra từ điển nội bộ để điền sẵn Hán-Việt/âm/nghĩa -> cho phép chỉnh sửa trực tiếp; mỗi hàng Kanji mở rộng được danh sách từ ghép để thêm/sửa/xóa cặp *(Từ ghép | Cách đọc | Hán-Việt | Nghĩa)*.
  - **Phiên ôn Flashcard SRS**: Lọc danh sách thẻ đến hạn (`dueAt <= now`) từ thư mục đang chọn (bao gồm cây con); thao tác lật thẻ cập nhật `srsState` và đẩy lại vào hàng đợi (nếu chọn *Khó* trong phiên, thẻ có thể được xếp lại để ôn lại cuối phiên hoặc sau X phút).
  - **Xuất / Nhập & Chia sẻ Supabase**: Đọc/ghi tệp `.json` qua Blob/FileReader; nếu có Supabase Auth, cung cấp modal Đăng nhập/Đăng ký, nút "Đồng bộ lên Cloud", và công tắc "Chia sẻ công khai" sinh đường dẫn `/share/:slug` cho phép người dùng khác xem và nhấn "Lưu vào thư mục của tôi".
- **Database Schema (Supabase SQL Migration Reference)**: Cung cấp sẵn tệp hướng dẫn SQL (`folders`, `folder_kanji_items`, `compound_words`, `public_shares`) kèm chính sách RLS chuẩn (chủ sở hữu toàn quyền đọc/ghi; mọi người được phép đọc các thư mục đánh dấu `is_public = true`) để người dùng dán vào Supabase SQL Editor khi triển khai.
