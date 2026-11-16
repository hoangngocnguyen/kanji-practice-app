# 🔐 09. Cơ Chế Xác Thực Tài Khoản & Đồng Bộ Flashcard Chuẩn AnkiDroid

Tài liệu này mô tả chi tiết kiến trúc bảo mật, luồng xác thực người dùng (Supabase Auth), trang thông tin cá nhân (`/profile`) và thuật toán đồng bộ 3 chiều + giải quyết xung đột kiểu AnkiDroid qua **Vercel Serverless Functions (`/api/*`)**.

---

## 1. Kiến Trúc Bảo Mật & Phân Tách Key

Hệ thống áp dụng mô hình **Backend-for-Frontend Serverless Proxy** trên Vercel (và Express trong `server.ts` ở môi trường dev):

- **Frontend (`VITE_*`):** Chỉ sử dụng `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY` để quản lý phiên đăng nhập/đăng ký qua `@supabase/supabase-js` và lấy JWT `access_token`.
- **Backend (`/api/*`):** Sử dụng `SUPABASE_URL` và `SUPABASE_SECRET_KEY` (tuyệt đối không lộ ra trình duyệt) để khởi tạo `supabaseAdmin`.
- **Middleware xác thực (`api/_lib/auth.ts`):**
  1. Đọc header `Authorization: Bearer <token>`.
  2. Xác thực trực tiếp bằng `supabaseAdmin.auth.getUser(token)`.
  3. Chỉ sử dụng `user.id` thu được từ token hợp lệ để truy vấn dữ liệu trên PostgreSQL.

---

## 2. Cấu Trúc Database & Phân Quyền PostgreSQL (`docs/supabase_decks_schema.sql`)

| Bảng | Vai trò chính | Trường đồng bộ đặc biệt |
| :--- | :--- | :--- |
| `public.profiles` | Hồ sơ người dùng & metadata đồng bộ tổng | `display_name`, `sync_version`, `data_hash`, `last_sync_at` |
| `public.flashcard_decks` | Cây thư mục bài học cha–con | `parent_id`, `sync_version`, `deleted_at` (soft-delete) |
| `public.flashcards` | Thẻ Kanji, thông số SRS & danh sách từ ghép | `deck_id`, `srs_state`, `compound_words`, `deleted_at` |
| `public.public_shared_decks` | Bộ bài chia sẻ công khai theo `slug` | `slug`, `bundle`, `owner_id` |

- **Trigger tự động:** `on_auth_user_created` tự tạo dòng trong `public.profiles` ngay khi user đăng ký tài khoản mới.
- **Row Level Security (RLS) & `GRANT`:** Mọi bảng đều bật RLS theo `auth.uid() = id / user_id`, đồng thời cấp `GRANT` tường minh cho `service_role` và `authenticated` để tránh lỗi `42501 permission denied`.

---

## 3. Danh Sách Serverless API Endpoints

| Endpoint | Method | Chức năng |
| :--- | :--- | :--- |
| `/api/profile` | `GET` / `PUT` | Lấy hồ sơ + thống kê; cập nhật `display_name` đồng thời lên bảng `profiles` và `user_metadata` |
| `/api/sync/check` | `POST` | So sánh `lastSyncedVersion`, `localDataHash` và trạng thái thay đổi 2 phía để trả về quyết định đồng bộ |
| `/api/sync/merge` | `POST` | Tự động đẩy thay đổi + tombstones (`deletedFolderIds`, `deletedItemIds`) khi không có xung đột (có optimistic lock `409`) |
| `/api/sync/push` | `POST` | **Tải lên Cloud (Force Push):** Ghi đè toàn bộ dữ liệu trên Cloud bằng bản ở thiết bị hiện tại |
| `/api/sync/pull` | `GET` | **Tải về máy (Force Pull):** Tải toàn bộ bộ thẻ và tiến độ SRS chuẩn từ Cloud về thiết bị |

---

## 4. Thuật Toán Đồng Bộ 3 Chiều & Giải Quyết Xung Đột (AnkiDroid)

Client lưu trạng thái đồng bộ tại `localStorage` (`kanji_sync_meta_v1`) gồm `lastSyncedUserId`, `lastSyncedVersion`, `lastSyncedHash`, `dirtySinceLastSync`, và danh sách ID đã xóa (`deletedFolderIds`, `deletedItemIds`).

1. **Tính Canonical SHA-256 Hash (`api/_lib/hash.ts` & `src/services/syncService.ts`):** Chuẩn hóa thứ tự thư mục, thẻ Kanji, từ ghép và `srsState` để so sánh chính xác nội dung giữa Client và Server.
2. **Ma trận quyết định tại `/api/sync/check`:**
   - **Cùng hash & không có xóa chờ (`up_to_date`):** Báo dữ liệu đã mới nhất.
   - **Chỉ Local thay đổi (`auto_push`):** Tự động gọi `/api/sync/merge` lưu thay đổi và xóa tombstones.
   - **Chỉ Server thay đổi (`auto_pull`):** Tự động tải bản mới từ `/api/sync/pull`.
   - **Xung đột (`conflict`):** Xảy ra khi cả Local và Server đều có thay đổi kể từ lần sync cuối, hoặc đăng nhập tài khoản mới lên thiết bị đã có dữ liệu tự tạo. Hệ thống dừng ghi đè tự động và mở **SyncConflictModal** hiển thị đối chiếu 2 cột để người dùng chọn **Tải lên Cloud** hoặc **Tải về máy**.

---

## 5. Luồng Trải Nghiệm Người Dùng (Guest-First)

- **Chế độ Guest:** Người dùng chưa đăng nhập sử dụng đầy đủ app với `localStorage`; nút **Đăng nhập** nằm bên trái nút *In tập viết* trên Header.
- **Auth Guard Modal:** Khi Guest bấm **Đồng bộ Cloud** hoặc **Chia sẻ**, modal thân thiện xuất hiện mời đăng nhập/đăng ký.
- **Đã đăng nhập:** Header hiển thị **Avatar tròn** ngay bên trái nút *Cài đặt*; click vào Avatar để mở trang `/profile` chỉnh sửa tên hiển thị, xem tiến độ đồng bộ hoặc đăng xuất.
