-- ============================================================================
-- Migration: Bảng bài viết / thông báo trang chủ & Phân quyền Quản trị viên (Admin)
-- Hướng dẫn: Chạy toàn bộ script này trong Supabase Dashboard -> SQL Editor -> Run
-- Script an toàn để chạy nhiều lần (Idempotent), tự động khởi tạo bảng và seed bài viết.
-- ============================================================================

-- 1. Thêm cột role vào bảng profiles (nếu chưa có)
ALTER TABLE IF EXISTS public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Cập nhật quyền Admin cho tài khoản của bạn (nguyenhoang19112005@gmail.com)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'nguyenhoang19112005@gmail.com'
   OR id IN (SELECT id FROM auth.users WHERE email = 'nguyenhoang19112005@gmail.com');

-- 3. Tạo bảng quản lý bài đăng / thông báo tính năng (posts)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Tính năng mới',
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Ban Quản Trị',
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tạo index tìm kiếm bài viết theo thời gian
CREATE INDEX IF NOT EXISTS idx_posts_created_at 
  ON public.posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_published 
  ON public.posts (published, created_at DESC);

-- 4. Cấp quyền truy cập bảng (Rất quan trọng trên Supabase để service_role và anon không bị 42501 permission denied)
GRANT ALL ON TABLE public.posts TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated, anon;

-- 5. Bật Row Level Security (RLS) cho bảng posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 6. Thiết lập chính sách bảo mật RLS
DROP POLICY IF EXISTS "Public read published posts" ON public.posts;
CREATE POLICY "Public read published posts" 
  ON public.posts 
  FOR SELECT 
  USING (published = true OR auth.uid() = author_id);

DROP POLICY IF EXISTS "Admin insert posts" ON public.posts;
CREATE POLICY "Admin insert posts" 
  ON public.posts 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR email = 'nguyenhoang19112005@gmail.com')
    )
  );

DROP POLICY IF EXISTS "Admin update posts" ON public.posts;
CREATE POLICY "Admin update posts" 
  ON public.posts 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR email = 'nguyenhoang19112005@gmail.com')
    )
  );

DROP POLICY IF EXISTS "Admin delete posts" ON public.posts;
CREATE POLICY "Admin delete posts" 
  ON public.posts 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR email = 'nguyenhoang19112005@gmail.com')
    )
  );

-- 6. SEED DỮ LIỆU MẪU BAN ĐẦU CHO TRANG CHỦ (Chỉ chèn nếu chưa có bài cùng tiêu đề)
INSERT INTO public.posts (title, summary, content, category, author_name, published, created_at)
SELECT 
  'Chào mừng bạn đến với NekoKanji – Luyện viết Kanji & SRS thông minh',
  'Khám phá nền tảng học tiếng Nhật chuyên sâu: Luyện viết chuẩn nét có chấm điểm AI, Flashcard thông minh SRS, Đấu trường và Streak bạn bè.',
  'Chào mừng bạn đến với **NekoKanji**!

Nền tảng của chúng tôi được thiết kế dành riêng cho người học tiếng Nhật mong muốn làm chủ chữ Hán và từ vựng một cách bài bản nhất:

- **Luyện viết Kanji chuẩn nét**: Chấm điểm từng nét ngay lập tức, phát hiện hướng vẽ sai và hướng dẫn thứ tự chuẩn xác của **2.136 chữ Kanji Jōyō**.
- **Flashcard SRS & Thư mục trực quan**: Thuật toán lặp lại ngắt quãng (SRS) tính toán chu kỳ ôn tập khoa học, giao diện quản lý bài học phân cấp như Google Drive.
- **Streak bạn bè & Đấu trường Kanji**: Học cùng bạn bè mỗi ngày, duy trì chuỗi lửa (Streak) và thi đấu trực tuyến 1v1 hào hứng.
- **Tra cứu ngoại tuyến toàn diện**: Học từ N5 đến N1 kèm 214 bộ thủ Khang Hy, từ ghép đi kèm và ví dụ thực tế.

> *Mẹo nhỏ*: Bạn có thể nhấn vào bất kỳ thư mục nào trên trang chủ hoặc vào mục **Bộ thẻ** để bắt đầu ôn tập các chữ đến hạn hôm nay!',
  'Thông báo',
  'Ban Quản Trị',
  true,
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (
  SELECT 1 FROM public.posts WHERE title = 'Chào mừng bạn đến với NekoKanji – Luyện viết Kanji & SRS thông minh'
);

INSERT INTO public.posts (title, summary, content, category, author_name, published, created_at)
SELECT 
  'Ra mắt tính năng: Đấu trường Kanji 1v1 & Chuỗi Streak kết nối bạn bè',
  'Thách đấu trực tuyến thời gian thực với cộng đồng và gắn kết chuỗi học tập hàng ngày cùng người bạn đồng hành.',
  'Chúng tôi rất vui mừng thông báo về hai tính năng cộng đồng hoàn toàn mới:

### 1. Đấu trường Kanji 1v1 (Realtime Arena)
- Thi đấu trắc nghiệm âm On, âm Kun, âm Hán-Việt và nghĩa chữ Hán với người chơi khác trong thời gian thực.
- Bảng xếp hạng cập nhật điểm số và tỷ lệ thắng thua theo tuần.

### 2. Chuỗi lửa Streak bạn bè
- Kết nối mã mời để tạo **Streak đôi** với bạn thân hoặc đồng môn tiếng Nhật.
- Mỗi ngày cả hai cùng học để tăng số ngày chuỗi lửa.
- Tính năng **Băng cứu hộ** giúp bảo vệ chuỗi ngày nếu lỡ quên học một ngày!

Hãy vào mục **Đấu trường** hoặc **Bảng xếp hạng** để mời bạn bè ngay hôm nay!',
  'Tính năng mới',
  'Đội ngũ phát triển',
  true,
  NOW() - INTERVAL '4 days'
WHERE NOT EXISTS (
  SELECT 1 FROM public.posts WHERE title = 'Ra mắt tính năng: Đấu trường Kanji 1v1 & Chuỗi Streak kết nối bạn bè'
);

INSERT INTO public.posts (title, summary, content, category, author_name, published, created_at)
SELECT 
  'Cập nhật: Xem bộ thẻ chia sẻ dạng cây thư mục & Chấm điểm nét AI',
  'Trải nghiệm duyệt bộ bài học cộng đồng trực quan hơn với cấu trúc thư mục phân cấp cùng thuật toán nhận diện nét vẽ cải tiến.',
  'Bản cập nhật tuần này mang đến các cải tiến trải nghiệm cốt lõi:

1. **Cây thư mục xem bộ thẻ chia sẻ**: Khi mở một liên kết bộ thẻ do bạn bè chia sẻ, bạn có thể duyệt từng thư mục bài học con, mở từng bài để xem danh sách chữ Kanji mà không bị rối mắt.
2. **Hỗ trợ chọn ôn Flashcard theo nhánh**: Bạn có thể chọn ôn toàn bộ bộ thẻ hoặc chỉ ôn riêng một bài học đang chọn.
3. **Cải tiến thuật toán chấm điểm nét viết**: Nhận diện độ cong, tỷ lệ và thứ tự nét viết chính xác hơn khi bạn vẽ bằng ngón tay trên điện thoại hoặc chuột trên máy tính.',
  'Cập nhật',
  'Đội ngũ phát triển',
  true,
  NOW() - INTERVAL '7 days'
WHERE NOT EXISTS (
  SELECT 1 FROM public.posts WHERE title = 'Cập nhật: Xem bộ thẻ chia sẻ dạng cây thư mục & Chấm điểm nét AI'
);
