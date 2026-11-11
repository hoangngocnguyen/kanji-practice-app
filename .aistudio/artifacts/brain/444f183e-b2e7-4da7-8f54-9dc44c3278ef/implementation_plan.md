# Tái cấu trúc Phân hệ Ôn tập Kanji: Tách Trang Thư mục & Chi tiết Bài học

Tách biệt hoàn toàn màn hình quản lý **Thư mục bài học** (`/decks`) và màn hình **Chi tiết Kanji & Ôn tập** (`/decks/:id`) nhằm giải phóng không gian hiển thị, loại bỏ sự chật chội của cây thư mục lồng bên cạnh bảng dữ liệu, đồng thời bổ sung bộ thao tác thư mục chuẩn (Menu 3 chấm, Di chuyển thư mục, Chống trùng lặp khi tạo và Gộp/Tạo mới thông minh khi nhập JSON).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Toàn bộ 3 quyết định thiết kế cốt lõi đã được xác nhận và sẽ được áp dụng làm quy chuẩn cho bản nâng cấp này:

- **Kiến trúc 2 trang độc lập (`/decks` & `/decks/:id`)**: Tách hẳn trang danh sách thư mục ra khỏi trang bảng Kanji & từ ghép. Người dùng quản lý cây thư mục ở `/decks` và bấm vào thư mục để mở toàn màn hình chi tiết bài học tại `/decks/:id`.
- **Thao tác thư mục qua Menu 3 chấm (`⋮`) & Modal Di chuyển**: Thay thế các icon hover nhỏ xíu bằng nút Menu `⋮` rõ ràng trên mỗi dòng/thẻ thư mục, tích hợp tính năng **Di chuyển đến...** với danh sách thư mục đích an toàn (tự động loại trừ chính nó và các thư mục con để tránh vòng lặp).
- **Chống trùng lặp (Duplicate) thông minh**:
  - Khi **Tạo mới / Đổi tên**: Kiểm tra trùng tên trong cùng thư mục cha (không phân biệt hoa/thường và khoảng trắng thừa) và hiển thị cảnh báo ngay tại form, không cho lưu trùng.
  - Khi **Import JSON**: Nếu phát hiện thư mục gốc hoặc thư mục con trùng tên với thư mục đang có tại đích, hiển thị hộp thoại hỏi người dùng chọn **Gộp vào thư mục có sẵn** (chỉ thêm Kanji/từ ghép chưa có) hoặc **Tạo mới (kèm hậu tố bản sao)**.

---

## 1. Overview & Core Concept

- **What It Does**: Biến phân hệ Ôn tập theo bài thành hai không gian làm việc tập trung:
  1. **Không gian Quản lý Thư mục (`/decks`)**: Hiển thị cấu trúc cây thư mục cha–con rõ ràng, thoáng đãng trên toàn chiều rộng nội dung; hỗ trợ tìm kiếm nhanh, tạo thư mục, mở menu thao tác `⋮` (Đổi tên, Thêm thư mục con, Di chuyển đến, Xuất JSON, Xóa), và Import JSON.
  2. **Không gian Bài học & Ôn tập (`/decks/:id`)**: Hiển thị Breadcrumb điều hướng cấp cha–con để quay lại `/decks` hoặc nhảy lên thư mục cha, thanh thống kê thẻ đến hạn, ô thêm danh sách Kanji, bảng Kanji + từ ghép rộng rãi, và chế độ **Ôn Flashcard SRS** toàn màn hình.
- **Target Audience / Persona**: Người học tiếng Nhật quản lý nhiều bộ giáo trình (JLPT N5–N1, Minna no Nihongo, Kanji theo chủ đề) cần sắp xếp lại thư mục linh hoạt và cần bảng Kanji rộng rãi để nhập từ ghép.
- **Key Value**: Loại bỏ hoàn toàn tình trạng giao diện bị ép cột, nút bấm hover khó thao tác, lỗi nhân bản thư mục khi thao tác/import, và giúp việc tổ chức lại bài học (di chuyển bài con sang thư mục cha khác) chỉ mất 2 cú nhấp chuột.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Quản lý & Tổ chức Thư mục tại `/decks`**:
   - Người dùng thấy danh sách cây thư mục bài học với khoảng cách thoáng, nút **+ Thư mục mới** và **Nhập JSON** ở thanh công cụ trên cùng.
   - Bấm vào tên thư mục → Điều hướng thẳng sang `/decks/:id`.
   - Bấm nút **Menu (`⋮`)** ở bên phải mỗi dòng thư mục → Mở menu thả xuống gồm: *Mở bài học*, *Thêm thư mục con*, *Đổi tên*, *Di chuyển đến...*, *Xuất file JSON*, *Xóa thư mục*.
   - Khi chọn **Thêm thư mục con** hoặc **Đổi tên** → Mở modal gọn gàng có kiểm tra trùng tên theo thời gian thực.
   - Khi chọn **Di chuyển đến...** → Mở modal chọn thư mục đích (có tùy chọn *Đưa ra ngoài cùng - Thư mục gốc* hoặc chọn bất kỳ thư mục hợp lệ nào), bấm xác nhận để cập nhật ngay lập tức.
