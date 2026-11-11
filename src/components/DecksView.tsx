import React, { useState } from 'react';
import { useDecks } from '../context/DeckContext';
import { ReviewFilterMode } from '../types/deck';
import { FolderTreeSidebar } from './FolderTreeSidebar';
import { FolderKanjiTable } from './FolderKanjiTable';
import { FlashcardSrsSession } from './FlashcardSrsSession';
import { JsonImportModal, SupabaseCloudModal } from './DeckModals';

export const DecksView: React.FC = () => {
  const { folders, selectedFolderId, buildExportBundle } = useDecks();

  const [reviewSession, setReviewSession] = useState<{
    folderId: string;
    mode: ReviewFilterMode;
    onlyDue: boolean;
  } | null>(null);

  const [isTreeCollapsed, setIsTreeCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kanji_deck_tree_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleTreeCollapse = () => {
    setIsTreeCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('kanji_deck_tree_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [cloudModalState, setCloudModalState] = useState<{
    isOpen: boolean;
    shareFolderId: string | null;
  }>({ isOpen: false, shareFolderId: null });

  const handleExportFolder = (folderId: string) => {
    const bundle = buildExportBundle(folderId);
    if (!bundle) return;

    const folder = folders.find((f) => f.id === folderId);
    const safeName = (folder?.name || 'kanji-deck')
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

  const handleStartReview = (mode: ReviewFilterMode, onlyDue: boolean) => {
    if (!selectedFolderId) return;
    setReviewSession({
      folderId: selectedFolderId,
      mode,
      onlyDue,
    });
  };

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
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Sticky Sidebar Container */}
        <div
          className={`sticky top-20 transition-all duration-200 z-10 ${
            isTreeCollapsed
              ? 'lg:col-span-1 xl:col-span-1'
              : 'lg:col-span-4 xl:col-span-3'
          }`}
        >
          <FolderTreeSidebar
            isCollapsed={isTreeCollapsed}
            onToggleCollapse={handleToggleTreeCollapse}
            onOpenImportModal={() => setIsImportOpen(true)}
            onOpenCloudModal={() =>
              setCloudModalState({ isOpen: true, shareFolderId: null })
            }
            onExportFolder={handleExportFolder}
          />
        </div>

        {/* Dynamic Width Content Table */}
        <div
          className={`min-w-0 transition-all duration-200 ${
            isTreeCollapsed
              ? 'lg:col-span-11 xl:col-span-11'
              : 'lg:col-span-8 xl:col-span-9'
          }`}
        >
          <FolderKanjiTable
            onStartReview={handleStartReview}
            onExportFolder={handleExportFolder}
            onOpenShareModal={(folderId) =>
              setCloudModalState({ isOpen: true, shareFolderId: folderId })
            }
          />
        </div>
      </div>

      <JsonImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <SupabaseCloudModal
        isOpen={cloudModalState.isOpen}
        shareFolderId={cloudModalState.shareFolderId}
        onClose={() => setCloudModalState({ isOpen: false, shareFolderId: null })}
      />
    </div>
  );
};
