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
import { FolderKanjiItem } from '../types/deck';
import {
  SAMPLE_COMPOUND_WORDS_JSON,
  SAMPLE_COMPOUND_WORDS_TEXT,
  buildCompoundWordsAiPrompt,
  parseCompoundWordsJson,
  parseCompoundWordsText,
} from '../utils/batchLessonParser';

interface BatchImportCompoundModalProps {
  item: FolderKanjiItem | null;
  onClose: () => void;
}

type ImportTab = 'text' | 'json';

export const BatchImportCompoundModal: React.FC<BatchImportCompoundModalProps> = ({
  item,
  onClose,
}) => {
  const { batchAddCompoundWords } = useDecks();

  const [activeTab, setActiveTab] = useState<ImportTab>('text');
  const [textInput, setTextInput] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (activeTab === 'text') {
      return parseCompoundWordsText(textInput);
    }
    return parseCompoundWordsJson(jsonInput);
  }, [activeTab, textInput, jsonInput]);

  const existingWords = useMemo(() => {
    if (!item) return new Set<string>();
    return new Set((item.compoundWords || []).map((cw) => cw.word.trim()));
  }, [item]);

  const previewStats = useMemo(() => {
    let newCount = 0;
    let duplicateCount = 0;
    for (const w of parsed.words) {
      if (existingWords.has(w.word.trim())) {
        duplicateCount += 1;
      } else {
        newCount += 1;
      }
    }
    return { newCount, duplicateCount };
  }, [parsed.words, existingWords]);

  if (!item) return null;

  const handleClose = () => {
    setSuccessMsg(null);
    setSubmitError(null);
    onClose();
  };

  const handleDownloadSampleJson = () => {
    const jsonStr = JSON.stringify(SAMPLE_COMPOUND_WORDS_JSON, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tu-ghep-${item.kanji}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildCompoundWordsAiPrompt(item.kanji));
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

  const handleSubmit = () => {
    if (previewStats.newCount === 0) return;
    const added = batchAddCompoundWords(item.id, parsed.words);
    setSuccessMsg(`Đã thêm ${added} từ ghép mới cho chữ ${item.kanji}!`);
    setTimeout(() => {
      setTextInput('');
      setJsonInput('');
      setSuccessMsg(null);
      onClose();
    }, 850);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[1px]"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ListPlus className="w-4 h-4 text-teal-700 shrink-0" />
              <span className="truncate">
                Nhập từ ghép cho chữ <span className="font-kanji text-teal-800">{item.kanji}</span>
                {item.hanViet ? ` (${item.hanViet})` : ''}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Các từ ghép đã tồn tại sẽ tự động được bỏ qua để tránh trùng lặp.
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
              <span>JSON (AI)</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto space-y-3.5 flex-1">
          {activeTab === 'text' ? (
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5">
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div>
                    Cú pháp:{' '}
                    <code className="font-mono font-semibold text-teal-800">
                      TừGhép:CáchĐọc:HánViệt:Nghĩa
                    </code>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Mỗi dòng một từ (hoặc phân cách bằng dấu <code className="font-mono">;</code>). Hỗ trợ rút gọn <code className="font-mono">TừGhép:Nghĩa</code>.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTextInput(SAMPLE_COMPOUND_WORDS_TEXT)}
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
                rows={6}
                placeholder={SAMPLE_COMPOUND_WORDS_TEXT}
                className="w-full p-3 text-xs font-mono bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all leading-relaxed"
              />
            </div>
          ) : (
            <div className="space-y-2.5">
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
                rows={6}
                placeholder={JSON.stringify(SAMPLE_COMPOUND_WORDS_JSON, null, 2)}
                className="w-full p-3 text-xs font-mono bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all leading-relaxed"
              />
            </div>
          )}

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
              </ul>
            </div>
          )}

          {parsed.words.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-semibold text-slate-700">Xem trước từ ghép</span>
                <div className="flex items-center gap-2 text-slate-600 tabular-nums">
                  <span>
                    <strong className="text-teal-700">+{previewStats.newCount}</strong> từ mới
                  </span>
                  {previewStats.duplicateCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500">
                        {previewStats.duplicateCount} từ đã có (bỏ qua)
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto bg-white">
                {parsed.words.map((cw) => {
                  const isDup = existingWords.has(cw.word.trim());
                  return (
                    <div
                      key={cw.word}
                      className={`px-3.5 py-2 flex items-center justify-between gap-3 text-xs ${
                        isDup ? 'opacity-55' : ''
                      }`}
                    >
                      <div className="flex items-center flex-wrap gap-2.5 min-w-0">
                        <span className="font-kanji font-bold text-sm text-teal-900">
                          {cw.word}
                        </span>
                        {cw.reading && (
                          <span className="font-mono text-slate-600">{cw.reading}</span>
                        )}
                        {cw.hanViet && (
                          <span className="font-semibold text-slate-800">{cw.hanViet}</span>
                        )}
                        <span className="text-slate-600">{cw.meaning}</span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold shrink-0 ${
                          isDup ? 'text-slate-400' : 'text-teal-700'
                        }`}
                      >
                        {isDup ? 'Đã có' : 'Mới'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={previewStats.newCount === 0 || !!successMsg}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <ListPlus className="w-4 h-4" />
            <span>
              {previewStats.newCount > 0
                ? `Thêm ${previewStats.newCount} từ ghép`
                : 'Thêm từ ghép'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
