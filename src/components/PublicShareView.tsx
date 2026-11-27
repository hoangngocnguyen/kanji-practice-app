import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import {
  fetchPublicSharedDeck,
  isSupabaseConfigured,
  PublicSharedDeckRecord,
} from '../utils/supabaseClient';
import { useDecks } from '../context/DeckContext';
import { useAuth } from '../context/AuthContext';
import { usePageLoadingIndicator } from '../context/LoadingContext';
import { PublicShareViewSkeleton } from './PageSkeletons';
import { speakJapanese } from '../utils/speech';
import { cleanMeaningsList, cleanReadingsList } from '../utils/kanjiApi';
import {
  apiGetDeckCommunityMeta,
  apiRecordDeckDownload,
  apiToggleDeckLike,
  apiToggleFollowUser,
  DeckCommunityMeta,
} from '../services/communityService';
import { FolderKanjiItem, StudyFolder } from '../types/deck';
import { buildFolderTreeIndex } from '../utils/folderTree';
import { FolderTreeExplorer } from './FolderTreeExplorer';
import { FolderKanjiTable } from './FolderKanjiTable';
import { UserAvatar } from './UserAvatar';

interface GuestCard {
  id: string;
  type: 'kanji' | 'compound';
  front: string;
  hanViet: string;
  reading: string;
  meaning: string;
}

type PracticeScope =
  | { kind: 'all'; title: string }
  | { kind: 'folder'; folderId: string; title: string; includeSubfolders: boolean };

