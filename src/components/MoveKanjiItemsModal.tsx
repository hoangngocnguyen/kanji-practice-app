import React, { useEffect, useMemo, useState } from 'react';
import { FolderInput, Folder, X, AlertCircle, Check } from 'lucide-react';
import { useDecks } from '../context/DeckContext';

interface MoveKanjiItemsModalProps {
  isOpen: boolean;
  itemIds: string[];
  sourceFolderId: string;
  onClose: () => void;
  onMoved?: (result: {
    movedCount: number;
    mergedCount: number;
    targetName: string;
  }) => void;
}

export const MoveKanjiItemsModal: React.FC<MoveKanjiItemsModalProps> = ({
  isOpen,
  itemIds,
  sourceFolderId,
  onClose,
  onMoved,
}) => {
  const { folders, items, moveKanjiItems } = useDecks();
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const selectedItems = useMemo(() => {
    const idSet = new Set(itemIds);
    return items.filter((it) => idSet.has(it.id));
  }, [items, itemIds]);

  const itemSourceFolderIds = useMemo(
    () => new Set(selectedItems.map((it) => it.folderId)),
    [selectedItems]
  );

  const folderOptions = useMemo(() => {
    const folderIdSet = new Set(folders.map((f) => f.id));
    const walk = (
      parentId: string | null,
      depth = 0
    ): Array<{ id: string; name: string; depth: number; isSameSource: boolean }> => {
      const children = folders
        .filter((f) =>
          parentId === null
            ? !f.parentId || !folderIdSet.has(f.parentId)
            : f.parentId === parentId
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const list: Array<{ id: string; name: string; depth: number; isSameSource: boolean }> = [];
      for (const child of children) {
        const isOnlySource =
          child.id === sourceFolderId &&
          itemSourceFolderIds.size === 1 &&
          itemSourceFolderIds.has(sourceFolderId);
        list.push({
          id: child.id,
          name: child.name,
          depth,
          isSameSource: isOnlySource,
        });
        list.push(...walk(child.id, depth + 1));
      }
      return list;
    };

    return walk(null, 0);
  }, [folders, sourceFolderId, itemSourceFolderIds]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    const firstValid = folderOptions.find((o) => !o.isSameSource);
    setSelectedTargetId(firstValid?.id || '');
  }, [isOpen, folderOptions]);

  if (!isOpen || itemIds.length === 0) return null;

  const hasValidTarget = folderOptions.some((o) => !o.isSameSource);

  const handleConfirm = () => {
    if (!selectedTargetId) {
      setError('Vui lòng chọn bộ thẻ / thư mục đích.');
      return;
    }
    const targetFolder = folders.find((f) => f.id === selectedTargetId);
    const res = moveKanjiItems(itemIds, selectedTargetId);
    if (res.movedCount === 0 && res.mergedCount === 0) {
      setError('Các thẻ đã chọn hiện đã nằm trong thư mục này.');
      return;
    }
    onMoved?.({
      ...res,
      targetName: targetFolder?.name || 'thư mục đích',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FolderInput className="w-4 h-4 text-teal-700" />
            <span>Di chuyển {selectedItems.length} thẻ Kanji</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Kanji preview */}
        {selectedItems.length > 0 && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap gap-1.5">
            {selectedItems.slice(0, 12).map((it) => (
              <span
                key={it.id}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-kanji text-base font-bold text-slate-900"
              >
                {it.kanji}
              </span>
            ))}
            {selectedItems.length > 12 && (
              <span className="px-2.5 h-8 rounded-lg bg-slate-200/70 flex items-center justify-center text-xs font-semibold text-slate-700 tabular-nums">
                +{selectedItems.length - 12}
              </span>
            )}
          </div>
        )}

        <div className="space-y-2 text-xs">
          <p className="text-slate-600">
            Chọn bộ thẻ đích (nếu chữ Kanji đã có ở bộ đích, các từ ghép sẽ tự động được gộp thêm):
          </p>

          {!hasValidTarget ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500">
              Bạn chưa có thư mục / bộ thẻ nào khác để di chuyển sang. Hãy tạo thêm thư mục ở danh sách bộ thẻ.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {folderOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 transition-colors ${
                    opt.isSameSource
                      ? 'bg-slate-50/70 text-slate-400 cursor-not-allowed'
                      : selectedTargetId === opt.id
                      ? 'bg-teal-50/70 text-teal-950 cursor-pointer'
                      : 'hover:bg-slate-50 text-slate-800 cursor-pointer'
                  }`}
                  style={{ paddingLeft: `${opt.depth * 16 + 12}px` }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <input
                      type="radio"
                      name="move-kanji-target"
                      disabled={opt.isSameSource}
                      checked={selectedTargetId === opt.id}
                      onChange={() => {
                        setSelectedTargetId(opt.id);
                        setError(null);
                      }}
                      className="text-teal-700 focus:ring-teal-600 shrink-0"
                    />
                    <Folder className="w-3.5 h-3.5 text-teal-700/70 shrink-0" />
                    <span className="truncate font-medium">{opt.name}</span>
                  </span>
                  {opt.isSameSource && (
                    <span className="text-[11px] text-slate-400 shrink-0">Đang ở đây</span>
                  )}
                </label>
              ))}
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer whitespace-nowrap"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!hasValidTarget || !selectedTargetId}
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Di chuyển đến đây</span>
          </button>
        </div>
      </div>
    </div>
  );
};
