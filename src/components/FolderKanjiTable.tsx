import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Plus,
  Download,
  Globe,
  Trash2,
  ChevronRight,
  BookOpen,
  Volume2,
  Pencil,
  Check,
  X,
  Share2,
  ListPlus,
  MoreVertical,
  Eye,
  AlertTriangle,
  Copy,
  PenTool,
  FolderInput,
  RefreshCw,
  Loader2,
  Layers,
  LayoutList,
  Printer,
} from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import { useKanji } from '../context/KanjiContext';
import { KanjiItem } from '../types/kanji';
import { CompoundWordCard, FolderKanjiItem, ReviewFilterMode } from '../types/deck';
import { speakJapanese } from '../utils/speech';
import { formatIntervalLabel } from '../utils/srsAlgorithm';
import {
  cleanMeaningsList,
  cleanReadingsList,
  hasMissingKanjiData,
} from '../utils/kanjiApi';
import { BatchImportLessonModal } from './BatchImportLessonModal';
import { BatchImportCompoundModal } from './BatchImportCompoundModal';
import { KanjiItemDetailModal } from './KanjiItemDetailModal';
import { MoveKanjiItemsModal } from './MoveKanjiItemsModal';
import { KanjiPrintModal } from './KanjiPrintModal';

interface FolderKanjiTableProps {
  onStartReview: (mode: ReviewFilterMode, onlyDue: boolean) => void;
  onExportFolder: (folderId: string) => void;
  onOpenShareModal: (folderId: string) => void;
  onSelectFolder?: (folderId: string) => void;
}

type TableViewMode = 'kanji' | 'cards';

type FlatCardRow =
  | {
      rowKey: string;
      kind: 'kanji';
      kanjiItem: FolderKanjiItem;
    }
  | {
      rowKey: string;
      kind: 'compound';
      kanjiItem: FolderKanjiItem;
      compoundWord: CompoundWordCard;
    };

