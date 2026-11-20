import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Folder } from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import { useAuth } from '../context/AuthContext';
import { ReviewFilterMode } from '../types/deck';
import { FolderKanjiTable } from './FolderKanjiTable';
import { FlashcardSrsSession } from './FlashcardSrsSession';
import { SupabaseCloudModal } from './DeckModals';

export const DeckDetailView: React.FC = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    folders,
    cloudUser,
    supabaseEnabled,
    setSelectedFolderId,
    buildExportBundle,
    getReviewCardsForFolder,
    getItemsForFolderRecursive,
    runSyncGate,
    flushPendingSync,
  } = useDecks();
  const { requireAuthOrGuard } = useAuth();

  const folder = folders.find((f) => f.id === folderId) || null;

  const [reviewSession, setReviewSession] = useState<{
    folderId: string;
    mode: ReviewFilterMode;
    onlyDue: boolean;
  } | null>(null);

  const [shareModalFolderId, setShareModalFolderId] = useState<string | null>(null);

  const latestGetReviewCardsRef = useRef(getReviewCardsForFolder);
  latestGetReviewCardsRef.current = getReviewCardsForFolder;

  const latestGetItemsRef = useRef(getItemsForFolderRecursive);
  latestGetItemsRef.current = getItemsForFolderRecursive;

  const startReviewWithSyncGate = useCallback(
    (targetFolderId: string, mode: ReviewFilterMode, requestedOnlyDue: boolean) => {
      void runSyncGate('start_session', () => {
        const totalItems = latestGetItemsRef.current(targetFolderId).length;
        if (totalItems === 0) return;
        const dueCount = latestGetReviewCardsRef.current(
          targetFolderId,
          mode,
          true
        ).length;
        setReviewSession({
          folderId: targetFolderId,
          mode,
          // Keep onlyDue=true when due cards were requested (even if phone just finished them,
          // so FlashcardSrsSession shows "completed" instead of unexpectedly switching to cram mode).
          onlyDue: requestedOnlyDue ? true : dueCount > 0,
        });
      });
    },
    [runSyncGate]
  );

  // Sync URL folderId to DeckContext selectedFolderId
  useEffect(() => {
    if (folderId && folder) {
      setSelectedFolderId(folderId);
    }
  }, [folderId, folder, setSelectedFolderId]);

  // Run entry sync popup when opening a lesson folder directly (skip if ?review=1 handles it)
  useEffect(() => {
    if (!folder || !cloudUser || !supabaseEnabled) return;
    if (searchParams.get('review') === '1') return;
    void runSyncGate('enter_decks');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder?.id, cloudUser?.id, supabaseEnabled]);

  // Support direct ?review=1 query param from folder list
  useEffect(() => {
    if (folder && searchParams.get('review') === '1') {
      setSearchParams({}, { replace: true });
      startReviewWithSyncGate(folder.id, 'all', true);
    }
  }, [folder, searchParams, setSearchParams, startReviewWithSyncGate]);

  const handleExportFolder = (targetId: string) => {
    const bundle = buildExportBundle(targetId);
    if (!bundle) return;

    const target = folders.find((f) => f.id === targetId);
    const safeName = (target?.name || 'kanji-deck')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName || 'kanji-deck'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!folder) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-4">
        <Folder className="w-10 h-10 text-slate-300 mx-auto" />
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Không tìm thấy thư mục</h2>
          <p className="text-xs text-slate-500">
            Thư mục này có thể đã bị xóa hoặc đường dẫn không hợp lệ.
          </p>
        </div>
        <Link
          to="/decks"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách thư mục</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <Link
          to="/decks"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách thư mục</span>
        </Link>
      </div>

      <FolderKanjiTable
        onStartReview={(mode, onlyDue) =>
          startReviewWithSyncGate(folder.id, mode, onlyDue)
        }
        onExportFolder={handleExportFolder}
        onOpenShareModal={(id) =>
          requireAuthOrGuard('Chia sẻ bộ bài học công khai', () =>
            setShareModalFolderId(id)
          )
        }
        onSelectFolder={(id) => navigate(`/decks/${id}`)}
      />

      <SupabaseCloudModal
        isOpen={Boolean(shareModalFolderId)}
        shareFolderId={shareModalFolderId}
        onClose={() => setShareModalFolderId(null)}
      />

      {reviewSession && (
        <FlashcardSrsSession
          folderId={reviewSession.folderId}
          initialMode={reviewSession.mode}
          onlyDue={reviewSession.onlyDue}
          onExit={() => {
            setReviewSession(null);
            window.setTimeout(() => {
              void flushPendingSync();
            }, 50);
          }}
        />
      )}
    </div>
  );
};
