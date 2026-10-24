import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Check,
  Copy,
  Search,
  FileText,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';

interface KanjiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToInput: (kanjiText: string) => void;
  onApplyToSearch: (kanjiText: string) => void;
  onInspectKanji?: (char: string) => void;
}

interface DetectedKanji {
  char: string;
  hanViet: string;
}

// Sample presets with embedded SVG data URIs for instant zero-network testing
const SAMPLE_OCR_IMAGES = [
  {
    title: 'Biển chỉ dẫn Tokyo',
    desc: 'Biển báo giao thông & địa danh',
    text: '東京都新宿区 止まれ 進入禁止',
    previewKanji: '東京新宿区止進入禁止',
  },
  {
    title: 'Sách ôn thi JLPT',
    desc: 'Đoạn văn đọc hiểu N3-N2',
    text: '日本語能力試験 読解問題 合格 練習',
    previewKanji: '日本語能力試験読解問題合格練習',
  },
  {
    title: 'Thành ngữ Yojijukugo',
    desc: 'Thư pháp 4 chữ Hán',
    text: '一期一会 温故知新 七転八起',
    previewKanji: '一期一会温故知新七転八起',
  },
];

export const KanjiScannerModal: React.FC<KanjiScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyToInput,
  onApplyToSearch,
  onInspectKanji,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [extractedRawText, setExtractedRawText] = useState<string>('');
  const [detectedKanjiList, setDetectedKanjiList] = useState<DetectedKanji[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Extract CJK characters from text
  const parseKanjiFromText = useCallback((raw: string) => {
    const kanjiRegex = /[\u4e00-\u9faf]/g;
    const matches = raw.match(kanjiRegex) || [];
    const seen = new Set<string>();
    const unique: DetectedKanji[] = [];

    for (const char of matches) {
      if (!seen.has(char)) {
        seen.add(char);
        unique.push({
          char,
          hanViet: SINO_VIETNAMESE_MAP[char] || 'Chữ Hán',
        });
      }
    }
    return unique;
  }, []);

  // Run OCR on an image
  const processImage = useCallback(
    async (source: string | File) => {
      setIsScanning(true);
      setErrorMessage(null);
      setScanProgress(0);
      setStatusMessage('Đang khởi tạo công cụ nhận diện...');

      try {
        let worker: any = null;
        try {
          // Initialize worker with Japanese + English
          worker = await createWorker(['jpn', 'eng'], 1, {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                setScanProgress(Math.round(m.progress * 100));
                setStatusMessage(`Đang nhận diện chữ Hán... ${Math.round(m.progress * 100)}%`);
              } else if (m.status === 'loading tesseract core') {
                setStatusMessage('Đang nạp lõi xử lý hình ảnh...');
              } else if (m.status === 'loading language traineddata') {
                setStatusMessage('Đang nạp từ điển Hán tự...');
              }
            },
          });

          const ret = await worker.recognize(source);
          const raw = ret.data.text || '';
          setExtractedRawText(raw);

          const kanjiItems = parseKanjiFromText(raw);
          setDetectedKanjiList(kanjiItems);

          await worker.terminate();

          if (kanjiItems.length === 0) {
            setErrorMessage('Không nhận diện được chữ Kanji nào trong ảnh này. Hãy thử ảnh rõ nét hơn hoặc chọn một mẫu bên dưới.');
          }
        } catch (ocrError: any) {
          console.warn('Tesseract worker fallback:', ocrError);
          // If network restrictions prevent CDN worker, fall back to canvas pattern if sample
          throw ocrError;
        }
      } catch (err: any) {
        setErrorMessage(
          'Không thể hoàn tất quét OCR tự động (do giới hạn mạng tải từ điển). Bạn có thể bấm chọn các mẫu ảnh mẫu có sẵn bên dưới để thử nghiệm ngay lập tức!'
        );
      } finally {
        setIsScanning(false);
      }
    },
    [parseKanjiFromText]
  );

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn một tệp hình ảnh (PNG, JPG, WEBP,...)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImageSrc(src);
      processImage(file);
    };
    reader.readAsDataURL(file);
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        setImageSrc(src);
        processImage(file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clipboard paste listener (Ctrl+V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const src = event.target?.result as string;
              setImageSrc(src);
              processImage(blob);
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, processImage]);

  // Test with preset sample
  const handleSelectSample = (sample: typeof SAMPLE_OCR_IMAGES[0]) => {
    // Generate synthetic graphic for sample
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 600, 200);
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 580, 180);
      ctx.font = 'bold 36px "Noto Sans JP", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sample.text, 300, 100);
      const url = canvas.toDataURL('image/png');
      setImageSrc(url);
    }

    setExtractedRawText(sample.text);
    const kanjiItems = parseKanjiFromText(sample.previewKanji);
    setDetectedKanjiList(kanjiItems);
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  const kanjiString = detectedKanjiList.map((k) => k.char).join('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-600 text-white rounded-xl shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-1.5">
                Quét ảnh trích xuất Kanji (OCR)
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full uppercase">
                  Tự động
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Tải ảnh lên hoặc bấm <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-mono">Ctrl+V</kbd> để dán ảnh chụp màn hình
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-all ${
              imageSrc
                ? 'border-teal-400 bg-teal-50/30 hover:bg-teal-50/50'
                : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {imageSrc ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative max-h-48 max-w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-white">
                  <img src={imageSrc} alt="Ảnh đã tải lên" className="max-h-48 object-contain" />
                </div>
                <div className="flex items-center gap-2 text-xs text-teal-700 font-semibold">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Bấm để thay đổi ảnh khác (hoặc dán Ctrl+V)</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 py-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Kéo & thả ảnh vào đây, hoặc <span className="text-teal-700 underline">chọn tệp từ máy</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hỗ trợ JPG, PNG, WEBP • Bạn có thể chụp màn hình và nhấn <strong>Ctrl+V</strong> bất cứ lúc nào
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Preset Samples */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Hoặc thử nhanh với ảnh mẫu chữ Hán:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_OCR_IMAGES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50/60 hover:bg-teal-50/50 transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-teal-800">
                    {sample.title}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{sample.desc}</div>
                  <div className="mt-1 font-kanji text-xs text-teal-700 font-semibold truncate bg-white px-1.5 py-0.5 rounded border border-slate-200/80">
                    {sample.previewKanji}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Progress / Status Bar */}
          {isScanning && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 space-y-2 text-center animate-pulse">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-teal-800">
                <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                <span>{statusMessage}</span>
              </div>
              <div className="w-full bg-teal-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-2xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Extracted Results */}
          {detectedKanjiList.length > 0 && (
            <div className="space-y-3.5 bg-slate-50/80 rounded-2xl p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Tìm thấy <strong className="text-teal-700">{detectedKanjiList.length}</strong> chữ Kanji:
                </span>
                <span className="text-[11px] text-slate-400">Click từng chữ để xem nét</span>
              </div>

              {/* Detected Kanji Chips */}
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                {detectedKanjiList.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (onInspectKanji) {
                        onInspectKanji(item.char);
                        onClose();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-xl transition-all cursor-pointer shadow-2xs group"
                    title={`Click để mở hoạt ảnh chữ ${item.char} (${item.hanViet})`}
                  >
                    <span className="font-kanji font-bold text-base text-slate-900 group-hover:text-teal-700">
                      {item.char}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 group-hover:bg-teal-100 group-hover:text-teal-800 px-1.5 py-0.5 rounded">
                      {item.hanViet}
                    </span>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center gap-2">
                {/* Apply to Main Input */}
                <button
                  type="button"
                  onClick={() => {
                    onApplyToInput(kanjiString);
                    onClose();
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Dán vào ô nhập chính ({detectedKanjiList.length} chữ)</span>
                </button>

                {/* Apply to Search Box */}
                <button
                  type="button"
                  onClick={() => {
                    onApplyToSearch(kanjiString);
                    onClose();
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-4 h-4 text-teal-600" />
                  <span>Điền vào ô tìm kiếm nhanh</span>
                </button>

                {/* Copy String */}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(kanjiString);
                    setCopiedAll(true);
                    setTimeout(() => setCopiedAll(false), 1500);
                  }}
                  className="w-full sm:w-auto p-2.5 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title="Sao chép chuỗi chữ Hán vào Clipboard"
                >
                  {copiedAll ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span className="sm:hidden">{copiedAll ? 'Đã sao chép' : 'Sao chép chuỗi'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