2. **Import JSON & Xử lý trùng lặp**:
   - Chọn tệp `.json` → Hệ thống quét trước cấu trúc thư mục trong tệp và đối chiếu với thư mục hiện có tại vị trí đích.
   - Nếu có trùng tên, modal hiển thị cảnh báo rõ ràng và cho phép chọn **Gộp nội dung vào thư mục hiện có** (giữ nguyên thư mục cũ, gộp thêm Kanji và từ ghép mới) hoặc **Tạo thư mục mới (thêm hậu tố)**.
3. **Học & Ôn tập tại `/decks/:id`**:
   - Header bài học có nút **Quay lại** + **Breadcrumb** (`Thư mục gốc > JLPT N5 > Bài 1`) giúp nhảy nhanh giữa các cấp cha–con.
   - Hiển thị toàn bộ bảng Kanji, cột Hán-Việt, Âm On/Kun, Nghĩa, Từ ghép và trạng thái SRS trên không gian 100% chiều rộng (không bị sidebar cây thư mục chiếm chỗ).
   - Bấm **Ôn tập ngay** → Chuyển sang giao diện Flashcard SRS tập trung; kết thúc phiên ôn quay lại chính xác `/decks/:id`.

### Visual Identity & Theme

- **Aesthetic Direction**: Sạch sẽ, tập trung vào học thuật (Academic Clarity), kế thừa ngôn ngữ thiết kế hiện có của *Luyện Kanji*.
- **Color Palette & Mood**:
  - **60% Canvas**: Nền trung tính `slate-50` dịu mắt khi đọc bảng Kanji dài.
  - **30% Structural Surfaces**: Thẻ trắng `white` với viền mảnh `1px solid slate-200`, phân tách hàng bằng đường kẻ mảnh `divide-slate-100`.
  - **10% Focal Accent**: Màu `teal-700` / `teal-800` tập trung duy nhất vào nút CTA chính (*Ôn tập ngay*, *Thư mục mới*) và trạng thái đang chọn.
- **Typography & Hierarchy**: Tiêu đề bài học rõ ràng (`18px–20px` Bold), tên thư mục (`14px` SemiBold), chữ Kanji hiển thị bằng font chuyên dụng (`font-kanji`), số lượng Kanji và số thẻ đến hạn dùng `font-mono tabular-nums` không đóng khung pill.
- **Component Discipline**:
  - Metadata (số chữ Kanji, số từ ghép, số thẻ đến hạn) trình bày dạng văn bản thuần ngăn cách bởi dấu `·`, không dùng badge pill thừa.
  - Mọi nút thao tác trên menu và thanh công cụ đều giữ trên 1 dòng (`whitespace-nowrap`), vùng bấm tối thiểu `36px–40px` thân thiện cả chuột và cảm ứng.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Tách Route `/decks` và `/decks/:id` thay vì Master–Detail 2 cột**
  - *Chosen Approach*: Sử dụng React Router với `/decks` (danh sách thư mục) và `/decks/:id` (chi tiết bài học & ôn tập).
  - *Why*: Bảng Kanji có tới 6 cột thông tin kèm trình soạn thảo từ ghép mở rộng; khi đứng chung với cây thư mục trên cùng 1 màn hình, cả hai vùng đều bị bóp hẹp và gây cuộn lồng nhau. Tách trang giúp mỗi màn hình có 100% không gian cho nhiệm vụ của nó.
  - *Alternatives Considered*: Giữ 2 cột có nút thu gọn (đã thử nhưng vẫn gây rối ở màn hình vừa/nhỏ và làm thao tác sửa/xóa thư mục bị gò bó).

- **Decision 2: Menu 3 chấm (`⋮`) & Modal thao tác thay cho Inline Form & Hover Icons**
  - *Chosen Approach*: Gom toàn bộ hành động quản lý thư mục vào nút `⋮` luôn hiển thị rõ ràng; các thao tác nhập liệu (Tạo, Đổi tên, Di chuyển, Xác nhận xóa) thực hiện qua modal chuẩn hóa.
  - *Why*: Loại bỏ lỗi bấm nhầm, hoạt động đồng nhất trên cả desktop lẫn thiết bị cảm ứng, và tạo không gian để hiển thị thông báo kiểm tra trùng tên rõ ràng.
  - *Alternatives Considered*: Kéo thả (Drag & Drop) trực tiếp trên cây (dễ thao tác nhầm khi cây thư mục sâu hoặc trên màn hình cảm ứng).

