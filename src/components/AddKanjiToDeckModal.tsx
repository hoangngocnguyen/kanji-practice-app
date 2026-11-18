import React, { useEffect, useMemo, useState } from 'react';
import {
  FolderPlus,
  Folder,
  X,
  Check,
  AlertCircle,
  Plus,
  Layers3,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KanjiDetail } from '../types/kanji';
import { useDecks } from '../context/DeckContext';

interface AddKanjiToDeckModalProps {
  isOpen: boolean;
  entries: KanjiDetail[];
  suggestedDeckName?: string;
  onClose: () => void;
  onSuccess?: (result: {
    addedCount: number;
    skippedCount: number;
    folderId: string;
    folderName: string;
  }) => void;
}

export const AddKanjiToDeckModal: React.FC<AddKanjiToDeckModalProps> = ({
  isOpen,
  entries,
  suggestedDeckName = 'Bộ thẻ Kanji mới',
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { folders, items, createFolder, addCatalogKanjiToFolder } = useDecks();

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>(suggestedDeckName);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newDescription, setNewDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [completedInfo, setCompletedInfo] = useState<{
    addedCount: number;
    skippedCount: number;
    folderId: string;
    folderName: string;
  } | null>(null);

  const selectedCharsSet = useMemo(
    () => new Set(entries.map((e) => e.kanji)),
    [entries]
  );

  // Build hierarchical folder tree options with current card & overlap counts
  const folderOptions = useMemo(() => {
    const folderIdSet = new Set(folders.map((f) => f.id));

    const itemsByFolder = new Map<string, Set<string>>();
    for (const it of items) {
      let set = itemsByFolder.get(it.folderId);
      if (!set) {
        set = new Set<string>();
        itemsByFolder.set(it.folderId, set);
      }
      set.add(it.kanji);
    }

    const walk = (
      parentId: string | null,
      depth = 0
    ): Array<{
      id: string;
      name: string;
      depth: number;
      totalCount: number;
      alreadyHasCount: number;
    }> => {
      const children = folders
        .filter((f) =>
          parentId === null
            ? !f.parentId || !folderIdSet.has(f.parentId)
            : f.parentId === parentId
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const list: Array<{
        id: string;
        name: string;
        depth: number;
        totalCount: number;
        alreadyHasCount: number;
      }> = [];

      for (const child of children) {
        const set = itemsByFolder.get(child.id);
        let overlap = 0;
        if (set) {
          selectedCharsSet.forEach((ch) => {
            if (set.has(ch)) overlap += 1;
          });
        }
        list.push({
          id: child.id,
          name: child.name,
          depth,
          totalCount: set ? set.size : 0,
          alreadyHasCount: overlap,
        });
        list.push(...walk(child.id, depth + 1));
      }
      return list;
    };

    return walk(null, 0);
  }, [folders, items, selectedCharsSet]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setCompletedInfo(null);
    setNewFolderName(suggestedDeckName);
    setNewDescription('');
    setNewParentId(null);
    if (folderOptions.length > 0) {
      setMode('existing');
      setSelectedFolderId((prev) =>
        folderOptions.some((o) => o.id === prev) ? prev : folderOptions[0].id
      );
    } else {
      setMode('new');
      setSelectedFolderId('');
    }
  }, [isOpen, suggestedDeckName, folderOptions.length]);

  if (!isOpen || entries.length === 0) return null;

  const handleConfirm = () => {
    setError(null);

    if (mode === 'existing') {
      if (!selectedFolderId) {
        setError('Vui lòng chọn một bộ thẻ đích.');
        return;
      }
      const target = folders.find((f) => f.id === selectedFolderId);
      const res = addCatalogKanjiToFolder(selectedFolderId, entries);
      const result = {
        ...res,
        folderId: selectedFolderId,
        folderName: target?.name || 'Bộ thẻ',
      };
      setCompletedInfo(result);
      onSuccess?.(result);
      return;
    }

    // Create new folder then populate it
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setError('Tên bộ thẻ mới không được để trống.');
      return;
    }

    const createRes = createFolder(trimmed, newParentId, newDescription);
    if (!createRes.ok || !createRes.folder) {
      setError(createRes.error || 'Không thể tạo bộ thẻ mới.');
      return;
    }

    const addRes = addCatalogKanjiToFolder(createRes.folder.id, entries);
    const result = {
      ...addRes,
      folderId: createRes.folder.id,
      folderName: createRes.folder.name,
    };
    setCompletedInfo(result);
    onSuccess?.(result);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-teal-700" />
            <span>Lưu {entries.length} chữ Kanji vào Bộ thẻ</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Preview */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap gap-1.5 shrink-0">
          {entries.slice(0, 14).map((entry) => (
            <span
              key={entry.kanji}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-kanji text-base font-bold text-slate-900"
              title={`${entry.kanji}${entry.hanViet ? ` · ${entry.hanViet}` : ''}`}
            >
              {entry.kanji}
            </span>
          ))}
          {entries.length > 14 && (
            <span className="px-2.5 h-8 rounded-lg bg-slate-200/80 flex items-center justify-center text-xs font-semibold text-slate-700 tabular-nums">
              +{entries.length - 14}
            </span>
          )}
        </div>

        {completedInfo ? (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <Check className="w-4 h-4 shrink-0" />
                <span>Đã lưu vào bộ thẻ "{completedInfo.folderName}"</span>
              </div>
              <p className="text-xs text-emerald-800/90 tabular-nums">
                Thêm mới <strong>{completedInfo.addedCount}</strong> chữ Kanji
                {completedInfo.skippedCount > 0 && (
                  <> · Bỏ qua <strong>{completedInfo.skippedCount}</strong> chữ đã có sẵn</>
                )}
                . Toàn bộ âm Hán-Việt, On/Kun và nghĩa đã sẵn sàng để ôn tập Flashcard SRS.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Tiếp tục học cấp độ
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/decks/${completedInfo.folderId}`);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <span>Mở bộ thẻ ngay</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMode('existing');
                  setError(null);
                }}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'existing'
                    ? 'bg-white text-teal-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers3 className="w-3.5 h-3.5" />
                <span>Thêm vào bộ có sẵn</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('new');
                  setError(null);
                }}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'new'
                    ? 'bg-white text-teal-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo bộ thẻ mới</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 text-xs">
              {mode === 'existing' ? (
                folderOptions.length === 0 ? (
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2 text-slate-600">
                    <p>Bạn chưa có bộ thẻ nào. Hãy chuyển sang tab "Tạo bộ thẻ mới".</p>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {folderOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                          selectedFolderId === opt.id
                            ? 'bg-teal-50/75 text-teal-950'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                        style={{ paddingLeft: `${opt.depth * 16 + 12}px` }}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <input
                            type="radio"
                            name="add-kanji-target-folder"
                            checked={selectedFolderId === opt.id}
                            onChange={() => {
                              setSelectedFolderId(opt.id);
                              setError(null);
                            }}
                            className="text-teal-700 focus:ring-teal-600 shrink-0"
                          />
                          <Folder className="w-3.5 h-3.5 text-teal-700/75 shrink-0" />
                          <span className="truncate font-medium">{opt.name}</span>
                        </span>
                        <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                          {opt.totalCount} thẻ
                          {opt.alreadyHasCount > 0 && (
                            <span className="text-amber-700 font-medium">
                              {' '}
                              · đã có {opt.alreadyHasCount}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên bộ thẻ mới <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => {
                        setNewFolderName(e.target.value);
                        setError(null);
                      }}
                      placeholder="Ví dụ: N5 · Tuần 1 (Số & Thời gian)"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Thư mục cha (tuỳ chọn)
                    </label>
                    <select
                      value={newParentId || ''}
                      onChange={(e) => setNewParentId(e.target.value || null)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    >
                      <option value="">Thư mục gốc (Cấp cao nhất)</option>
                      {folderOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {'— '.repeat(opt.depth)}
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mô tả ngắn (tuỳ chọn)
                    </label>
                    <input
                      type="text"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Ghi chú nguồn bài học hoặc mục tiêu..."
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 min-h-[38px] text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer whitespace-nowrap"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={mode === 'existing' && !selectedFolderId}
                className="px-4 py-2 min-h-[38px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {mode === 'new'
                    ? `Tạo & Lưu ${entries.length} chữ`
                    : `Lưu ${entries.length} chữ vào đây`}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
