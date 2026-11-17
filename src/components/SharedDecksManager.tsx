import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Heart,
  Download,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDecks } from '../context/DeckContext';
import {
  apiGetMyShares,
  apiUnpublishShareBySlug,
  MySharedDeckItem,
} from '../services/communityService';

function getInitials(name: string): string {
  const parts = (name || 'U').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export const SharedDecksManager: React.FC = () => {
  const { user, openAuthModal, supabaseEnabled } = useAuth();
  const { folders, publishFolderPublicly, unpublishFolderPublicly } = useDecks();

  const [shares, setShares] = useState<MySharedDeckItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [expandedLikesSlug, setExpandedLikesSlug] = useState<string | null>(null);
  const [confirmUnpublishSlug, setConfirmUnpublishSlug] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    if (!user) {
      setShares([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetMyShares();
      setShares(res.shares || []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách bộ thẻ đã chia sẻ.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadShares();
  }, [loadShares]);

  const totalLikes = useMemo(
    () => shares.reduce((sum, s) => sum + (s.likesCount || 0), 0),
    [shares]
  );
  const totalDownloads = useMemo(
    () => shares.reduce((sum, s) => sum + (s.downloadsCount || 0), 0),
    [shares]
  );

  const localFolderBySlug = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach((f) => {
      if (f.shareSlug) map.set(f.shareSlug, f.id);
    });
    return map;
  }, [folders]);

  const handleCopyShareLink = async (slug: string) => {
    const url = `${window.location.origin}/share/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      window.setTimeout(() => {
        setCopiedSlug((prev) => (prev === slug ? null : prev));
      }, 2000);
    } catch {
      setNotice(`Link chia sẻ: ${url}`);
    }
  };

  const handleRepublish = async (share: MySharedDeckItem) => {
    const localId =
      (share.rootFolderId && folders.some((f) => f.id === share.rootFolderId)
        ? share.rootFolderId
        : null) || localFolderBySlug.get(share.slug);
    if (!localId) return;

    setBusySlug(share.slug);
    setError(null);
    setNotice(null);
    try {
      await publishFolderPublicly(localId);
      await loadShares();
      setNotice(`Đã cập nhật bản chia sẻ mới nhất cho "${share.title}".`);
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật bản chia sẻ.');
    } finally {
      setBusySlug(null);
    }
  };

  const handleUnpublish = async (share: MySharedDeckItem) => {
    const localId =
      (share.rootFolderId && folders.some((f) => f.id === share.rootFolderId)
        ? share.rootFolderId
        : null) || localFolderBySlug.get(share.slug);

    setBusySlug(share.slug);
    setError(null);
    setNotice(null);
    try {
      if (localId) {
        await unpublishFolderPublicly(localId);
      } else {
        await apiUnpublishShareBySlug(share.slug);
      }
      setShares((prev) => prev.filter((s) => s.slug !== share.slug));
      setConfirmUnpublishSlug(null);
      setNotice(`Đã tắt chia sẻ công khai bộ thẻ "${share.title}".`);
    } catch (err: any) {
      setError(err?.message || 'Không thể tắt chia sẻ bộ thẻ.');
    } finally {
      setBusySlug(null);
    }
  };

  if (!supabaseEnabled) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 text-center text-xs text-slate-500">
        Tính năng chia sẻ cộng đồng cần cấu hình Supabase để hoạt động.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-3">
        <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
          <Globe className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">
            Đăng nhập để quản lý bộ thẻ đã chia sẻ
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Theo dõi lượt thích, xem ai đã thích bài chia sẻ, thống kê lượt tải và cập nhật nội dung bộ thẻ bất kỳ lúc nào.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Đăng nhập ngay</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-5">
      {/* Header + Summary metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-700" />
            <span>Bộ thẻ đã chia sẻ của tôi</span>
          </h2>
          <p className="text-xs text-slate-500">
            Quản lý liên kết chia sẻ công khai, lượt thích, người đã thích và lượt tải về.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void loadShares()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-700 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 tabular-nums text-xs">
        <div>
          <div className="text-slate-500">Bộ đã chia sẻ</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{shares.length}</div>
        </div>
        <div>
          <div className="text-slate-500">Tổng lượt thích</div>
          <div className="text-lg font-bold text-rose-600 mt-0.5">{totalLikes}</div>
        </div>
        <div>
          <div className="text-slate-500">Tổng lượt tải</div>
          <div className="text-lg font-bold text-teal-700 mt-0.5">{totalDownloads}</div>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          {notice}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && shares.length === 0 ? (
        <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
          <span>Đang tải danh sách bộ thẻ đã chia sẻ...</span>
        </div>
      ) : shares.length === 0 ? (
        <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <Globe className="w-7 h-7 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">
            Bạn chưa chia sẻ công khai bộ thẻ nào
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Mở một thư mục bài học bất kỳ và bấm nút <strong>Chia sẻ</strong> để xuất bản liên kết cộng đồng.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {shares.map((share) => {
            const isLikesExpanded = expandedLikesSlug === share.slug;
            const isConfirmingUnpublish = confirmUnpublishSlug === share.slug;
            const isBusy = busySlug === share.slug;
            const hasLocalFolder = Boolean(
              (share.rootFolderId && folders.some((f) => f.id === share.rootFolderId)) ||
                localFolderBySlug.has(share.slug)
            );
            const updatedLabel = new Date(share.updatedAt).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            return (
              <div key={share.slug} className="p-4 space-y-3 bg-white hover:bg-slate-50/40 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link
                        to={`/share/${share.slug}`}
                        className="text-sm font-bold text-slate-900 hover:text-teal-800 truncate"
                      >
                        {share.title}
                      </Link>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 tabular-nums">
                      <span>{share.kanjiCount} chữ Kanji</span>
                      <span aria-hidden="true">·</span>
                      <span>{share.cardCount} thẻ Flashcard</span>
                      <span aria-hidden="true">·</span>
                      <span>Cập nhật {updatedLabel}</span>
                    </div>
                  </div>

                  {/* Stats + Actions */}
                  <div className="flex items-center flex-wrap gap-2 shrink-0">
                    {/* Likes toggle button to inspect WHO liked */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedLikesSlug((prev) =>
                          prev === share.slug ? null : share.slug
                        )
                      }
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap ${
                        isLikesExpanded
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-slate-50 hover:bg-rose-50/60 border-slate-200 text-slate-700'
                      }`}
                      title="Xem danh sách người đã thích bộ thẻ này"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          share.likesCount > 0
                            ? 'text-rose-500 fill-rose-500'
                            : 'text-slate-400'
                        }`}
                      />
                      <span>{share.likesCount}</span>
                      {isLikesExpanded ? (
                        <ChevronUp className="w-3 h-3 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>

                    {/* Downloads count */}
                    <span
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 border border-slate-200 text-slate-700 inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap"
                      title="Số lượt người dùng lưu bộ thẻ về máy"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-700" />
                      <span>{share.downloadsCount}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => void handleCopyShareLink(share.slug)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      {copiedSlug === share.slug ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Chép link</span>
                        </>
                      )}
                    </button>

                    <Link
                      to={`/share/${share.slug}`}
                      className="px-2.5 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở</span>
                    </Link>

                    {hasLocalFolder && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleRepublish(share)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        title="Đẩy dữ liệu mới nhất từ thư mục trên máy lên liên kết chia sẻ này"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-teal-700 ${isBusy ? 'animate-spin' : ''}`} />
                        <span>Cập nhật</span>
                      </button>
                    )}

                    {isConfirmingUnpublish ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleUnpublish(share)}
                          className="px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer whitespace-nowrap"
                        >
                          Xác nhận tắt
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmUnpublishSlug(null)}
                          className="px-2 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmUnpublishSlug(share.slug)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Tắt chia sẻ công khai"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable list of WHO liked this shared deck */}
                {isLikesExpanded && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 mb-2">
                      Người đã thích ({share.likedBy?.length || 0})
                    </div>
                    {!share.likedBy || share.likedBy.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Chưa có ai thích bộ thẻ này.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {share.likedBy.map((liker) => (
                          <Link
                            key={liker.id}
                            to={`/u/${liker.id}`}
                            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-xs transition-colors"
                          >
                            <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {getInitials(liker.displayName)}
                            </span>
                            <span className="font-semibold text-slate-800 hover:text-teal-800">
                              {liker.displayName}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