function buildGuestCardsFromItems(items: FolderKanjiItem[]): GuestCard[] {
  const list: GuestCard[] = [];
  for (const item of items) {
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
}

export const PublicShareView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { importDeckBundle } = useDecks();
  const { user, displayName, avatarUrl, openAuthGuard } = useAuth();

  const [record, setRecord] = useState<PublicSharedDeckRecord | null>(null);
  const [meta, setMeta] = useState<DeckCommunityMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [showLikers, setShowLikers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Latest-intent refs for rapid optimistic toggling without UI locking
  const likeSeqRef = useRef(0);
  const followSeqRef = useRef(0);

  // Guest in-memory flashcard mode
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceScope, setPracticeScope] = useState<PracticeScope | null>(null);
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
      setActionError(null);
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

  const normalizedFolders: StudyFolder[] = useMemo(() => {
    if (!record?.bundle) return [];
    const rawFolders = record.bundle.folders || [];
    if (rawFolders.length > 0) return rawFolders;
    // Fallback virtual folder for legacy bundles without folder metadata
    return [
      {
        id: record.bundle.rootFolderId || 'shared-root',
        parentId: null,
        name: record.title,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
  }, [record]);

  const normalizedItems: FolderKanjiItem[] = useMemo(() => {
    if (!record?.bundle) return [];
    const items = record.bundle.items || [];
    if ((record.bundle.folders || []).length > 0 || normalizedFolders.length === 0) {
      return items;
    }
    const fallbackId = normalizedFolders[0].id;
    return items.map((it) => ({ ...it, folderId: fallbackId }));
  }, [record, normalizedFolders]);

  const folderTree = useMemo(
    () =>
      buildFolderTreeIndex(
        normalizedFolders,
        normalizedItems,
        record?.bundle?.rootFolderId
      ),
    [normalizedFolders, normalizedItems, record?.bundle?.rootFolderId]
  );

  useEffect(() => {
    setSearchQuery('');
    setIsPracticing(false);
    setPracticeScope(null);
  }, [slug]);

  const folderParam = searchParams.get('folder');
  const activeFolderId =
    folderParam && folderTree.folderMap.has(folderParam) ? folderParam : null;

  const openFolderDetail = (folderId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('folder', folderId);
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToFolderTree = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('folder');
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allGuestCards: GuestCard[] = useMemo(
    () => buildGuestCardsFromItems(normalizedItems),
    [normalizedItems]
  );

  const practiceCards: GuestCard[] = useMemo(() => {
    if (!practiceScope || practiceScope.kind === 'all') {
      return allGuestCards;
    }
    const scopedItems = practiceScope.includeSubfolders
      ? folderTree.getItemsRecursive(practiceScope.folderId)
      : folderTree.getItemsDirect(practiceScope.folderId);
    return buildGuestCardsFromItems(scopedItems);
  }, [practiceScope, allGuestCards, folderTree]);

  const startPracticeAll = () => {
    if (!record || allGuestCards.length === 0) return;
    setPracticeScope({ kind: 'all', title: record.title });
    setCardIndex(0);
    setIsFlipped(false);
    setIsPracticing(true);
  };

  const startPracticeFolder = (folderId: string, includeSubfolders = true) => {
    const folder = folderTree.folderMap.get(folderId);
    const items = includeSubfolders
      ? folderTree.getItemsRecursive(folderId)
      : folderTree.getItemsDirect(folderId);
    if (items.length === 0) return;
    setPracticeScope({
      kind: 'folder',
      folderId,
      title: folder?.name || record?.title || 'Thư mục',
      includeSubfolders,
    });
    setCardIndex(0);
    setIsFlipped(false);
    setIsPracticing(true);
  };

  useEffect(() => {
    if (!isPracticing || practiceCards.length === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCardIndex((i) => Math.max(0, i - 1));
        setIsFlipped(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCardIndex((i) => Math.min(practiceCards.length - 1, i + 1));
        setIsFlipped(false);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsPracticing(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPracticing, practiceCards.length]);

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

  const handleToggleLike = () => {
    if (!slug || !record) return;
    if (!user) {
      openAuthGuard('Thích bộ thẻ chia sẻ');
      return;
    }

    const baseMeta: DeckCommunityMeta = meta ?? {
      slug,
      likesCount: record.likes_count ?? 0,
      downloadsCount: record.downloads_count ?? 0,
      viewerLiked: false,
      likedBy: [],
      author: {
        id: record.owner_id,
        displayName: record.author_name || 'Thành viên',
        avatarUrl: null,
        followersCount: 0,
        isFollowing: false,
      },
    };

    const prevMetaSnapshot = meta;
    const nextLiked = !baseMeta.viewerLiked;
    const nextLikesCount = Math.max(0, baseMeta.likesCount + (nextLiked ? 1 : -1));
    const filteredLikedBy = baseMeta.likedBy.filter((l) => l.id !== user.id);
    const nextLikedBy = nextLiked
      ? [
          {
            id: user.id,
            displayName: displayName || 'Thành viên',
            avatarUrl: avatarUrl || null,
            likedAt: new Date().toISOString(),
          },
          ...filteredLikedBy,
        ]
      : filteredLikedBy;

    // 1. Instant Optimistic UI (<16ms)
    setActionError(null);
    setMeta({
      ...baseMeta,
      viewerLiked: nextLiked,
      likesCount: nextLikesCount,
      likedBy: nextLikedBy,
    });

    // 2. Background persistence with latest-intent guard
    const reqSeq = ++likeSeqRef.current;
    void apiToggleDeckLike(slug, nextLiked)
      .then((res) => {
        if (likeSeqRef.current !== reqSeq) return;
        setMeta((curr) =>
          curr
            ? {
                ...curr,
                viewerLiked: res.liked,
                likesCount: res.likesCount,
                likedBy: res.likedBy,
              }
            : curr
        );
      })
      .catch((err: any) => {
        if (likeSeqRef.current !== reqSeq) return;
        setMeta(prevMetaSnapshot);
        setActionError(err?.message || 'Không thể lưu lượt thích. Vui lòng thử lại.');
      });
  };

  const handleToggleFollow = () => {
    if (!record) return;
    const authorId = meta?.author.id || record.owner_id;
    if (!authorId) return;
    if (!user) {
      openAuthGuard('Theo dõi tác giả');
      return;
    }
    if (user.id === authorId) return;

    const baseMeta: DeckCommunityMeta = meta ?? {
      slug: record.slug,
      likesCount: record.likes_count ?? 0,
      downloadsCount: record.downloads_count ?? 0,
      viewerLiked: false,
      likedBy: [],
      author: {
        id: authorId,
        displayName: record.author_name || 'Thành viên',
        avatarUrl: null,
        followersCount: 0,
        isFollowing: false,
      },
    };

    const prevMetaSnapshot = meta;
    const nextFollowing = !baseMeta.author.isFollowing;
    const nextFollowersCount = Math.max(
      0,
      baseMeta.author.followersCount + (nextFollowing ? 1 : -1)
    );

    // 1. Instant Optimistic UI (<16ms)
    setActionError(null);
    setMeta({
      ...baseMeta,
      author: {
        ...baseMeta.author,
        isFollowing: nextFollowing,
        followersCount: nextFollowersCount,
      },
    });

    // 2. Background persistence with latest-intent guard
    const reqSeq = ++followSeqRef.current;
    void apiToggleFollowUser(authorId, nextFollowing)
      .then((res) => {
        if (followSeqRef.current !== reqSeq) return;
        setMeta((curr) =>
          curr
            ? {
                ...curr,
                author: {
                  ...curr.author,
                  isFollowing: res.isFollowing,
                  followersCount: res.followersCount,
                },
              }
            : curr
        );
      })
      .catch((err: any) => {
        if (followSeqRef.current !== reqSeq) return;
        setMeta(prevMetaSnapshot);
        setActionError(err?.message || 'Không thể cập nhật theo dõi. Vui lòng thử lại.');
      });
  };

  usePageLoadingIndicator('public-share', loading);

  if (loading) {
    return <PublicShareViewSkeleton />;
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

  if (isPracticing && practiceCards.length > 0) {
    const safeIdx = Math.min(cardIndex, practiceCards.length - 1);
    const current = practiceCards[safeIdx];
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsPracticing(false)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-teal-800 cursor-pointer min-h-[36px] shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại bộ thẻ</span>
          </button>
          <span className="text-xs font-semibold text-slate-800 truncate text-center">
            {practiceScope?.title || record.title}
          </span>
          <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
            {safeIdx + 1} / {practiceCards.length}
          </span>
        </div>

        <div
          onClick={() => setIsFlipped((f) => !f)}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[300px] p-6 sm:p-8 flex flex-col justify-between cursor-pointer select-none"
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
              className="p-2 text-slate-400 hover:text-teal-700 rounded-lg cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Nghe phát âm"
              aria-label="Nghe phát âm"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {!isFlipped ? (
            <div className="py-10 text-center space-y-3">
              <div className="font-kanji font-black text-6xl text-slate-900">{current.front}</div>
              <p className="text-xs text-slate-400">Nhấn vào thẻ hoặc phím Space để xem đáp án</p>
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
            disabled={safeIdx === 0}
            onClick={() => {
              setCardIndex((i) => Math.max(0, i - 1));
              setIsFlipped(false);
            }}
            className="flex-1 py-2.5 min-h-[44px] bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Thẻ trước</span>
          </button>
          <button
            type="button"
            disabled={safeIdx >= practiceCards.length - 1}
            onClick={() => {
              setCardIndex((i) => Math.min(practiceCards.length - 1, i + 1));
              setIsFlipped(false);
            }}
            className="flex-1 py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
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

  if (activeFolderId) {
    return (
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={backToFolderTree}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-800 transition-colors cursor-pointer min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách thư mục</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-slate-500 truncate max-w-[260px]">
              Bộ thẻ: <strong className="text-slate-800">{record.title}</strong>
            </span>
            <button
              type="button"
              onClick={() => void handleSaveToMyDecks()}
              className="px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[36px] active:scale-95"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Đã lưu!' : 'Lưu về thư mục của tôi'}</span>
            </button>
          </div>
        </div>

        <FolderKanjiTable
          onStartReview={() => startPracticeFolder(activeFolderId, true)}
          onSelectFolder={openFolderDetail}
          readOnlyBundle={{
            folders: normalizedFolders,
            items: normalizedItems,
            rootFolderId: record.bundle.rootFolderId,
            selectedFolderId: activeFolderId,
            searchQuery,
            onClearSearch: () => setSearchQuery(''),
            onStartPractice: (folderId, includeSubfolders) =>
              startPracticeFolder(folderId, includeSubfolders),
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1.5 text-xs text-teal-800 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-4 h-4 shrink-0" />
                <span>Bộ ôn tập cộng đồng</span>
              </span>
              {authorId && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <div className="inline-flex items-center flex-wrap gap-1.5">
                    <span className="text-slate-500 font-normal">Tác giả:</span>
                    <Link
                      to={`/u/${authorId}`}
                      className="inline-flex items-center gap-1.5 font-bold text-slate-900 hover:text-teal-700 transition-colors"
                    >
                      <UserAvatar
                        name={authorName}
                        avatarUrl={meta?.author.avatarUrl}
                        sizeClass="w-5 h-5"
                        textSizeClass="text-[10px]"
                      />
                      <span>{authorName}</span>
                    </Link>
                    {meta && (
                      <Link
                        to={`/u/${authorId}`}
                        className="text-slate-400 hover:text-teal-700 font-normal tabular-nums"
                      >
                        ({meta.author.followersCount} người theo dõi)
                      </Link>
                    )}
                    {!isSelfAuthor && (
                      <button
                        type="button"
                        onClick={handleToggleFollow}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap min-h-[30px] active:scale-95 ${
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
                  </div>
                </>
              )}
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-slate-900 break-words">
              {record.title}
            </h1>

            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 tabular-nums">
              <span>{normalizedFolders.length} thư mục</span>
              <span aria-hidden="true">·</span>
              <span>{normalizedItems.length} chữ Kanji</span>
              <span aria-hidden="true">·</span>
              <span>{allGuestCards.length} thẻ Flashcard</span>
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
              onClick={handleToggleLike}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer tabular-nums whitespace-nowrap min-h-[40px] active:scale-95 ${
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
              disabled={allGuestCards.length === 0}
              onClick={startPracticeAll}
              className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px] active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ôn toàn bộ</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSaveToMyDecks()}
              className="px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px] active:scale-95"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span>{savedSuccess ? 'Đã lưu!' : 'Lưu về thư mục của tôi'}</span>
            </button>
          </div>
        </div>

        {actionError && (
          <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{actionError}</span>
            </span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Who liked this shared deck */}
        {(showLikers || likedBy.length > 0) && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => setShowLikers((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer min-h-[32px]"
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
                    <UserAvatar
                      name={liker.displayName}
                      avatarUrl={liker.avatarUrl}
                      sizeClass="w-5 h-5"
                      textSizeClass="text-[10px]"
                    />
                    <span className="font-semibold text-slate-800">{liker.displayName}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hierarchical Folder Structure Tree (Click a folder to open its Kanji list) */}
      <FolderTreeExplorer
        folders={normalizedFolders}
        items={normalizedItems}
        rootFolderId={record.bundle.rootFolderId}
        onSelectFolder={openFolderDetail}
        onPracticeFolder={(folderId) => startPracticeFolder(folderId, true)}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />
    </div>
  );
};