export const FolderKanjiTable: React.FC<FolderKanjiTableProps> = ({
  onStartReview,
  onExportFolder,
  onOpenShareModal,
  onSelectFolder,
}) => {
  const navigate = useNavigate();
  const {
    folders,
    selectedFolderId,
    setSelectedFolderId,
    getFolderPath,
    getItemsForFolderRecursive,
    getReviewCardsForFolder,
    addKanjiListToFolder,
    updateKanjiItem,
    deleteKanjiItem,
    deleteKanjiItems,
    deleteCompoundWord,
    deleteCompoundWords,
    enrichingItemIds,
    enrichKanjiItems,
  } = useDecks();

  const { openKanjiPracticeModal, setInputText } = useKanji();

  const [viewMode, setViewMode] = useState<TableViewMode>('kanji');
  const [kanjiInput, setKanjiInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [compoundImportItemId, setCompoundImportItemId] = useState<string | null>(null);
  const [openKanjiMenuId, setOpenKanjiMenuId] = useState<string | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [editingKanjiId, setEditingKanjiId] = useState<string | null>(null);
  const [editHv, setEditHv] = useState('');
  const [editMeanings, setEditMeanings] = useState('');

  // Selection for 'kanji' view mode
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  // Selection for 'cards' view mode (rowKey: "k:<itemId>" or "c:<itemId>:<wordId>")
  const [selectedFlatKeys, setSelectedFlatKeys] = useState<string[]>([]);

  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [moveModalItemIds, setMoveModalItemIds] = useState<string[] | null>(null);
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);
  const [tableNotice, setTableNotice] = useState<string | null>(null);
  const masterCheckboxRef = useRef<HTMLInputElement | null>(null);
  const flatMasterCheckboxRef = useRef<HTMLInputElement | null>(null);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) || null;
  const folderItems = useMemo(
    () => (selectedFolder ? getItemsForFolderRecursive(selectedFolder.id) : []),
    [selectedFolder, getItemsForFolderRecursive]
  );

  const deckKanjiChars = useMemo(
    () => folderItems.map((it) => it.kanji),
    [folderItems]
  );

  const printableDeckItems = useMemo<KanjiItem[]>(() => {
    const selectedSet = new Set(selectedItemIds);
    const sourceItems =
      selectedSet.size > 0
        ? folderItems.filter((it) => selectedSet.has(it.id))
        : folderItems;

    const seen = new Set<string>();
    const result: KanjiItem[] = [];
    for (const it of sourceItems) {
      if (seen.has(it.kanji)) continue;
      seen.add(it.kanji);
      const codePoint = it.kanji.codePointAt(0) ?? it.kanji.charCodeAt(0);
      const hex = codePoint.toString(16).toLowerCase().padStart(5, '0');
      result.push({
        id: result.length + 1,
        kanji: it.kanji,
        hex,
        svgUrl: `https://cdn.jsdelivr.net/gh/kanjivg/kanjivg/kanji/${hex}.svg`,
        unicodeDecimal: codePoint,
        detail: {
          kanji: it.kanji,
          hanViet: it.hanViet || '',
          on: cleanReadingsList(it.onReadings || []),
          kun: cleanReadingsList(it.kunReadings || []),
          meanings: cleanMeaningsList(it.meanings || []),
          strokeCount: it.strokeCount,
          examples: [],
        },
      });
    }
    return result;
  }, [folderItems, selectedItemIds]);

  const flatCardRows: FlatCardRow[] = useMemo(() => {
    const rows: FlatCardRow[] = [];
    for (const item of folderItems) {
      rows.push({
        rowKey: `k:${item.id}`,
        kind: 'kanji',
        kanjiItem: item,
      });
      for (const cw of item.compoundWords || []) {
        rows.push({
          rowKey: `c:${item.id}:${cw.id}`,
          kind: 'compound',
          kanjiItem: item,
          compoundWord: cw,
        });
      }
    }
    return rows;
  }, [folderItems]);

  // Auto-trigger enrichment for cards with missing/placeholder On/Kun/Meanings
  useEffect(() => {
    if (!selectedFolder || folderItems.length === 0) return;
    const missing = folderItems.filter((it) => hasMissingKanjiData(it));
    if (missing.length > 0) {
      void enrichKanjiItems(missing, false);
    }
  }, [selectedFolder, folderItems, enrichKanjiItems]);

  // Reset selection when switching folders or view mode
  useEffect(() => {
    setSelectedItemIds([]);
    setSelectedFlatKeys([]);
    setIsBulkDeleteModalOpen(false);
    setMoveModalItemIds(null);
    setIsHeaderMenuOpen(false);
  }, [selectedFolderId]);

  useEffect(() => {
    setIsBulkDeleteModalOpen(false);
  }, [viewMode]);

  // Prune any selected IDs that no longer exist
  useEffect(() => {
    const validIds = new Set(folderItems.map((it) => it.id));
    setSelectedItemIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });

    const validKeys = new Set(flatCardRows.map((r) => r.rowKey));
    setSelectedFlatKeys((prev) => {
      const next = prev.filter((k) => validKeys.has(k));
      return next.length === prev.length ? prev : next;
    });
  }, [folderItems, flatCardRows]);

  const selectedIdSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);
  const allSelected = folderItems.length > 0 && selectedItemIds.length === folderItems.length;
  const someSelected = selectedItemIds.length > 0 && selectedItemIds.length < folderItems.length;

  const selectedFlatSet = useMemo(() => new Set(selectedFlatKeys), [selectedFlatKeys]);
  const allFlatSelected =
    flatCardRows.length > 0 && selectedFlatKeys.length === flatCardRows.length;
  const someFlatSelected =
    selectedFlatKeys.length > 0 && selectedFlatKeys.length < flatCardRows.length;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    if (flatMasterCheckboxRef.current) {
      flatMasterCheckboxRef.current.indeterminate = someFlatSelected;
    }
  }, [someFlatSelected]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest('[data-kanji-menu]')) {
        setOpenKanjiMenuId(null);
      }
      if (!target || !target.closest('[data-header-menu]')) {
        setIsHeaderMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenKanjiMenuId(null);
        setIsHeaderMenuOpen(false);
        setIsBulkDeleteModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const showTempNotice = (msg: string) => {
    setTableNotice(msg);
    window.setTimeout(() => {
      setTableNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  if (!selectedFolder) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-2">
        <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800">Chưa chọn thư mục bài học</h3>
        <p className="text-xs text-slate-500">
          Hãy chọn hoặc tạo một thư mục ở cột bên trái để thêm chữ Kanji và từ ghép.
        </p>
      </div>
    );
  }

  const breadcrumbs = getFolderPath(selectedFolder.id);
  const folderNameMap = new Map(folders.map((f) => [f.id, f.name]));
  const hasSubfolders = folders.some((f) => f.parentId === selectedFolder.id);

  const missingDataItems = folderItems.filter((it) => hasMissingKanjiData(it));
  const enrichingCount = folderItems.filter((it) => Boolean(enrichingItemIds[it.id])).length;

  const selectedItemsList = folderItems.filter((it) => selectedIdSet.has(it.id));
  const selectedCompoundCount = selectedItemsList.reduce(
    (sum, it) => sum + (it.compoundWords?.length || 0),
    0
  );

  const selectedFlatRows = flatCardRows.filter((r) => selectedFlatSet.has(r.rowKey));
  const selectedFlatKanjiItems = selectedFlatRows
    .filter((r): r is Extract<FlatCardRow, { kind: 'kanji' }> => r.kind === 'kanji')
    .map((r) => r.kanjiItem);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(folderItems.map((it) => it.id));
    }
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleSelectAllFlat = () => {
    if (allFlatSelected) {
      setSelectedFlatKeys([]);
    } else {
      setSelectedFlatKeys(flatCardRows.map((r) => r.rowKey));
    }
  };

  const toggleSelectFlatRow = (rowKey: string) => {
    setSelectedFlatKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...prev, rowKey]
    );
  };

  const handleConfirmBulkDelete = () => {
    if (viewMode === 'kanji') {
      if (selectedItemIds.length === 0) return;
      deleteKanjiItems(selectedItemIds);
      setSelectedItemIds([]);
      setIsBulkDeleteModalOpen(false);
      return;
    }

    // Flat cards mode bulk delete
    if (selectedFlatRows.length === 0) return;
    const kanjiItemIdsToDelete = new Set<string>();
    const compoundsByItem = new Map<string, string[]>();

    for (const row of selectedFlatRows) {
      if (row.kind === 'kanji') {
        kanjiItemIdsToDelete.add(row.kanjiItem.id);
      } else {
        const list = compoundsByItem.get(row.kanjiItem.id) || [];
        list.push(row.compoundWord.id);
        compoundsByItem.set(row.kanjiItem.id, list);
      }
    }

    // Remove compound words on Kanji items that are NOT themselves being deleted
    compoundsByItem.forEach((wordIds, kanjiItemId) => {
      if (!kanjiItemIdsToDelete.has(kanjiItemId)) {
        deleteCompoundWords(kanjiItemId, wordIds);
      }
    });

    if (kanjiItemIdsToDelete.size > 0) {
      deleteKanjiItems(Array.from(kanjiItemIdsToDelete));
    }

    setSelectedFlatKeys([]);
    setIsBulkDeleteModalOpen(false);
  };

  const getActiveKanjiCharsForAction = (): string[] => {
    if (viewMode === 'kanji' && selectedItemsList.length > 0) {
      return selectedItemsList.map((it) => it.kanji);
    }
    if (viewMode === 'cards' && selectedFlatRows.length > 0) {
      return Array.from(new Set(selectedFlatRows.map((r) => r.kanjiItem.kanji)));
    }
    return deckKanjiChars;
  };

  const handleCopyKanjiList = async () => {
    const chars = getActiveKanjiCharsForAction();
    if (chars.length === 0) return;
    const text = chars.join('');
    try {
      await navigator.clipboard.writeText(text);
      const label = `Đã chép ${chars.length} chữ`;
      setCopiedBanner(label);
      window.setTimeout(() => {
        setCopiedBanner((prev) => (prev === label ? null : prev));
      }, 2200);
    } catch {
      showTempNotice(`Danh sách Kanji: ${text}`);
    }
  };

  const handleOpenStrokeWritingPage = () => {
    const chars = getActiveKanjiCharsForAction();
    if (chars.length === 0) return;
    setInputText(chars.join(''));
    navigate('/kanji');
  };

  const dueCards = getReviewCardsForFolder(selectedFolder.id, 'all', true);
  const totalCompoundWords = folderItems.reduce(
    (sum, it) => sum + (it.compoundWords?.length || 0),
    0
  );
  const totalCards = folderItems.length + totalCompoundWords;

  const handleAddKanjiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kanjiInput.trim()) return;
    setIsAdding(true);
    try {
      await addKanjiListToFolder(selectedFolder.id, kanjiInput);
      setKanjiInput('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleStartEditKanji = (item: FolderKanjiItem) => {
    setEditingKanjiId(item.id);
    setEditHv(item.hanViet);
    setEditMeanings(cleanMeaningsList(item.meanings).join(', '));
  };

  const handleSaveEditKanji = (itemId: string) => {
    updateKanjiItem(itemId, {
      hanViet: editHv.trim().toUpperCase(),
      meanings: editMeanings
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
    });
    setEditingKanjiId(null);
  };

  const handleRetryMissingAll = async () => {
    if (missingDataItems.length === 0) return;
    const updated = await enrichKanjiItems(missingDataItems, true);
    if (updated > 0) {
      showTempNotice(`Đã cập nhật dữ liệu cho ${updated} chữ Kanji.`);
    } else {
      showTempNotice('Đã kiểm tra lại nhưng chưa có thêm dữ liệu mới từ máy chủ từ điển.');
    }
  };

  const detailItem = detailItemId
    ? folderItems.find((it) => it.id === detailItemId) || null
    : null;

  const compoundImportItem = compoundImportItemId
    ? folderItems.find((it) => it.id === compoundImportItemId) || null
    : null;

  const activeSelectionCount =
    viewMode === 'kanji' ? selectedItemIds.length : selectedFlatKeys.length;

  const movableKanjiIdsFromSelection =
    viewMode === 'kanji'
      ? selectedItemIds
      : Array.from(new Set(selectedFlatKanjiItems.map((it) => it.id)));

  return (
    <div className="space-y-4">
      {/* Header & Primary Review Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start justify-between gap-2.5 min-w-0 flex-1">
            <div className="space-y-1 min-w-0 flex-1">
              {/* Breadcrumb */}
              <div className="flex items-center flex-wrap gap-1 text-xs text-slate-500">
                {breadcrumbs.map((b, idx) => (
                  <React.Fragment key={b.id}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                    <button
                      type="button"
                      onClick={() =>
                        onSelectFolder
                          ? onSelectFolder(b.id)
                          : setSelectedFolderId(b.id)
                      }
                      className={`hover:text-teal-700 transition-colors cursor-pointer truncate max-w-[180px] ${
                        idx === breadcrumbs.length - 1 ? 'font-bold text-slate-900' : ''
                      }`}
                    >
                      {b.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Clean unboxed metadata with typographic separators */}
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500 tabular-nums">
                <span>
                  <strong className="text-slate-800">{folderItems.length}</strong> chữ Kanji
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-slate-800">{totalCompoundWords}</strong> từ ghép
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-teal-700">{dueCards.length}</strong> / {totalCards} thẻ đến hạn ôn
                </span>
                {hasSubfolders && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-teal-700 font-medium">Bao gồm các thư mục con</span>
                  </>
                )}
                {enrichingCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-teal-700 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Đang tải dữ liệu ({enrichingCount})...</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Top-Right Compact Controls: Play icon + 3-dot Menu */}
            <div className="flex sm:hidden items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={totalCards === 0}
                onClick={() => onStartReview('all', dueCards.length > 0)}
                className="w-9 h-9 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                title={
                  dueCards.length > 0
                    ? `Ôn tập ngay (${dueCards.length})`
                    : totalCards > 0
                    ? `Ôn lại tất cả (${totalCards})`
                    : 'Ôn tập ngay'
                }
                aria-label={
                  dueCards.length > 0
                    ? `Ôn tập ngay (${dueCards.length})`
                    : totalCards > 0
                    ? `Ôn lại tất cả (${totalCards})`
                    : 'Ôn tập ngay'
                }
              >
                <Play className="w-4 h-4 fill-current" />
              </button>

              <div className="relative" data-header-menu>
                <button
                  type="button"
                  onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                    isHeaderMenuOpen
                      ? 'bg-slate-100 border-slate-300 text-slate-900'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                  title="Tùy chọn bộ thẻ"
                  aria-label="Tùy chọn bộ thẻ"
                  aria-expanded={isHeaderMenuOpen}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isHeaderMenuOpen && (
                  <div className="absolute right-0 top-full pt-1.5 z-30">
                    <div className="w-52 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 text-xs">
                      {folderItems.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              void handleCopyKanjiList();
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer font-medium"
                          >
                            {copiedBanner ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span>{copiedBanner || 'Chép Kanji'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              handleOpenStrokeWritingPage();
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer font-medium"
                          >
                            <PenTool className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                            <span>Luyện viết nét</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              setIsPrintModalOpen(true);
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer font-medium"
                          >
                            <Printer className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                            <span>
                              In tập viết
                              {selectedItemIds.length > 0 ? ` (${selectedItemIds.length})` : ''}
                            </span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onExportFolder(selectedFolder.id);
                        }}
                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Xuất JSON</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onOpenShareModal(selectedFolder.id);
                        }}
                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                      >
                        {selectedFolder.isPublic ? (
                          <Globe className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span>{selectedFolder.isPublic ? 'Đang chia sẻ' : 'Chia sẻ'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Action Buttons (>= sm) */}
          <div className="hidden sm:flex items-center flex-wrap gap-2 shrink-0">
            {folderItems.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleCopyKanjiList}
                  className="px-3 py-2 text-xs sm:text-[13px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  title="Sao chép toàn bộ chữ Kanji trong bộ thẻ"
                >
                  {copiedBanner ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{copiedBanner || 'Chép Kanji'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenStrokeWritingPage}
                  className="px-3 py-2 text-xs sm:text-[13px] font-semibold text-teal-800 bg-teal-50/70 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  title="Nạp các chữ Kanji này vào trang Nét viết Kanji để học viết"
                >
                  <PenTool className="w-3.5 h-3.5 text-teal-700" />
                  <span>Luyện viết nét</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3 py-2 text-xs sm:text-[13px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  title={
                    selectedItemIds.length > 0
                      ? `In phiếu tập viết cho ${selectedItemIds.length} chữ đang chọn`
                      : `In phiếu tập viết cho bộ thẻ "${selectedFolder.name}"`
                  }
                >
                  <Printer className="w-3.5 h-3.5 text-teal-700" />
                  <span>
                    In tập viết
                    {selectedItemIds.length > 0 ? ` (${selectedItemIds.length})` : ''}
                  </span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onExportFolder(selectedFolder.id)}
              className="px-3 py-2 text-xs sm:text-[13px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Xuất JSON</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenShareModal(selectedFolder.id)}
              className={`px-3 py-2 text-xs sm:text-[13px] font-semibold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                selectedFolder.isPublic
                  ? 'bg-teal-50 text-teal-800 border-teal-300'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {selectedFolder.isPublic ? (
                <Globe className="w-3.5 h-3.5 text-teal-700" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{selectedFolder.isPublic ? 'Đang chia sẻ' : 'Chia sẻ'}</span>
            </button>

            <button
              type="button"
              disabled={totalCards === 0}
              onClick={() => onStartReview('all', dueCards.length > 0)}
              className="px-4 py-2 text-xs sm:text-[13px] font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {dueCards.length > 0
                  ? `Ôn tập ngay (${dueCards.length})`
                  : totalCards > 0
                  ? `Ôn lại tất cả (${totalCards})`
                  : 'Ôn tập ngay'}
              </span>
            </button>
          </div>
        </div>

        {/* Add Kanji List Bar */}
        <form onSubmit={handleAddKanjiSubmit} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
          <input
            type="text"
            value={kanjiInput}
            onChange={(e) => setKanjiInput(e.target.value)}
            placeholder="Nhập hoặc dán danh sách chữ Kanji (vd: 漢字勉強)..."
            className="w-full sm:flex-1 h-11 min-h-[44px] px-3.5 py-2.5 text-[12px]! leading-normal bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all"
          />
          <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={!kanjiInput.trim() || isAdding}
              className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-[13px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 disabled:bg-slate-100 disabled:text-slate-400 border border-teal-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>{isAdding ? 'Đang thêm...' : 'Thêm vào bảng'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBatchImportOpen(true)}
              className="h-9 sm:h-10 px-3 sm:px-3.5 text-xs sm:text-[13px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Nhập hàng loạt Kanji kèm từ ghép bằng Text hoặc JSON"
            >
              <ListPlus className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>Nhập hàng loạt</span>
            </button>
          </div>
        </form>

        {/* View Mode Switcher & Missing Data Retry */}
        {folderItems.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto p-1 bg-slate-100 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setViewMode('kanji')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-[13px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  viewMode === 'kanji'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span className="tabular-nums truncate">Kanji ({folderItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-[13px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span className="tabular-nums truncate">Tất cả thẻ ({totalCards})</span>
              </button>
            </div>

            {(tableNotice || missingDataItems.length > 0) && (
              <div className="flex items-center flex-wrap gap-2">
                {tableNotice && (
                  <span className="text-xs font-medium text-teal-800">{tableNotice}</span>
                )}
                {missingDataItems.length > 0 && (
                  <button
                    type="button"
                    disabled={enrichingCount > 0}
                    onClick={handleRetryMissingAll}
                    className="px-3 py-1.5 text-xs sm:text-[13px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${enrichingCount > 0 ? 'animate-spin' : ''}`} />
                    <span className="tabular-nums">
                      {enrichingCount > 0
                        ? `Đang tải (${enrichingCount})...`
                        : `Tải lại thẻ thiếu (${missingDataItems.length})`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main List Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-visible">
        {folderItems.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">Thư mục này chưa có chữ Kanji nào</p>
            <p className="text-xs text-slate-500">
              Hãy dán danh sách Kanji vào ô phía trên để tự động tạo bảng học và thêm từ ghép.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Bulk Selection Action Bar */}
            {activeSelectionCount > 0 && (
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-2xl flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center flex-wrap gap-2 text-xs text-slate-800 tabular-nums">
                  {viewMode === 'kanji' ? (
                    <>
                      <span>
                        Đã chọn <strong>{selectedItemIds.length}</strong> / {folderItems.length} thẻ Kanji
                      </span>
                      {selectedCompoundCount > 0 && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="text-slate-600">
                            {selectedCompoundCount} từ ghép đi kèm
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <span>
                      Đã chọn <strong>{selectedFlatKeys.length}</strong> / {flatCardRows.length} thẻ Flashcard
                    </span>
                  )}
                </div>

                <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyKanjiList}
                    className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-[13px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Chép Kanji</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenStrokeWritingPage}
                    className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-[13px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <PenTool className="w-3.5 h-3.5 text-teal-700" />
                    <span>Viết nét</span>
                  </button>

                  {movableKanjiIdsFromSelection.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMoveModalItemIds(movableKanjiIdsFromSelection)}
                      className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-[13px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <FolderInput className="w-3.5 h-3.5 text-teal-700" />
                      <span>Di chuyển ({movableKanjiIdsFromSelection.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      viewMode === 'kanji' ? setSelectedItemIds([]) : setSelectedFlatKeys([])
                    }
                    className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-[13px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Bỏ chọn
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="px-3 py-1.5 text-xs sm:text-[13px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa ({activeSelectionCount})</span>
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'kanji' ? (
              <>
                {/* Mobile Select-All Bar */}
                {selectedItemIds.length === 0 && (
                  <div className="flex md:hidden items-center justify-between px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 rounded-t-2xl text-xs">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-slate-700 font-semibold">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer"
                      />
                      <span className="tabular-nums">Chọn tất cả ({folderItems.length} thẻ)</span>
                    </label>
                  </div>
                )}

                {/* Desktop Table Column Header */}
                <div
                  className={`hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/90 text-[11px] font-semibold text-slate-500 border-b border-slate-200/80 ${
                    selectedItemIds.length === 0 ? 'rounded-t-2xl' : ''
                  }`}
                >
                  <label
                    className="w-7 h-7 -ml-1.5 flex items-center justify-center rounded-lg hover:bg-slate-200/60 cursor-pointer shrink-0"
                    title={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả thẻ'}
                  >
                    <input
                      ref={masterCheckboxRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Chọn tất cả thẻ Kanji"
                      className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer"
                    />
                  </label>
                  <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-2">Kanji</div>
                    <div className="col-span-2">Hán-Việt</div>
                    <div className="col-span-2">Âm On / Kun</div>
                    <div className="col-span-3">Nghĩa</div>
                    <div className="col-span-2">Từ ghép &amp; SRS</div>
                    <div className="col-span-1 text-right">Thao tác</div>
                  </div>
                </div>

                {folderItems.map((item) => {
                  const isDue = item.srsState.dueAt <= Date.now();
                  const cwCount = item.compoundWords?.length || 0;
                  const belongFolderName =
                    item.folderId !== selectedFolder.id ? folderNameMap.get(item.folderId) : null;
                  const isSelected = selectedIdSet.has(item.id);
                  const isEnriching = Boolean(enrichingItemIds[item.id]);

                  const cleanOn = cleanReadingsList(item.onReadings);
                  const cleanKun = cleanReadingsList(item.kunReadings);
                  const cleanMeanings = cleanMeaningsList(item.meanings);

                  return (
                    <div
                      key={item.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-teal-50/50 hover:bg-teal-50/70' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Compact Mobile Card (< md) */}
                      <div className="md:hidden p-3.5 space-y-2 relative">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(item.id)}
                              aria-label={`Chọn thẻ ${item.kanji}`}
                              className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer shrink-0"
                            />
                            <button
                              type="button"
                              onClick={() => openKanjiPracticeModal(item.kanji, deckKanjiChars)}
                              className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 flex items-center justify-center font-kanji text-2xl font-black text-slate-900 hover:text-teal-800 transition-colors cursor-pointer shrink-0"
                              title="Xem nét viết & bộ thủ"
                            >
                              {item.kanji}
                            </button>

                            <div className="min-w-0 flex-1">
                              {editingKanjiId === item.id ? (
                                <input
                                  type="text"
                                  value={editHv}
                                  onChange={(e) => setEditHv(e.target.value)}
                                  placeholder="Hán-Việt"
                                  className="w-full px-2 py-1 text-xs border border-teal-400 rounded-lg focus:outline-none"
                                />
                              ) : (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-sm font-extrabold text-slate-900 truncate">
                                    {item.hanViet || '—'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => speakJapanese(item.kanji)}
                                    className="p-1 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-md cursor-pointer shrink-0"
                                    title="Nghe phát âm"
                                    aria-label="Nghe phát âm"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                              <div className="text-[11px] text-slate-500 flex items-center flex-wrap gap-x-2 gap-y-0.5 tabular-nums">
                                {isDue ? (
                                  <span className="text-amber-700 font-medium">● Đến hạn ôn</span>
                                ) : (
                                  <span className="text-emerald-700">
                                    ✓ Ôn sau {formatIntervalLabel(item.srsState.intervalMinutes)}
                                  </span>
                                )}
                                {belongFolderName && (
                                  <>
                                    <span className="text-slate-300" aria-hidden="true">·</span>
                                    <span className="truncate max-w-[130px]">{belongFolderName}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Top-Right Compact Action Control */}
                          <div className="relative shrink-0" data-kanji-menu>
                            {editingKanjiId === item.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditKanji(item.id)}
                                  className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                  title="Lưu"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingKanjiId(null)}
                                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  title="Hủy"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenKanjiMenuId((prev) =>
                                      prev === item.id ? null : item.id
                                    )
                                  }
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    openKanjiMenuId === item.id
                                      ? 'bg-slate-100 border-slate-300 text-slate-900'
                                      : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                                  }`}
                                  title="Thao tác chữ Kanji"
                                  aria-label="Thao tác chữ Kanji"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openKanjiMenuId === item.id && (
                                  <div className="absolute right-0 top-full pt-1 z-30">
                                    <div className="w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 text-xs">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          setDetailItemId(item.id);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer font-medium"
                                      >
                                        <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                                        <span>Xem chi tiết &amp; Từ ghép</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          openKanjiPracticeModal(item.kanji, deckKanjiChars);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Xem nét viết &amp; Bộ thủ</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          handleStartEditKanji(item);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Sửa Hán-Việt &amp; Nghĩa</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          setCompoundImportItemId(item.id);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <ListPlus className="w-3.5 h-3.5 text-teal-700" />
                                        <span>Nhập từ ghép (Text / JSON)</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          setMoveModalItemIds([item.id]);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <FolderInput className="w-3.5 h-3.5 text-teal-700" />
                                        <span>Di chuyển sang bộ khác</span>
                                      </button>

                                      {hasMissingKanjiData(item) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenKanjiMenuId(null);
                                            void enrichKanjiItems([item], true);
                                          }}
                                          className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                                        >
                                          <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Tải lại dữ liệu từ điển</span>
                                        </button>
                                      )}

                                      <div className="my-1 border-t border-slate-100" />

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          deleteKanjiItem(item.id);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Xóa khỏi bài</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Compact Details Body (pl-6 aligns neatly under Kanji box) */}
                        <div className="pl-6 space-y-1.5">
                          {/* Inline On / Kun */}
                          {isEnriching && cleanOn.length === 0 && cleanKun.length === 0 ? (
                            <div className="h-3 w-36 rounded bg-slate-200/80 animate-pulse" />
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-mono text-slate-700">
                              <span>
                                <span className="text-slate-400 text-[10px]">On:</span>{' '}
                                {cleanOn.length > 0 ? cleanOn.slice(0, 2).join(', ') : '—'}
                              </span>
                              <span className="text-slate-300" aria-hidden="true">·</span>
                              <span>
                                <span className="text-slate-400 text-[10px]">Kun:</span>{' '}
                                {cleanKun.length > 0 ? cleanKun.slice(0, 2).join(', ') : '—'}
                              </span>
                            </div>
                          )}

                          {/* Meanings */}
                          {editingKanjiId === item.id ? (
                            <input
                              type="text"
                              value={editMeanings}
                              onChange={(e) => setEditMeanings(e.target.value)}
                              placeholder="Nghĩa (phân cách bằng dấu phẩy)"
                              className="w-full px-2 py-1 text-xs border border-teal-400 rounded-lg focus:outline-none"
                            />
                          ) : isEnriching && cleanMeanings.length === 0 ? (
                            <div className="h-3 w-3/4 rounded bg-slate-200/80 animate-pulse" />
                          ) : cleanMeanings.length > 0 ? (
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-xs text-slate-700 line-clamp-2 flex-1">
                                {cleanMeanings.join(', ')}
                              </p>
                              <button
                                type="button"
                                onClick={() => setDetailItemId(item.id)}
                                className="inline-flex items-center gap-0.5 text-xs font-semibold text-teal-800 hover:underline cursor-pointer shrink-0"
                              >
                                <span className="tabular-nums">{cwCount} từ ghép</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => void enrichKanjiItems([item], true)}
                                className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Chưa có nghĩa · Tải lại</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDetailItemId(item.id)}
                                className="inline-flex items-center gap-0.5 text-xs font-semibold text-teal-800 hover:underline cursor-pointer shrink-0"
                              >
                                <span className="tabular-nums">{cwCount} từ ghép</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Desktop 12-Column Row (>= md) */}
                      <div className="hidden md:flex items-center gap-3 px-4 py-3">
                        <label
                          className="w-8 h-8 -ml-2 flex items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
                          title={isSelected ? 'Bỏ chọn thẻ' : 'Chọn thẻ'}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(item.id)}
                            aria-label={`Chọn thẻ ${item.kanji}`}
                            className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer"
                          />
                        </label>
                        <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
                          {/* Kanji Character + Pronunciation button right next to it */}
                          <div className="col-span-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openKanjiPracticeModal(item.kanji, deckKanjiChars)}
                              className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 flex items-center justify-center font-kanji text-2xl font-black text-slate-900 hover:text-teal-800 transition-colors cursor-pointer shrink-0"
                              title="Xem nét viết & bộ thủ (có nút chuyển trái/phải)"
                            >
                              {item.kanji}
                            </button>
                            <button
                              type="button"
                              onClick={() => speakJapanese(item.kanji)}
                              className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                              title="Nghe phát âm"
                              aria-label="Nghe phát âm"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Hán Việt & Source folder if viewing parent */}
                          <div className="col-span-2 min-w-0">
                            {editingKanjiId === item.id ? (
                              <input
                                type="text"
                                value={editHv}
                                onChange={(e) => setEditHv(e.target.value)}
                                placeholder="Hán-Việt"
                                className="w-full px-2 py-1 text-xs border border-teal-400 rounded-lg focus:outline-none"
                              />
                            ) : (
                              <div>
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {item.hanViet || '—'}
                                </div>
                                {belongFolderName && (
                                  <div className="text-[11px] text-slate-400 truncate">
                                    Bài: {belongFolderName}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* On / Kun */}
                          <div className="col-span-2 text-xs space-y-1 min-w-0">
                            {isEnriching && cleanOn.length === 0 && cleanKun.length === 0 ? (
                              <div className="space-y-1.5 py-0.5" aria-label="Đang tải âm On/Kun">
                                <div className="h-3 w-20 rounded bg-slate-200/80 animate-pulse" />
                                <div className="h-3 w-16 rounded bg-slate-200/70 animate-pulse" />
                              </div>
                            ) : (
                              <>
                                <div className="font-mono text-slate-700 truncate">
                                  <span className="text-slate-400 text-[10px] mr-1">On:</span>
                                  {cleanOn.length > 0 ? cleanOn.slice(0, 2).join(', ') : '—'}
                                </div>
                                <div className="font-mono text-slate-600 truncate">
                                  <span className="text-slate-400 text-[10px] mr-1">Kun:</span>
                                  {cleanKun.length > 0 ? cleanKun.slice(0, 2).join(', ') : '—'}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Meanings */}
                          <div className="col-span-3 min-w-0">
                            {editingKanjiId === item.id ? (
                              <input
                                type="text"
                                value={editMeanings}
                                onChange={(e) => setEditMeanings(e.target.value)}
                                placeholder="Nghĩa (phân cách bằng dấu phẩy)"
                                className="w-full px-2 py-1 text-xs border border-teal-400 rounded-lg focus:outline-none"
                              />
                            ) : isEnriching && cleanMeanings.length === 0 ? (
                              <div className="space-y-1.5 py-0.5" aria-label="Đang tải nghĩa">
                                <div className="h-3 w-3/4 rounded bg-slate-200/80 animate-pulse" />
                                <div className="h-2.5 w-1/2 rounded bg-slate-100 animate-pulse" />
                              </div>
                            ) : cleanMeanings.length > 0 ? (
                              <p className="text-xs text-slate-700 line-clamp-2">
                                {cleanMeanings.join(', ')}
                              </p>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void enrichKanjiItems([item], true)}
                                className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Chưa có nghĩa · Tải lại</span>
                              </button>
                            )}
                          </div>

                          {/* Compound Words Count & SRS Status -> Click opens Detail Modal */}
                          <div className="col-span-2 space-y-1">
                            <button
                              type="button"
                              onClick={() => setDetailItemId(item.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-950 hover:underline cursor-pointer"
                            >
                              <span className="tabular-nums">{cwCount} từ ghép</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <div className="text-[11px] tabular-nums text-slate-500">
                              {isDue ? (
                                <span className="text-amber-700 font-medium">● Đến hạn ôn</span>
                              ) : (
                                <span className="text-emerald-700">
                                  ✓ Ôn sau {formatIntervalLabel(item.srsState.intervalMinutes)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions: 3-dot menu */}
                          <div
                            data-kanji-menu
                            className="col-span-1 flex items-center justify-end gap-1 relative"
                            onMouseLeave={() => {
                              if (openKanjiMenuId === item.id) {
                                setOpenKanjiMenuId(null);
                              }
                            }}
                          >
                            {editingKanjiId === item.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditKanji(item.id)}
                                  className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                  title="Lưu"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingKanjiId(null)}
                                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  title="Hủy"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenKanjiMenuId((prev) =>
                                      prev === item.id ? null : item.id
                                    )
                                  }
                                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                                    openKanjiMenuId === item.id
                                      ? 'bg-slate-100 border-slate-300 text-slate-900'
                                      : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                                  }`}
                                  title="Thao tác chữ Kanji"
                                  aria-label="Thao tác chữ Kanji"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openKanjiMenuId === item.id && (
                                  <div className="absolute right-0 top-full pt-1 z-30">
                                    <div className="w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 text-xs">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          setDetailItemId(item.id);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer font-medium"
                                      >
                                        <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                                        <span>Xem chi tiết &amp; Từ ghép</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          openKanjiPracticeModal(item.kanji, deckKanjiChars);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Xem nét viết &amp; Bộ thủ</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          handleStartEditKanji(item);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Sửa Hán-Việt &amp; Nghĩa</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          setCompoundImportItemId(item.id);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <ListPlus className="w-3.5 h-3.5 text-teal-700" />
                                        <span>Nhập từ ghép (Text / JSON)</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          setMoveModalItemIds([item.id]);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <FolderInput className="w-3.5 h-3.5 text-teal-700" />
                                        <span>Di chuyển sang bộ khác</span>
                                      </button>

                                      {hasMissingKanjiData(item) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenKanjiMenuId(null);
                                            void enrichKanjiItems([item], true);
                                          }}
                                          className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-teal-800 flex items-center gap-2.5 cursor-pointer"
                                        >
                                          <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Tải lại dữ liệu từ điển</span>
                                        </button>
                                      )}

                                      <div className="my-1 border-t border-slate-100" />

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKanjiMenuId(null);
                                          deleteKanjiItem(item.id);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Xóa khỏi bài</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              /* Flat All Flashcards View (1 Kanji card or 1 Compound word card = 1 row) */
              <>
                {selectedFlatKeys.length === 0 && (
                  <div className="flex md:hidden items-center justify-between px-4 py-2.5 bg-slate-50/90 border-b border-slate-200/80 rounded-t-2xl text-xs">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-slate-700 font-semibold">
                      <input
                        type="checkbox"
                        checked={allFlatSelected}
                        onChange={toggleSelectAllFlat}
                        className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer"
                      />
                      <span className="tabular-nums">Chọn tất cả ({flatCardRows.length} thẻ)</span>
                    </label>
                  </div>
                )}

                <div
                  className={`hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50/90 text-[11px] font-semibold text-slate-500 border-b border-slate-200/80 ${
                    selectedFlatKeys.length === 0 ? 'rounded-t-2xl' : ''
                  }`}
                >
                  <label
                    className="w-7 h-7 -ml-1.5 flex items-center justify-center rounded-lg hover:bg-slate-200/60 cursor-pointer shrink-0"
                    title={allFlatSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả thẻ Flashcard'}
                  >
                    <input
                      ref={flatMasterCheckboxRef}
                      type="checkbox"
                      checked={allFlatSelected}
                      onChange={toggleSelectAllFlat}
                      aria-label="Chọn tất cả thẻ Flashcard"
                      className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer"
                    />
                  </label>
                  <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-3">Mặt trước &amp; Loại thẻ</div>
                    <div className="col-span-3">Hán-Việt &amp; Cách đọc</div>
                    <div className="col-span-3">Nghĩa</div>
                    <div className="col-span-2">Trạng thái SRS</div>
                    <div className="col-span-1 text-right">Thao tác</div>
                  </div>
                </div>

                {flatCardRows.map((row) => {
                  const isRowSelected = selectedFlatSet.has(row.rowKey);

                  if (row.kind === 'kanji') {
                    const item = row.kanjiItem;
                    const isDue = item.srsState.dueAt <= Date.now();
                    const isEnriching = Boolean(enrichingItemIds[item.id]);
                    const cleanOn = cleanReadingsList(item.onReadings);
                    const cleanKun = cleanReadingsList(item.kunReadings);
                    const cleanMeanings = cleanMeaningsList(item.meanings);

                    return (
                      <div
                        key={row.rowKey}
                        className={`transition-colors ${
                          isRowSelected ? 'bg-teal-50/50 hover:bg-teal-50/70' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Compact Mobile Flat Card (< md) */}
                        <div className="md:hidden p-3.5 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isRowSelected}
                                onChange={() => toggleSelectFlatRow(row.rowKey)}
                                aria-label={`Chọn thẻ Kanji ${item.kanji}`}
                                className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer shrink-0"
                              />
                              <button
                                type="button"
                                onClick={() => openKanjiPracticeModal(item.kanji, deckKanjiChars)}
                                className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 flex items-center justify-center font-kanji text-xl font-black text-slate-900 cursor-pointer shrink-0"
                              >
                                {item.kanji}
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-sm font-bold text-slate-900 truncate">
                                    {item.hanViet || '—'}
                                  </span>
                                  <span className="text-[11px] text-teal-800 font-semibold shrink-0">
                                    · Kanji
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => speakJapanese(item.kanji)}
                                    className="p-1 text-slate-400 hover:text-teal-700 rounded-md cursor-pointer shrink-0"
                                    aria-label="Phát âm"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="text-[11px] tabular-nums">
                                  {isDue ? (
                                    <span className="text-amber-700 font-medium">● Đến hạn ôn</span>
                                  ) : (
                                    <span className="text-emerald-700">
                                      ✓ Ôn sau {formatIntervalLabel(item.srsState.intervalMinutes)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setDetailItemId(item.id)}
                                className="p-1.5 text-slate-400 hover:text-teal-700 rounded-lg cursor-pointer"
                                title="Chi tiết & từ ghép"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMoveModalItemIds([item.id])}
                                className="p-1.5 text-slate-400 hover:text-teal-700 rounded-lg cursor-pointer"
                                title="Di chuyển sang bộ khác"
                              >
                                <FolderInput className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteKanjiItem(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                title="Xóa thẻ Kanji"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="pl-6 space-y-0.5 text-xs">
                            <div className="font-mono text-slate-600 truncate">
                              {[...cleanOn, ...cleanKun].slice(0, 3).join(', ') || '—'}
                            </div>
                            <div className="text-slate-700 line-clamp-2">
                              {cleanMeanings.length > 0 ? cleanMeanings.join(', ') : 'Chưa có nghĩa'}
                            </div>
                          </div>
                        </div>

                        {/* Desktop Row (>= md) */}
                        <div className="hidden md:flex items-center gap-3 px-4 py-3">
                          <label className="w-8 h-8 -ml-2 flex items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => toggleSelectFlatRow(row.rowKey)}
                              aria-label={`Chọn thẻ Kanji ${item.kanji}`}
                              className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer"
                            />
                          </label>
                          <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
                            <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => openKanjiPracticeModal(item.kanji, deckKanjiChars)}
                                className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 flex items-center justify-center font-kanji text-xl font-black text-slate-900 hover:text-teal-800 transition-colors cursor-pointer shrink-0"
                                title="Xem nét viết & bộ thủ"
                              >
                                {item.kanji}
                              </button>
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-teal-800">
                                  Thẻ Kanji
                                </div>
                                <button
                                  type="button"
                                  onClick={() => speakJapanese(item.kanji)}
                                  className="text-[11px] text-slate-400 hover:text-teal-700 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Phát âm</span>
                                </button>
                              </div>
                            </div>

                            <div className="col-span-3 min-w-0 text-xs">
                              <div className="font-bold text-slate-900 truncate">
                                {item.hanViet || '—'}
                              </div>
                              {isEnriching && cleanOn.length === 0 && cleanKun.length === 0 ? (
                                <div className="h-3 w-24 mt-1 rounded bg-slate-200/80 animate-pulse" />
                              ) : (
                                <div className="font-mono text-slate-600 truncate">
                                  {[...cleanOn, ...cleanKun].slice(0, 3).join(', ') || '—'}
                                </div>
                              )}
                            </div>

                            <div className="col-span-3 min-w-0 text-xs text-slate-700">
                              {isEnriching && cleanMeanings.length === 0 ? (
                                <div className="h-3 w-3/4 rounded bg-slate-200/80 animate-pulse" />
                              ) : (
                                <span className="line-clamp-2">
                                  {cleanMeanings.length > 0 ? cleanMeanings.join(', ') : 'Chưa có nghĩa'}
                                </span>
                              )}
                            </div>

                            <div className="col-span-2 text-[11px] tabular-nums">
                              {isDue ? (
                                <span className="text-amber-700 font-medium">● Đến hạn ôn</span>
                              ) : (
                                <span className="text-emerald-700">
                                  ✓ Ôn sau {formatIntervalLabel(item.srsState.intervalMinutes)}
                                </span>
                              )}
                            </div>

                            <div className="col-span-1 flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setDetailItemId(item.id)}
                                className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer"
                                title="Chi tiết & từ ghép"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMoveModalItemIds([item.id])}
                                className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer"
                                title="Di chuyển sang bộ khác"
                              >
                                <FolderInput className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteKanjiItem(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Xóa thẻ Kanji"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Compound word card row
                  const { kanjiItem, compoundWord: cw } = row;
                  const isDue = cw.srsState.dueAt <= Date.now();
                  return (
                    <div
                      key={row.rowKey}
                      className={`transition-colors ${
                        isRowSelected ? 'bg-teal-50/50 hover:bg-teal-50/70' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Compact Mobile Compound Card (< md) */}
                      <div className="md:hidden p-3.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => toggleSelectFlatRow(row.rowKey)}
                              aria-label={`Chọn từ ghép ${cw.word}`}
                              className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer shrink-0"
                            />
                            <button
                              type="button"
                              onClick={() => openKanjiPracticeModal(kanjiItem.kanji, deckKanjiChars)}
                              className="px-2.5 h-10 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 flex items-center justify-center font-kanji text-base font-bold text-slate-900 cursor-pointer shrink-0"
                            >
                              {cw.word}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm font-bold text-slate-900 truncate">
                                  {cw.hanViet || '—'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => speakJapanese(cw.word)}
                                  className="p-1 text-slate-400 hover:text-teal-700 rounded-md cursor-pointer shrink-0"
                                  aria-label="Phát âm"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="text-[11px] tabular-nums flex items-center gap-1.5">
                                {isDue ? (
                                  <span className="text-amber-700 font-medium">● Đến hạn ôn</span>
                                ) : (
                                  <span className="text-emerald-700">
                                    ✓ Ôn sau {formatIntervalLabel(cw.srsState.intervalMinutes)}
                                  </span>
                                )}
                                <span className="text-slate-300" aria-hidden="true">·</span>
                                <span className="text-slate-500 font-kanji">{kanjiItem.kanji}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setDetailItemId(kanjiItem.id)}
                              className="p-1.5 text-slate-400 hover:text-teal-700 rounded-lg cursor-pointer"
                              title="Sửa từ ghép"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCompoundWord(kanjiItem.id, cw.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              title="Xóa từ ghép"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="pl-6 space-y-0.5 text-xs">
                          <div className="font-mono text-slate-600 truncate">{cw.reading || '—'}</div>
                          <div className="text-slate-700 line-clamp-2">{cw.meaning || '—'}</div>
                        </div>
                      </div>

                      {/* Desktop Row (>= md) */}
                      <div className="hidden md:flex items-center gap-3 px-4 py-3">
                        <label className="w-8 h-8 -ml-2 flex items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => toggleSelectFlatRow(row.rowKey)}
                            aria-label={`Chọn từ ghép ${cw.word}`}
                            className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 cursor-pointer"
                          />
                        </label>
                        <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => openKanjiPracticeModal(kanjiItem.kanji, deckKanjiChars)}
                              className="px-2.5 h-10 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 flex items-center justify-center font-kanji text-base font-bold text-slate-900 hover:text-teal-800 transition-colors cursor-pointer shrink-0"
                              title={`Xem nét viết chữ ${kanjiItem.kanji}`}
                            >
                              {cw.word}
                            </button>
                            <div className="min-w-0">
                              <div className="text-[11px] font-medium text-slate-500 truncate">
                                Từ ghép · <span className="font-kanji text-slate-800">{kanjiItem.kanji}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => speakJapanese(cw.word)}
                                className="text-[11px] text-slate-400 hover:text-teal-700 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Phát âm</span>
                              </button>
                            </div>
                          </div>

                          <div className="col-span-3 min-w-0 text-xs">
                            <div className="font-bold text-slate-900 truncate">
                              {cw.hanViet || '—'}
                            </div>
                            <div className="font-mono text-slate-600 truncate">
                              {cw.reading || '—'}
                            </div>
                          </div>

                          <div className="col-span-3 min-w-0 text-xs text-slate-700">
                            <span className="line-clamp-2">{cw.meaning || '—'}</span>
                          </div>

                          <div className="col-span-2 text-[11px] tabular-nums">
                            {isDue ? (
                              <span className="text-amber-700 font-medium">● Đến hạn ôn</span>
                            ) : (
                              <span className="text-emerald-700">
                                ✓ Ôn sau {formatIntervalLabel(cw.srsState.intervalMinutes)}
                              </span>
                            )}
                          </div>

                          <div className="col-span-1 flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setDetailItemId(kanjiItem.id)}
                              className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer"
                              title="Sửa từ ghép"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCompoundWord(kanjiItem.id, cw.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Xóa từ ghép"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsBulkDeleteModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  {viewMode === 'kanji'
                    ? `Xác nhận xóa ${selectedItemsList.length} thẻ Kanji`
                    : `Xác nhận xóa ${selectedFlatRows.length} thẻ Flashcard`}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Các thẻ đã chọn sẽ bị xóa khỏi bài học{' '}
                  <strong className="text-slate-900">{selectedFolder.name}</strong>.
                  {viewMode === 'kanji' && selectedCompoundCount > 0 && (
                    <>
                      {' '}
                      Đồng thời <strong className="text-rose-700">{selectedCompoundCount} thẻ từ ghép</strong>{' '}
                      đi kèm cũng sẽ bị xóa theo.
                    </>
                  )}
                </p>
              </div>
            </div>

            {viewMode === 'kanji' && selectedItemsList.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap gap-1.5">
                {selectedItemsList.slice(0, 14).map((it) => (
                  <span
                    key={it.id}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-kanji text-base font-bold text-slate-900"
                  >
                    {it.kanji}
                  </span>
                ))}
                {selectedItemsList.length > 14 && (
                  <span className="px-2.5 h-8 rounded-lg bg-slate-200/70 flex items-center justify-center text-xs font-semibold text-slate-700 tabular-nums">
                    +{selectedItemsList.length - 14}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa {activeSelectionCount} thẻ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Cards Modal */}
      <MoveKanjiItemsModal
        isOpen={Boolean(moveModalItemIds && moveModalItemIds.length > 0)}
        itemIds={moveModalItemIds || []}
        sourceFolderId={selectedFolder.id}
        onClose={() => setMoveModalItemIds(null)}
        onMoved={({ movedCount, mergedCount, targetName }) => {
          setSelectedItemIds([]);
          setSelectedFlatKeys([]);
          const parts: string[] = [];
          if (movedCount > 0) parts.push(`chuyển ${movedCount} thẻ`);
          if (mergedCount > 0) parts.push(`gộp ${mergedCount} thẻ trùng`);
          showTempNotice(`Đã ${parts.join(' và ')} sang "${targetName}".`);
        }}
      />

      <BatchImportLessonModal
        isOpen={isBatchImportOpen}
        folderId={selectedFolder.id}
        folderName={selectedFolder.name}
        onClose={() => setIsBatchImportOpen(false)}
      />

      <KanjiItemDetailModal
        item={detailItem}
        deckKanjiChars={deckKanjiChars}
        onClose={() => setDetailItemId(null)}
        onOpenBatchCompoundImport={(itemId) => setCompoundImportItemId(itemId)}
      />

      <BatchImportCompoundModal
        item={compoundImportItem}
        onClose={() => setCompoundImportItemId(null)}
      />

      <KanjiPrintModal
        kanjiList={printableDeckItems}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        sourceLabel={
          selectedItemIds.length > 0
            ? `${selectedFolder.name} · ${printableDeckItems.length} chữ đã chọn`
            : `Bộ thẻ: ${selectedFolder.name} (${printableDeckItems.length} chữ)`
        }
      />
    </div>
  );
};
