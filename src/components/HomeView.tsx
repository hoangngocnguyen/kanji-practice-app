import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PenTool,
  BookOpen,
  Swords,
  Flame,
  GraduationCap,
  Search,
  Languages,
  ArrowRight,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Globe,
  Layers,
  ChevronRight,
  ShieldAlert,
  Eye,
  Edit3,
  Pencil,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchPublicPosts,
  createPost,
  updatePost,
  deletePost,
  PostItem,
} from '../services/postService';
import { MarkdownRenderer, stripMarkdown } from './MarkdownRenderer';

export const HomeView: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activePost, setActivePost] = useState<PostItem | null>(null);

  // Admin Post Modal (Tạo mới & Chỉnh sửa)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postSummary, setPostSummary] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('Tính năng mới');
  const [contentTab, setContentTab] = useState<'edit' | 'preview'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [postsNotice, setPostsNotice] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin' || (user?.email && user.email.includes('admin'));

  useEffect(() => {
    let active = true;
    void fetchPublicPosts().then((res) => {
      if (!active) return;
      setPosts(res.posts);
      setPostsNotice(res.notice || null);
      setLoadingPosts(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleOpenNewPost = () => {
    setEditingPost(null);
    setPostTitle('');
    setPostSummary('');
    setPostContent('');
    setPostCategory('Tính năng mới');
    setContentTab('edit');
    setErrorMsg(null);
    setIsPostModalOpen(true);
  };

  const handleStartEdit = (post: PostItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPost(post);
    setPostTitle(post.title);
    setPostSummary(post.summary || '');
    setPostContent(post.content);
    setPostCategory(post.category);
    setContentTab('edit');
    setErrorMsg(null);
    setIsPostModalOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề và nội dung bài viết.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingPost) {
        const updated = await updatePost(editingPost.id, {
          title: postTitle,
          summary: postSummary,
          content: postContent,
          category: postCategory,
        });
        setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? updated : p)));
        if (activePost?.id === editingPost.id) {
          setActivePost(updated);
        }
        setIsPostModalOpen(false);
        setSuccessMsg('Đã cập nhật bài viết thành công!');
      } else {
        const created = await createPost({
          title: postTitle,
          summary: postSummary,
          content: postContent,
          category: postCategory,
        });
        setPosts((prev) => [created, ...prev]);
        setIsPostModalOpen(false);
        setSuccessMsg('Đăng bài viết mới thành công!');
      }
      setPostTitle('');
      setPostSummary('');
      setPostContent('');
      setEditingPost(null);
      setContentTab('edit');
      window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể lưu bài viết.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (activePost?.id === postId) setActivePost(null);
      setSuccessMsg('Đã xóa bài viết.');
      window.setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa bài viết.');
    }
  };

  const featureCards = [
    {
      title: 'Luyện viết Kanji chuẩn nét',
      desc: 'Chấm điểm từng nét, hướng dẫn thứ tự viết chuẩn xác với 2.136 chữ Kanji Jōyō.',
      icon: PenTool,
      path: '/kanji',
      badge: 'Chấm điểm AI',
      color: 'from-teal-500 to-emerald-600',
      bgLight: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    {
      title: 'Thư mục & Flashcard SRS',
      desc: 'Hệ thống lặp lại ngắt quãng (SRS) ghi nhớ vĩnh viễn với cấu trúc thư mục trực quan.',
      icon: BookOpen,
      path: '/decks',
      badge: 'SRS thông minh',
      color: 'from-emerald-500 to-teal-700',
      bgLight: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      title: 'Đấu trường Kanji 1v1',
      desc: 'Thách đấu tốc độ phản xạ Hán-Việt, âm On/Kun với người học khác trên toàn quốc.',
      icon: Swords,
      path: '/arena',
      badge: 'Trực tuyến',
      color: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      title: 'Streak Bạn bè & Bảng xếp hạng',
      desc: 'Duy trì chuỗi lửa học tập mỗi ngày cùng bạn bè, bảo vệ streak bằng Băng cứu hộ.',
      icon: Flame,
      path: '/leaderboard',
      badge: 'Cộng đồng',
      color: 'from-rose-500 to-red-600',
      bgLight: 'bg-rose-50 text-rose-800 border-rose-200',
    },
    {
      title: 'Kho Kanji N5 - N1 & Jōyō',
      desc: 'Tra cứu danh sách chữ Hán theo cấp độ JLPT, bộ thủ, số nét và từ ghép thông dụng.',
      icon: GraduationCap,
      path: '/levels',
      badge: 'JLPT Chuẩn',
      color: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      title: 'Tra cứu, Vẽ tay & OCR',
      desc: 'Nhận diện chữ Hán qua nét vẽ tay trực tiếp hoặc quét ảnh chụp màn hình bằng Tesseract.',
      icon: Search,
      path: '/search',
      badge: 'Nhận diện AI',
      color: 'from-violet-500 to-purple-600',
      bgLight: 'bg-violet-50 text-violet-800 border-violet-200',
    },
  ];

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-50/90 via-emerald-50/40 to-white rounded-3xl border border-teal-200/80 p-6 sm:p-10 lg:p-12 text-slate-900 shadow-sm">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 top-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100 border border-teal-300 text-teal-800 text-xs font-bold">
            <span>Nền tảng học tiếng Nhật &amp; Luyện viết Kanji toàn diện</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Chinh phục Chữ Hán &amp; Từ vựng tiếng Nhật thông minh
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Luyện viết chuẩn thứ tự nét có chấm điểm AI, ghi nhớ vĩnh viễn với Flashcard SRS, thách đấu trực tuyến và duy trì chuỗi lửa học tập cùng bạn bè.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/kanji"
              className="px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold shadow-md shadow-teal-700/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <PenTool className="w-4 h-4" />
              <span>Bắt đầu luyện viết</span>
            </Link>

            <Link
              to="/decks"
              className="px-5 py-3 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-800 text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <BookOpen className="w-4 h-4 text-teal-700" />
              <span>Thư mục bài học SRS</span>
            </Link>

            <Link
              to="/arena"
              className="px-5 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Swords className="w-4 h-4 text-amber-700" />
              <span>Đấu trường Kanji</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Success Toast Notification */}
      {successMsg && (
        <div className="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Quick Navigation Menu Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Khám phá chức năng chính
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Điều hướng nhanh đến các công cụ học tập chuyên sâu
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link
                key={idx}
                to={card.path}
                className="group bg-white rounded-2xl border border-slate-200/90 hover:border-teal-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${card.bgLight}`}>
                      {card.badge}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700 group-hover:translate-x-1 transition-transform">
                  <span>Trải nghiệm ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Announcements & Feature Updates Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center text-xs font-bold text-teal-700 uppercase tracking-wider mb-1">
              <span>Bảng tin &amp; Thông báo</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Tin tức & Cập nhật tính năng mới
            </h2>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenNewPost}
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-2xs whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng bài viết mới</span>
            </button>
          )}
        </div>

        {postsNotice && isAdmin && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{postsNotice}</span>
            </div>
          </div>
        )}

        {loadingPosts ? (
          <div className="py-12 text-center text-xs text-slate-400">Đang tải bảng tin...</div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">Chưa có thông báo nào.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => setActivePost(post)}
                className="group bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-teal-300 p-5 sm:p-6 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-teal-800 px-2.5 py-1 bg-teal-50 rounded-lg border border-teal-200">
                      {post.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(post.created_at).toLocaleDateString('vi-VN')}
                      </span>
                      {isAdmin && (
                        <div className="flex items-center gap-1 pl-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleStartEdit(post, e)}
                            title="Chỉnh sửa bài viết"
                            className="p-1 rounded-lg bg-white border border-slate-200 hover:border-teal-400 hover:text-teal-700 text-slate-500 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeletePost(post.id, e)}
                            title="Xóa bài viết"
                            className="p-1 rounded-lg bg-white border border-slate-200 hover:border-rose-400 hover:text-rose-600 text-slate-500 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {stripMarkdown(post.summary || post.content)}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {post.author_name || 'Ban Quản Trị'}
                  </span>

                  <span className="text-teal-700 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>Đọc tiếp</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Post Reader Modal */}
      {activePost && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setActivePost(null)}
              className="absolute right-4 top-4 w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-3 pr-8">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-teal-800 px-2.5 py-1 bg-teal-50 rounded-lg border border-teal-200">
                  {activePost.category}
                </span>
                <span>·</span>
                <span className="tabular-nums">
                  {new Date(activePost.created_at).toLocaleDateString('vi-VN')}
                </span>
                <span>·</span>
                <span>Tác giả: {activePost.author_name || 'Ban Quản Trị'}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {activePost.title}
              </h2>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <MarkdownRenderer content={activePost.content} />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(activePost)}
                    className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 text-teal-700" />
                    <span>Sửa bài viết</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePost(activePost.id)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa bài viết</span>
                  </button>
                </div>
              ) : <div />}

              <button
                type="button"
                onClick={() => setActivePost(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Post Modal (Tạo mới & Chỉnh sửa) */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl p-6 sm:p-8 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPost ? 'Chỉnh sửa bài viết' : 'Đăng bài viết & Thông báo mới'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsPostModalOpen(false);
                  setEditingPost(null);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePost} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tiêu đề bài viết</label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Nhập tiêu đề thông báo / tính năng..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Danh mục</label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  >
                    <option value="Tính năng mới">Tính năng mới</option>
                    <option value="Thông báo">Thông báo</option>
                    <option value="Cập nhật">Cập nhật hệ thống</option>
                    <option value="Mẹo học tập">Mẹo học tập</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Tóm tắt ngắn</label>
                  <input
                    type="text"
                    value={postSummary}
                    onChange={(e) => setPostSummary(e.target.value)}
                    placeholder="Mô tả ngắn gọn..."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Nội dung chi tiết (Markdown)</label>
                  <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setContentTab('edit')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        contentTab === 'edit'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Soạn thảo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentTab('preview')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        contentTab === 'preview'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3 h-3 text-teal-700" />
                      <span>Xem trước</span>
                    </button>
                  </div>
                </div>

                {contentTab === 'edit' ? (
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={7}
                    placeholder="Nhập nội dung bài viết theo định dạng Markdown (# Tiêu đề, **in đậm**, - danh sách, v.v.)..."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 font-sans"
                    required
                  />
                ) : (
                  <div className="min-h-[168px] max-h-[260px] overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    {postContent.trim() ? (
                      <MarkdownRenderer content={postContent} />
                    ) : (
                      <p className="text-xs text-slate-400 italic">Chưa có nội dung để xem trước...</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPostModalOpen(false);
                    setEditingPost(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  {isSubmitting
                    ? 'Đang lưu...'
                    : editingPost
                    ? 'Lưu thay đổi'
                    : 'Đăng bài viết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
