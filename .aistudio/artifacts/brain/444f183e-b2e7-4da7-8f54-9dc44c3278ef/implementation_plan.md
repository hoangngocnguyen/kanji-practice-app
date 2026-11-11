# Tối ưu Bố cục & Trải nghiệm Ôn tập Flashcard SRS (Desktop & Mobile)

Thiết kế lại màn hình ôn tập Flashcard SRS thành một **sân khấu học tập vừa khít 1 khung nhìn (Single-Viewport Stage)**, căn giữa hoàn hảo với kích thước dạng thẻ bài cân đối (không kéo giãn toàn chiều ngang), bổ sung nút mũi tên **Trái / Phải** để chuyển qua lại giữa các thẻ, và tối ưu vùng chạm ngón tay trên thiết bị di động để người học không bao giờ phải cuộn lên xuống khi lật thẻ và chấm điểm.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Kế hoạch dưới đây thiết kế theo các tiêu chuẩn UX tối ưu cho việc ôn tập liên tục trên cả Desktop và Mobile:

- **Chuyển thẻ bằng mũi tên Trái / Phải (`<` / `>`)**: Cho phép duyệt qua lại giữa các thẻ trong hàng đợi (`currentIndex` trên danh sách thẻ đang ôn) để xem trước hoặc quay lại thẻ vừa xem mà không làm mất tiến độ SRS; đồng thời hỗ trợ phím mũi tên `←` / `→` trên bàn phím và thao tác vuốt/chạm trên mobile.
- **Khung nhìn vừa khít (`100dvh`) không cuộn**: Toàn bộ khu vực ôn tập (Thanh điều khiển gọn + Thanh tiến độ + Thẻ Flashcard căn giữa + Nút Lật thẻ / 3 nút đánh giá Khó–Tốt–Dễ) được tính toán chiều cao co giãn linh hoạt để nằm gọn trong 1 màn hình, cả ở mặt trước lẫn mặt sau khi lật thẻ.

---

## 1. Overview & Core Concept

- **What It Does**: Thu gọn tỷ lệ khung thẻ Flashcard về dạng **Card trung tâm** (`max-w-[440px]`–`max-w-[480px]` trên Desktop, `w-full` trên Mobile), đặt ở chính giữa màn hình theo cả chiều ngang lẫn chiều dọc, kèm 2 nút điều hướng Trái/Phải hai bên thẻ (trên Desktop) hoặc tích hợp gọn vào thanh điều khiển dưới thẻ (trên Mobile).
- **Target Audience / Persona**: Người học Kanji ôn tập nhanh trên laptop lẫn điện thoại bằng một tay hoặc phím tắt.
- **Key Value**: Chấm dứt tình trạng thẻ quá to và dài khiến nút đánh giá *Khó / Tốt / Dễ* bị đẩy xuống dưới màn hình; giúp mắt tập trung vào một điểm cố định ở giữa màn hình và thao tác lật/chấm điểm diễn ra tức thì.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Vào phiên ôn tập**:
   - Màn hình hiển thị ngay thanh tiêu đề tối giản (nút Quay lại, tên bài học, bộ đếm `1 / 13`, bộ lọc *Tất cả / Chỉ Kanji / Từ ghép*, nút cài đặt SRS) và thanh tiến độ mảnh bên dưới.
   - Ở chính giữa màn hình là **Thẻ Flashcard** tỷ lệ cân đối, hai bên trái/phải có nút mũi tên tròn `←` và `→` (mờ đi khi ở thẻ đầu/cuối).
   - Phía dưới thẻ là nút **Hiện đáp án (Space)** nằm cố định trong tầm nhìn.
2. **Lật thẻ & Đánh giá SRS**:
   - Chạm vào thẻ hoặc nhấn `Space` → Thẻ lật sang mặt sau với bố cục thông tin cô đọng (Hán-Việt, Âm On/Kun xếp 2 cột gọn, Nghĩa tiếng Việt, nút nhỏ xem nét viết) không làm thẻ phình cao quá khung hình.
   - Bên dưới lập tức chuyển thành 3 nút **1. Khó · 2. Tốt · 3. Dễ** với chiều cao tối thiểu `44px–48px` dễ bấm trên điện thoại.
   - Sau khi bấm đánh giá → Chấm điểm SRS, tự động chuyển sang thẻ tiếp theo và giữ nguyên vị trí khung thẻ không giật layout.
3. **Chuyển thẻ Trái / Phải**:
   - Bấm nút `←` / `→` hoặc phím mũi tên trái/phải → Chuyển xem thẻ trước/sau trong danh sách phiên ôn hiện tại, tự động đưa thẻ về mặt trước để người dùng tự kiểm tra lại.
4. **Responsive trên Mobile (`375px–430px`)**:
   - Hai nút mũi tên Trái/Phải chuyển xuống hai đầu của cụm nút điều khiển bên dưới thẻ (hoặc nằm gọn cạnh thẻ với vùng chạm `44x44px`), nhường toàn bộ chiều ngang màn hình điện thoại cho thẻ Flashcard.
   - Thanh bộ lọc và tiêu đề gộp gọn thành 2 dòng mảnh, đảm bảo vùng chạm ≥ `44px` ở vùng ngón tay cái phía dưới.

### Visual Identity & Theme

