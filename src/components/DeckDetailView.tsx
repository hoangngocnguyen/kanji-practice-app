import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Folder } from 'lucide-react';
import { useDecks } from '../context/DeckContext';
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
    setSelectedFolderId,
    buildExportBundle,
    getReviewCardsForFolder,
    getItemsForFolderRecursive,
  } = useDecks();

  const folder = folders.find((f) => f.id === folderId) || null;

  const [reviewSession, setReviewSession] = useState<{
    folderId: string;
    mode: ReviewFilterMode;
    onlyDue: boolean;
  } | null>(null);

  const [shareModalFolderId, setShareModalFolderId] = useState<string | null>(null);

  // Sync URL folderId to DeckContext selectedFolderId
  useEffect(() => {
    if (folderId && folder) {
      setSelectedFolderId(folderId);
    }
  }, [folderId, folder, setSelectedFolderId]);

  // Support direct ?review=1 query param from folder list
  useEffect(() => {
    if (folder && searchParams.get('review') === '1') {
      const dueCount = getReviewCardsForFolder(folder.id, 'all', true).length;
      const totalItems = getItemsForFolderRecursive(folder.id).length;
      if (totalItems > 0) {
        setReviewSession({
          folderId: folder.id,
          mode: 'all',
          onlyDue: dueCount > 0,
        });
      }
      setSearchParams({}, { replace: true });
    }
  }, [folder, searchParams, setSearchParams, getReviewCardsForFolder, getItemsForFolderRecursive]);

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

  if (reviewSession) {
    return (
      <FlashcardSrsSession
        folderId={reviewSession.folderId}
        initialMode={reviewSession.mode}
        onlyDue={reviewSession.onlyDue}
        onExit={() => setReviewSession(null)}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
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
          setReviewSession({ folderId: folder.id, mode, onlyDue })
        }
        onExportFolder={handleExportFolder}
        onOpenShareModal={(id) => setShareModalFolderId(id)}
        onSelectFolder={(id) => navigate(`/decks/${id}`)}
      />

      <SupabaseCloudModal
        isOpen={Boolean(shareModalFolderId)}
        shareFolderId={shareModalFolderId}
        onClose={() => setShareModalFolderId(null)}
      />
    </div>
  );
};
