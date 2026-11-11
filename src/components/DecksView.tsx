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
        <div className="lg:col-span-4 xl:col-span-3">
          <FolderTreeSidebar
            onOpenImportModal={() => setIsImportOpen(true)}
            onOpenCloudModal={() =>
              setCloudModalState({ isOpen: true, shareFolderId: null })
            }
            onExportFolder={handleExportFolder}
          />
        </div>

        <div className="lg:col-span-8 xl:col-span-9 min-w-0">
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