- **Aesthetic Direction**: Tập trung tuyệt đối (Focused Study Card), loại bỏ khoảng trống thừa và viền nặng nề.
- **Color Palette & Mood**:
  - **60% Canvas**: Nền `slate-50` dịu mắt làm nổi bật chiếc thẻ trắng ở trung tâm.
  - **30% Card Surface**: Thẻ trắng `white` bo góc `rounded-2xl`, viền mảnh `border-slate-200`, đổ bóng nhẹ một cấp `shadow-sm`.
  - **10% Accent**: `teal-700` cho nút *Hiện đáp án* và thanh tiến độ; mã màu ngữ nghĩa kết hợp chữ và icon rõ ràng cho 3 nút *Khó* (`rose`), *Tốt* (`sky`), *Dễ* (`emerald`).
- **Typography & Hierarchy**: Chữ Kanji/Từ ghép mặt trước cỡ lớn nổi bật (`text-5xl sm:text-6xl font-kanji`), mặt sau thu gọn hợp lý (`text-3xl`) để các khối On/Kun/Nghĩa luôn vừa vặn không gây tràn dọc. Bộ đếm thẻ dùng `font-mono tabular-nums`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Giới hạn chiều rộng Card (`max-w-[460px]`) thay vì `max-w-3xl` (`768px`)**
  - *Chosen Approach*: Đưa thẻ Flashcard về tỷ lệ thẻ bài dọc/vuông cân đối (`max-w-[460px]`), căn giữa cả chiều ngang và chiều dọc trong vùng làm việc.
  - *Why*: Thẻ rộng 768px tạo ra quá nhiều khoảng trắng hai bên chữ Kanji và khiến mắt phải quét ngang rộng; kích thước `440px–460px` giống thẻ Anki chuẩn, đọc nhanh và nhìn sang trọng hơn hẳn.
  - *Alternatives Considered*: Giữ `max-w-3xl` và chỉ giảm chiều cao (vẫn bị cảm giác bè ngang, mất dáng thẻ Flashcard).

- **Decision 2: Cố định chiều cao tối đa của vùng thẻ và tách điều hướng Trái/Phải**
  - *Chosen Approach*: Sử dụng layout Flexbox theo trục dọc chiếm trọn phần còn lại của khung nhìn (`min-h-[calc(100dvh-5rem)] flex flex-col justify-between`), vùng thẻ ở giữa (`flex-1 flex items-center justify-center`) với chiều cao linh hoạt (`min-h-[260px] max-h-[380px]` có cuộn nội bộ nhẹ nếu nghĩa quá dài).
  - *Why*: Đảm bảo 3 nút đánh giá *Khó / Tốt / Dễ* luôn nằm cố định trong khung màn hình mà không bị đẩy trôi khi mặt sau có nhiều âm đọc hoặc nghĩa dài.
  - *Alternatives Considered*: Cho thẻ giãn tự do theo nội dung (gây ra lỗi phải cuộn trang như hiện tại).

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│             Flashcard Viewport Shell (min-h-[calc(100dvh-6rem)])        │
│                    flex flex-col justify-between                        │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Compact Header & Progress Bar                                        │
│    [←] Ôn tập: Bài học · 1 / 13       [Tất cả | Kanji | Từ ghép] [⚙]   │
│    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
├─────────────────────────────────────────────────────────────────────────┤
│ 2. Centered Card Stage (flex-1 flex items-center justify-center)        │
│                                                                         │
│         ┌─────┐   ┌───────────────────────────────┐   ┌─────┐           │
│         │  ←  │   │  Thẻ Kanji · Tên bài     [🔊] │   │  →  │           │
│         │ Prev│   │                               │   │ Next│           │
│         └─────┘   │             日 本             │   └─────┘           │
│         (Desktop) │                               │   (Desktop)         │
│                   │    Nhấn thẻ / Space để lật    │                     │
│                   └───────────────────────────────┘                     │
├─────────────────────────────────────────────────────────────────────────┤
│ 3. Bottom Thumb-Zone Action Bar (max-w-[460px] mx-auto w-full)          │
│    • Mobile: [←]   [     Hiện đáp án (Space)     ]   [→]                │
│    • Flipped: [ 1. Khó (10p) ] [ 2. Tốt (1ng) ] [ 3. Dễ (4ng) ]         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping

- **Queue & Index Navigation (`queue`, `currentIndex`)**:
  - Thay vì luôn lấy `queue[0]`, phiên ôn duy trì `currentIndex` (mặc định `0`).
  - Nút **Trái (`←`)**: Giảm `currentIndex` về `Math.max(0, currentIndex - 1)` và đặt `isFlipped = false`.
  - Nút **Phải (`→`)**: Tăng `currentIndex` lên `Math.min(queue.length - 1, currentIndex + 1)` và đặt `isFlipped = false`.
  - **Đánh giá SRS (`handleRate`)**: Chấm điểm thẻ tại `currentIndex`, loại thẻ đó khỏi `queue` (nếu chọn *Khó* lần đầu thì đẩy xuống cuối `queue` để ôn lại trong phiên), và giữ `currentIndex` hợp lệ (`Math.min(currentIndex, nextQueue.length - 1)`).
- **Phím tắt bàn phím**:
  - `Space` / `Enter`: Lật thẻ.
  - `ArrowLeft` / `ArrowRight`: Chuyển thẻ trước / sau.
  - `1` / `2` / `3` (khi đã lật thẻ): Chấm điểm *Khó* / *Tốt* / *Dễ*.
- **Cấu hình SRS Drawer**: Khi mở bảng tùy chỉnh thời gian Anki (`showConfig`), hiển thị dạng popover/overlay gọn hoặc trượt nhẹ phía trên mà không làm vỡ khung giữa của thẻ.
