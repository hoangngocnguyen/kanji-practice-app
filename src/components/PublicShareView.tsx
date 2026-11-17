import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Globe,
  Download,
  Play,
  ArrowLeft,
  Volume2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  Heart,
  UserPlus,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  fetchPublicSharedDeck,
  isSupabaseConfigured,
  PublicSharedDeckRecord,
} from '../utils/supabaseClient';
import { useDecks } from '../context/DeckContext';
import { useAuth } from '../context/AuthContext';
import { speakJapanese } from '../utils/speech';
import { cleanMeaningsList, cleanReadingsList } from '../utils/kanjiApi';
import {
  apiGetDeckCommunityMeta,
  apiRecordDeckDownload,
  apiToggleDeckLike,
  apiToggleFollowUser,
  DeckCommunityMeta,
} from '../services/communityService';

interface GuestCard {
  id: string;
  type: 'kanji' | 'compound';
  front: string;
  hanViet: string;
  reading: string;
  meaning: string;
}

function getInitials(name: string): string {
  const parts = (name || 'U').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export const PublicShareView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { importDeckBundle } = useDecks();
  const { user, openAuthGuard } = useAuth();

  const [record, setRecord] = useState<PublicSharedDeckRecord | null>(null);
  const [meta, setMeta] = useState<DeckCommunityMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [likeBusy, setLikeBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

  // Guest in-memory flashcard mode
  const [isPracticing, setIsPracticing] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!slug) {
        setError('Liên kết chia sẻ không hợp lệ.');
        setLoading(false);
        return;
      }
      if (!isSupabaseConfigured()) {
        setError(
          'Ứng dụng chưa cấu hình biến môi trường Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY) để tải bộ bài công khai.'
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [data, metaData] = await Promise.all([
          fetchPublicSharedDeck(slug),
          apiGetDeckCommunityMeta(slug).catch(() => null),
        ]);
        if (!active) return;
        if (!data) {
          setError('Không tìm thấy bộ ôn tập này hoặc tác giả đã tắt chia sẻ.');
        } else {
          setRecord(data);
          if (metaData) {
            setMeta(metaData);
          }
        }
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Không thể tải bộ ôn tập từ máy chủ.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [slug, user?.id]);

  const guestCards: GuestCard[] = useMemo(() => {
    if (!record?.bundle?.items) return [];
    const list: GuestCard[] = [];
    for (const item of record.bundle.items) {
      const cleanReadings = [
        ...cleanReadingsList(item.onReadings),
        ...cleanReadingsList(item.kunReadings),
      ];
      const cleanMeanings = cleanMeaningsList(item.meanings);

      list.push({
        id: `k-${item.id}`,
        type: 'kanji',
        front: item.kanji,
        hanViet: item.hanViet,
        reading: cleanReadings.join(', '),
        meaning: cleanMeanings.join(', '),
      });
      for (const cw of item.compoundWords || []) {
        list.push({
          id: `cw-${cw.id}`,
          type: 'compound',
          front: cw.word,
          hanViet: cw.hanViet,
          reading: cw.reading,
          meaning: cw.meaning,
        });
      }
    }
    return list;
  }, [record]);

  const handleSaveToMyDecks = async () => {
    if (!record?.bundle || !slug) return;
    importDeckBundle(record.bundle, null, true);
    setSavedSuccess(true);

    // Record download on backend once per browser session per slug
    const sessionKey = `kanji_share_dl_${slug}`;
    let alreadyRecorded = false;
    try {
      alreadyRecorded = sessionStorage.getItem(sessionKey) === '1';
      if (!alreadyRecorded) sessionStorage.setItem(sessionKey, '1');
    } catch {}

    if (!alreadyRecorded) {
      try {
        const res = await apiRecordDeckDownload(slug);
        setMeta((prev) =>
          prev ? { ...prev, downloadsCount: res.downloadsCount } : prev
        );
      } catch {
        // Non-blocking for user import
      }
    }

    setTimeout(() => {
      navigate('/decks');
    }, 800);
  };

  const handleToggleLike = async () => {
    if (!slug) return;
    if (!user) {
      openAuthGuard('Thích bộ thẻ chia sẻ');
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      const res = await apiToggleDeckLike(slug);
      setMeta((prev) =>
        prev
          ? {
              ...prev,
              viewerLiked: res.liked,
              likesCount: res.likesCount,
              likedBy: res.likedBy,
            }
          : prev
      );
    } catch {
      // Ignore transient error
    } finally {
      setLikeBusy(false);
    }
  };

  const handleToggleFollow = async () => {
    const authorId = meta?.author.id || record?.owner_id;
    if (!authorId) return;
    if (!user) {
      openAuthGuard('Theo dõi tác giả');
      return;
    }
    if (user.id === authorId || followBusy) return;
    setFollowBusy(true);
    try {
      const res = await apiToggleFollowUser(authorId);
      setMeta((prev) =>
        prev
          ? {
              ...prev,
              author: {
                ...prev.author,
                isFollowing: res.isFollowing,
                followersCount: res.followersCount,
              },
            }
          : prev
      );
    } catch {
      // Ignore transient error
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
        Đang tải bộ ôn tập được chia sẻ...
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Không thể mở bộ bài chia sẻ</h2>
        <p className="text-xs text-slate-600">{error}</p>
        <Link
          to="/decks"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về thư mục của tôi</span>
        </Link>
      </div>
    );
  }

  if (isPracticing && guestCards.length > 0) {
    const current = guestCards[cardIndex];
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsPracticing(false)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-teal-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </button>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {cardIndex + 1} / {guestCards.length}
          </span>
        </div>

        <div
          onClick={() => setIsFlipped((f) => !f)}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[300px] p-8 flex flex-col justify-between cursor-pointer select-none"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-teal-800">
              {current.type === 'kanji' ? 'Thẻ Chữ Kanji' : 'Thẻ Từ Ghép'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                speakJapanese(current.front);
              }}
              className="p-2 text-slate-400 hover:text-teal-700 rounded-lg cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {!isFlipped ? (
            <div className="py-10 text-center space-y-3">
              <div className="font-kanji font-black text-6xl text-slate-900">{current.front}</div>
              <p className="text-xs text-slate-400">Nhấn vào thẻ để xem đáp án</p>
            </div>
          ) : (
            <div className="py-6 text-center space-y-3">
              <div className="font-kanji font-black text-4xl text-teal-900">{current.front}</div>
              {current.hanViet && (
                <div className="text-sm font-bold text-teal-700">{current.hanViet}</div>
              )}
              {current.reading && (
                <div className="font-mono text-sm text-slate-700">{current.reading}</div>
              )}
              <div className="text-base font-semibold text-slate-900 pt-1">
                {current.meaning || '—'}
              </div>
            </div>
          )}

          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <RotateCw className="w-3 h-3" />
            <span>Lật thẻ</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={cardIndex === 0}
            onClick={() => {
              setCardIndex((i) => Math.max(0, i - 1));
              setIsFlipped(false);
            }}
            className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Thẻ trước</span>
          </button>
          <button
            type="button"
            disabled={cardIndex >= guestCards.length - 1}
            onClick={() => {
              setCardIndex((i) => Math.min(guestCards.length - 1, i + 1));
              setIsFlipped(false);
            }}
            className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Thẻ tiếp theo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const authorId = meta?.author.id || record.owner_id;
  const authorName = meta?.author.displayName || record.author_name;
  const likesCount = meta?.likesCount ?? record.likes_count ?? 0;
  const downloadsCount = meta?.downloadsCount ?? record.downloads_count ?? 0;
  const likedBy = meta?.likedBy || [];
  const viewerLiked = Boolean(meta?.viewerLiked);
  const isSelfAuthor = Boolean(user && authorId && user.id === authorId);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center flex-wrap gap-2 text-xs text-teal-800 font-semibold">
              <Globe className="w-4 h-4 shrink-0" />
              <span>Bộ ôn tập cộng đồng</span>
              {authorId && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="text-slate-500 font-normal">Tác giả:</span>
                  <Link
                    to={`/u/${authorId}`}
                    className="inline-flex items-center gap-1.5 font-bold text-slate-900 hover:text-teal-700 transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                      {getInitials(authorName)}
                    </span>
                    <span>{authorName}</span>
                  </Link>
                  {meta && (
                    <span className="text-slate-400 font-normal tabular-nums">
                      ({meta.author.followersCount} người theo dõi)
                    </span>
                  )}
                  {!isSelfAuthor && (
                    <button
                      type="button"
                      disabled={followBusy}
                      onClick={() => void handleToggleFollow()}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                        meta?.author.isFollowing
                          ? 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-teal-300'
                      }`}
                    >
                      {meta?.author.isFollowing ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          <span>Đang theo dõi</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Theo dõi</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-slate-900">{record.title}</h1>

            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 tabular-nums">
              <span>{record.bundle.folders.length} thư mục</span>
              <span aria-hidden="true">·</span>
              <span>{record.bundle.items.length} chữ Kanji</span>
              <span aria-hidden="true">·</span>
              <span>{guestCards.length} thẻ Flashcard</span>
              <span aria-hidden="true">·</span>
              <span>{downloadsCount} lượt tải</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setShowLikers((v) => !v)}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-rose-600 font-medium cursor-pointer"
                title="Xem danh sách người đã thích"
              >
                <span>{likesCount} lượt thích</span>
              </button>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <button
              type="button"
              disabled={likeBusy}
              onClick={() => void handleToggleLike()}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap ${
                viewerLiked
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50/70 hover:text-rose-700'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  viewerLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-500'
                }`}
              />
              <span>{viewerLiked ? 'Đã thích' : 'Thích'}</span>
              <span>({likesCount})</span>
            </button>

            <button
              type="button"
              disabled={guestCards.length === 0}
              onClick={() => {
                setCardIndex(0);
                setIsFlipped(false);
                setIsPracticing(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ôn Flashcard ngay</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSaveToMyDecks()}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span>{savedSuccess ? 'Đã lưu!' : 'Lưu về thư mục của tôi'}</span>
            </button>
          </div>
        </div>

        {/* Who liked this shared deck */}
        {(showLikers || likedBy.length > 0) && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => setShowLikers((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-rose-500" />
              <span className="tabular-nums">
                {likedBy.length > 0
                  ? `${likedBy.length} người đã thích bộ thẻ này`
                  : 'Chưa có ai thích bộ thẻ này'}
              </span>
            </button>

            {showLikers && likedBy.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {likedBy.map((liker) => (
                  <Link
                    key={liker.id}
                    to={`/u/${liker.id}`}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-xs transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {getInitials(liker.displayName)}
                    </span>
                    <span className="font-semibold text-slate-800">{liker.displayName}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100">
        {record.bundle.items.map((item) => {
          const cleanMeanings = cleanMeaningsList(item.meanings);
          return (
            <div key={item.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-kanji text-xl font-black text-slate-900">
                    {item.kanji}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{item.hanViet || '—'}</div>
                    <div className="text-xs text-slate-600">
                      {cleanMeanings.length > 0 ? cleanMeanings.join(', ') : 'Chưa có nghĩa'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => speakJapanese(item.kanji)}
                  className="p-2 text-slate-400 hover:text-teal-700 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {item.compoundWords && item.compoundWords.length > 0 && (
                <div className="pl-13 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  {item.compoundWords.map((cw) => (
                    <span key={cw.id}>
                      <strong className="font-kanji text-slate-900">{cw.word}</strong>{' '}
                      <span className="font-mono text-slate-500">({cw.reading})</span>: {cw.meaning}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
