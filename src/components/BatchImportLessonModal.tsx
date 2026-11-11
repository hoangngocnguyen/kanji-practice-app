import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  FileText,
  FileJson,
  Download,
  Copy,
  Check,
  Upload,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ListPlus,
} from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import {
  AI_JSON_PROMPT_TEMPLATE,
  SAMPLE_MINIMAL_JSON,
  SAMPLE_QUICK_TEXT,
  parseMinimalJsonLesson,
  parseQuickTextLesson,
} from '../utils/batchLessonParser';

interface BatchImportLessonModalProps {
  isOpen: boolean;
  folderId: string;
  folderName: string;
  onClose: () => void;
}

type ImportTab = 'text' | 'json';

export const BatchImportLessonModal: React.FC<BatchImportLessonModalProps> = ({
  isOpen,
  folderId,
  folderName,
  onClose,
}) => {
  const { items, batchImportItemsToFolder } = useDecks();

  const [activeTab, setActiveTab] = useState<ImportTab>('text');
  const [textInput, setTextInput] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (activeTab === 'text') {
      return parseQuickTextLesson(textInput);
    }
    return parseMinimalJsonLesson(jsonInput);
  }, [activeTab, textInput, jsonInput]);

  const existingByKanji = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const item of items) {
      if (item.folderId !== folderId) continue;
      map.set(
        item.kanji,
        new Set((item.compoundWords || []).map((cw) => cw.word.trim()))
      );
    }
    return map;
  }, [items, folderId]);

  const previewStats = useMemo(() => {
    let newKanji = 0;
    let mergeKanji = 0;
    let newCompoundWords = 0;

    for (const entry of parsed.items) {
      const existingWords = existingByKanji.get(entry.kanji);
      if (!existingWords) {
        newKanji += 1;
        newCompoundWords += entry.compoundWords.length;
      } else {
        mergeKanji += 1;
        for (const cw of entry.compoundWords) {
          if (!existingWords.has(cw.word.trim())) {
            newCompoundWords += 1;
          }
        }
      }
    }

    return { newKanji, mergeKanji, newCompoundWords };
  }, [parsed.items, existingByKanji]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setSuccessMsg(null);
    setSubmitError(null);
    onClose();
  };

  const handleDownloadSampleJson = () => {
    const jsonStr = JSON.stringify(SAMPLE_MINIMAL_JSON, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kanji-lesson-sample.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_JSON_PROMPT_TEMPLATE);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      setSubmitError('Không thể sao chép tự động. Vui lòng thử lại.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setJsonInput(reader.result);
        setSubmitError(null);
        setSuccessMsg(null);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (parsed.items.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMsg(null);

    try {
      const result = await batchImportItemsToFolder(folderId, parsed.items);
      setSuccessMsg(
        `Đã thêm ${result.addedKanji} Kanji mới, gộp ${result.mergedKanji} Kanji có sẵn và ${result.addedCompoundWords} từ ghép mới!`
      );
      setTimeout(() => {
        setTextInput('');
        setJsonInput('');
        setSuccessMsg(null);
        onClose();
      }, 950);
    } catch {
      setSubmitError('Có lỗi xảy ra khi nhập dữ liệu vào bài học.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewSlice = parsed.items.slice(0, 12);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[1px]"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ListPlus className="w-4 h-4 text-teal-700 shrink-0" />
              <span className="truncate">Nhập hàng loạt vào bài học</span>
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              Bài học: <span className="font-semibold text-slate-700">{folderName}</span> · Kanji trùng sẽ được gộp thêm từ ghép mới
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-5 pt-3">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('text');
                setSubmitError(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-teal-700" />
              <span>Cú pháp Text nhanh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('json');
                setSubmitError(null);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileJson className="w-3.5 h-3.5 text-teal-700" />
              <span>JSON tối gian (AI)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="px-5 py-4 overflow-y-auto space-y-3.5 flex-1">
          {activeTab === 'text' ? (
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5">
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div>
                    Cú pháp mỗi dòng:{' '}
                    <code className="font-mono font-semibold text-teal-800">
                      Kanji | TừGhép:CáchĐọc:HánViệt:Nghĩa ; TừGhép2:...
                    </code>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Hỗ trợ rút gọn <code className="font-mono">TừGhép:Nghĩa</code> hoặc{' '}
                    <code className="font-mono">TừGhép:CáchĐọc:Nghĩa</code>.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTextInput(SAMPLE_QUICK_TEXT)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
                >
                  Chèn ví dụ mẫu
                </button>
              </div>

              <textarea
                value={textInput}
                onChange={(e) => {
                  setTextInput(e.target.value);
                  setSubmitError(null);
                  setSuccessMsg(null);
                }}
                rows={7}
                placeholder={SAMPLE_QUICK_TEXT}
                className="w-full p-3 text-xs font-mono bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all leading-relaxed"
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 space-y-0.5">
                <div>
                  Chỉ cần nhập chữ <code className="font-mono font-semibold text-teal-800">kanji</code> và mảng từ ghép{' '}
                  <code className="font-mono font-semibold text-teal-800">compoundWords</code>.
                </div>
                <div className="text-[11px] text-slate-500">
                  Không cần nhập nghĩa, Hán-Việt hay âm On/Kun của chữ Kanji — hệ thống sẽ tự động tra cứu.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSampleJson}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tải file JSON mẫu</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Đã sao chép Prompt</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                      <span>Sao chép Prompt cho AI</span>
                      <Copy className="w-3 h-3 opacity-70" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Chọn file .json</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setSubmitError(null);
                  setSuccessMsg(null);
                }}
                rows={7}
                placeholder={JSON.stringify(SAMPLE_MINIMAL_JSON, null, 2)}
                className="w-full p-3 text-xs font-mono bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all leading-relaxed"
              />
            </div>
          )}

          {/* Parse Errors */}
          {parsed.errors.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Lưu ý cú pháp ({parsed.errors.length}):</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {parsed.errors.slice(0, 4).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {parsed.errors.length > 4 && (
                  <li>...và {parsed.errors.length - 4} dòng khác</li>
                )}
              </ul>
            </div>
          )}

          {/* Live Preview */}
          {parsed.items.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-semibold text-slate-700">Xem trước dữ liệu sẽ nhập</span>
                <div className="flex items-center gap-2 text-slate-600 tabular-nums">
                  <span>
                    <strong className="text-teal-700">+{previewStats.newKanji}</strong> Kanji mới
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Gộp <strong className="text-slate-900">{previewStats.mergeKanji}</strong> Kanji có sẵn
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="text-teal-700">+{previewStats.newCompoundWords}</strong> từ ghép
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto bg-white">
                {previewSlice.map((entry) => {
                  const isMerge = existingByKanji.has(entry.kanji);
                  return (
                    <div
                      key={entry.kanji}
                      className="px-3.5 py-2 flex items-start gap-3 text-xs"
                    >
                      <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center font-kanji font-bold text-base text-slate-900 shrink-0">
                        {entry.kanji}
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-semibold ${
                              isMerge ? 'text-amber-700' : 'text-teal-700'
                            }`}
                          >
                            {isMerge ? 'Gộp vào thẻ có sẵn' : 'Tạo thẻ mới'}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="text-slate-500 tabular-nums">
                            {entry.compoundWords.length} từ ghép
                          </span>
                        </div>
                        {entry.compoundWords.length > 0 && (
                          <p className="text-[11px] text-slate-600 truncate">
                            {entry.compoundWords
                              .map((cw) => `${cw.word} (${cw.meaning})`)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {parsed.items.length > previewSlice.length && (
                  <div className="px-3.5 py-2 text-[11px] text-slate-500 text-center bg-slate-50/50">
                    ...và {parsed.items.length - previewSlice.length} chữ Kanji nữa
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feedback */}
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={parsed.items.length === 0 || isSubmitting || !!successMsg}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <ListPlus className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Đang nhập...'
                : parsed.items.length > 0
                ? `Nhập vào bài học (${parsed.items.length} Kanji)`
                : 'Nhập vào bài học'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