- **Decision 3: Kiểm tra trùng lặp ở tầng Context trước khi ghi State**
  - *Chosen Approach*: Chuẩn hóa tên thư mục (`trim().toLowerCase()`) khi đối chiếu trong cùng `parentId`, đồng thời bổ sung chế độ `merge` và `create_copy` vào hàm xử lý Import.
  - *Why*: Ngăn chặn triệt để lỗi dữ liệu rác/trùng lặp từ gốc, đảm bảo đồng bộ lên Cloud (Supabase) sau này cũng sạch sẽ.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         DeckContext (State & Persistence)               │
│  • folders[], items[], srsConfig                                        │
│  • CRUD + Validation: createFolder, renameFolder, moveFolder, delete    │
│  • Duplicate Guard & Import Strategy: importDeckBundle('merge'|'copy')  │
└───────────────┬─────────────────────────────────────────┬───────────────┘
                │                                         │
                ▼                                         ▼
┌───────────────────────────────┐       ┌─────────────────────────────────┐
│  Route: /decks                │       │  Route: /decks/:folderId        │
│  (Folder Management Page)     │       │  (Folder Detail & Study Page)   │
├───────────────────────────────┤       ├─────────────────────────────────┤
│ • Toolbar: Search, + New,     │       │ • Breadcrumb Navigation         │
│   Import JSON                 │       │ • Stats & Primary CTA (Review)  │
│ • Expandable Folder Tree Rows │──nav─▶│ • Quick Add Kanji Bar           │
│ • Row Action Menu (⋮):        │       │ • Full-Width Kanji & Compound   │
│   Open, Subfolder, Rename,    │       │   Words Table                   │
│   Move To, Export, Delete     │       │ • Full-Screen Flashcard SRS     │
└───────────────┬───────────────┘       └─────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│  Shared Modals                                            │
│  • FolderFormModal (Create / Rename + Duplicate Warning)  │
│  • MoveFolderModal (Target Picker + Cycle Prevention)     │
│  • JsonImportModal (Conflict Detection: Merge vs Copy)    │
└───────────────────────────────────────────────────────────┘
```

### Data Model & State Mutations

- **Move Folder (`moveFolder(folderId, targetParentId)`)**:
  - Tính danh sách toàn bộ ID hậu duệ của `folderId` bằng `getDescendantFolderIds(folderId)`.
  - Chặn tuyệt đối nếu `targetParentId` nằm trong tập ID hậu duệ (chống vòng lặp cha–con vô hạn).
  - Kiểm tra trùng tên tại `targetParentId`: nếu thư mục đích đã có thư mục cùng tên, cảnh báo người dùng hoặc yêu cầu đổi tên trước khi chuyển.
  - Cập nhật `parentId`, `sortOrder` và `updatedAt` cho thư mục được di chuyển.
- **Duplicate Prevention (`isDuplicateFolderName(name, parentId, excludeId?)`)**:
  - So sánh `f.name.trim().toLowerCase() === name.trim().toLowerCase()` trong cùng `f.parentId === parentId`.
  - Áp dụng cho cả luồng Tạo mới và Đổi tên.
- **Smart JSON Import (`importDeckBundle(bundle, targetParentId, resetSrs, conflictMode)`)**:
  - `conflictMode = 'merge'`: Tìm thư mục cùng tên tại `targetParentId`; nếu khớp, tái sử dụng `id` thư mục cũ (đệ quy xuống các thư mục con), chỉ chèn thêm các `FolderKanjiItem` có chữ Kanji chưa tồn tại trong thư mục đó (và gộp thêm `compoundWords` mới nếu có).
  - `conflictMode = 'copy'`: Nếu trùng tên với thư mục đang có tại `targetParentId`, tự động gắn hậu tố `(Bản sao)` hoặc `(2)`, `(3)` cho thư mục gốc được nhập để phân biệt rõ ràng.

### Interactive Component & State Mapping

- **Mở Menu `⋮`**: Lưu `openMenuFolderId` trong state của trang `/decks`, tự động đóng khi click ra ngoài hoặc nhấn `Escape`.
- **Điều hướng sang `/decks/:folderId`**: Click vào hàng thư mục hoặc mục *Mở bài học* trên menu `⋮` sẽ gọi `navigate('/decks/' + folder.id)` và đồng bộ `selectedFolderId`.
- **Kiểm tra ID không tồn tại ở `/decks/:folderId`**: Nếu `folderId` trên URL không khớp thư mục nào (ví dụ vừa bị xóa), hiển thị trạng thái trống kèm nút quay về `/decks`.
- **Xóa thư mục**: Nếu người dùng đang đứng ở `/decks/:folderId` hoặc xóa từ `/decks`, modal xác nhận hiển thị rõ số lượng thư mục con và số chữ Kanji sẽ bị xóa trước khi thực hiện.
