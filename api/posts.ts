import type { VercelRequest, VercelResponse } from '@vercel/node';
import { optionalAuth, requireAuth, setCorsHeaders } from './_lib/auth.js';

const DEFAULT_SEED_POSTS = [
  {
    id: 'seed-post-1',
    title: 'Chào mừng bạn đến với NekoKanji – Luyện viết Kanji & SRS thông minh',
    summary: 'Khám phá nền tảng học tiếng Nhật chuyên sâu: Luyện viết chuẩn nét có chấm điểm AI, Flashcard thông minh SRS, Đấu trường và Streak bạn bè.',
    content: `Chào mừng bạn đến với **NekoKanji**!

Nền tảng của chúng tôi được thiết kế dành riêng cho người học tiếng Nhật mong muốn làm chủ chữ Hán và từ vựng một cách bài bản nhất:

- **Luyện viết Kanji chuẩn nét**: Chấm điểm từng nét ngay lập tức, phát hiện hướng vẽ sai và hướng dẫn thứ tự chuẩn xác của **2.136 chữ Kanji Jōyō**.
- **Flashcard SRS & Thư mục trực quan**: Thuật toán lặp lại ngắt quãng (SRS) tính toán chu kỳ ôn tập khoa học, giao diện quản lý bài học phân cấp như Google Drive.
- **Streak bạn bè & Đấu trường Kanji**: Học cùng bạn bè mỗi ngày, duy trì chuỗi lửa (Streak) và thi đấu trực tuyến 1v1 hào hứng.
- **Tra cứu ngoại tuyến toàn diện**: Học từ N5 đến N1 kèm 214 bộ thủ Khang Hy, từ ghép đi kèm và ví dụ thực tế.

> *Mẹo nhỏ*: Bạn có thể nhấn vào bất kỳ thư mục nào trên trang chủ hoặc vào mục **Bộ thẻ** để bắt đầu ôn tập các chữ đến hạn hôm nay!`,
    category: 'Thông báo',
    author_name: 'Ban Quản Trị',
    published: true,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'seed-post-2',
    title: 'Ra mắt tính năng: Đấu trường Kanji 1v1 & Chuỗi Streak kết nối bạn bè',
    summary: 'Thách đấu trực tuyến thời gian thực với cộng đồng và gắn kết chuỗi học tập hàng ngày cùng người bạn đồng hành.',
    content: `Chúng tôi rất vui mừng thông báo về hai tính năng cộng đồng hoàn toàn mới:

### 1. Đấu trường Kanji 1v1 (Realtime Arena)
- Thi đấu trắc nghiệm âm On, âm Kun, âm Hán-Việt và nghĩa chữ Hán với người chơi khác trong thời gian thực.
- Bảng xếp hạng cập nhật điểm số và tỷ lệ thắng thua theo tuần.

### 2. Chuỗi lửa Streak bạn bè
- Kết nối mã mời để tạo **Streak đôi** với bạn thân hoặc đồng môn tiếng Nhật.
- Mỗi ngày cả hai cùng học để tăng số ngày chuỗi lửa.
- Tính năng **Băng cứu hộ** giúp bảo vệ chuỗi ngày nếu lỡ quên học một ngày!

Hãy vào mục **Đấu trường** hoặc **Bảng xếp hạng** để mời bạn bè ngay hôm nay!`,
    category: 'Tính năng mới',
    author_name: 'Đội ngũ phát triển',
    published: true,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'seed-post-3',
    title: 'Cập nhật: Xem bộ thẻ chia sẻ dạng cây thư mục & Chấm điểm nét AI',
    summary: 'Trải nghiệm duyệt bộ bài học cộng đồng trực quan hơn với cấu trúc thư mục phân cấp cùng thuật toán nhận diện nét vẽ cải tiến.',
    content: `Bản cập nhật tuần này mang đến các cải tiến trải nghiệm cốt lõi:

1. **Cây thư mục xem bộ thẻ chia sẻ**: Khi mở một liên kết bộ thẻ do bạn bè chia sẻ, bạn có thể duyệt từng thư mục bài học con, mở từng bài để xem danh sách chữ Kanji mà không bị rối mắt.
2. **Hỗ trợ chọn ôn Flashcard theo nhánh**: Bạn có thể chọn ôn toàn bộ bộ thẻ hoặc chỉ ôn riêng một bài học đang chọn.
3. **Cải tiến thuật toán chấm điểm nét viết**: Nhận diện độ cong, tỷ lệ và thứ tự nét viết chính xác hơn khi bạn vẽ bằng ngón tay trên điện thoại hoặc chuột trên máy tính.`,
    category: 'Cập nhật',
    author_name: 'Đội ngũ phát triển',
    published: true,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

export default async function handler(req: VercelRequest | any, res: VercelResponse | any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { user, supabaseAdmin } = await optionalAuth(req, res);

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase posts error:', error);
        return res.status(200).json({
          posts: DEFAULT_SEED_POSTS,
          isFallback: true,
          errorDetails: error,
          notice:
            error.code === '42501'
              ? 'Bảng posts trên Supabase chưa được cấp quyền GRANT. Vui lòng chạy lệnh GRANT ALL ON TABLE public.posts TO anon, authenticated, service_role; trong SQL Editor.'
              : 'Bảng posts chưa được khởi tạo. Đang hiển thị dữ liệu bài viết mẫu.',
        });
      }

      if (!data || data.length === 0) {
        return res.status(200).json({
          posts: DEFAULT_SEED_POSTS,
          isFallback: true,
          notice: 'Bảng posts trong database đang trống. Hãy chạy đoạn seed script trong SQL Editor.',
        });
      }

      return res.status(200).json({ posts: data, isFallback: false });
    }

    if (req.method === 'POST') {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role, display_name')
        .eq('id', auth.user.id)
        .maybeSingle();

      const userRole = profile?.role || 'user';
      const userEmail = (auth.user.email || '').toLowerCase();
      const isAllowed = userRole === 'admin' || userEmail === 'nguyenhoang19112005@gmail.com';
      if (!isAllowed) {
        return res.status(403).json({ error: 'Bạn không có quyền quản trị để đăng bài viết.' });
      }

      const { title, summary, content, category, published } = req.body || {};
      if (!title || !content) {
        return res.status(400).json({ error: 'Tiêu đề và nội dung bài viết là bắt buộc.' });
      }

      const authorName = profile?.display_name || auth.user.email?.split('@')[0] || 'Ban Quản Trị';

      const { data: newPost, error: insertError } = await supabaseAdmin
        .from('posts')
        .insert({
          title: title.trim(),
          summary: (summary || '').trim(),
          content: content.trim(),
          category: (category || 'Tính năng mới').trim(),
          author_id: auth.user.id,
          author_name: authorName,
          published: published !== false,
        })
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      return res.status(201).json({ post: newPost });
    }

    if (req.method === 'PUT') {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .maybeSingle();

      const userRole = profile?.role || 'user';
      const userEmail = (auth.user.email || '').toLowerCase();
      const isAllowed = userRole === 'admin' || userEmail === 'nguyenhoang19112005@gmail.com';
      if (!isAllowed) {
        return res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa bài viết.' });
      }

      const { id, title, summary, content, category, published } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'Thiếu ID bài viết cần cập nhật.' });
      }
      if (!title || !content) {
        return res.status(400).json({ error: 'Tiêu đề và nội dung bài viết không được để trống.' });
      }

      const { data: updatedPost, error: updateError } = await supabaseAdmin
        .from('posts')
        .update({
          title: title.trim(),
          summary: (summary || '').trim(),
          content: content.trim(),
          category: (category || 'Tính năng mới').trim(),
          published: published !== false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      return res.status(200).json({ post: updatedPost });
    }

    if (req.method === 'DELETE') {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const postId = req.query?.id || req.body?.id;
      if (!postId) {
        return res.status(400).json({ error: 'Thiếu ID bài viết cần xóa.' });
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .maybeSingle();

      const userRole = profile?.role || 'user';
      const userEmail = (auth.user.email || '').toLowerCase();
      const isAllowed = userRole === 'admin' || userEmail === 'nguyenhoang19112005@gmail.com';
      if (!isAllowed) {
        return res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền xóa bài viết.' });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('posts')
        .delete()
        .eq('id', postId);

      if (deleteError) {
        throw deleteError;
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' });
  } catch (err: any) {
    console.error('Lỗi /api/posts:', err);
    return res.status(500).json({ error: err?.message || 'Lỗi xử lý bảng tin.' });
  }
}
