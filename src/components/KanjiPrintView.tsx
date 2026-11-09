import React, { useState } from 'react';
import {
  Printer,
  CheckSquare,
  Square,
  ArrowLeft,
  FileText,
  Check,
  RotateCcw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useKanji } from '../context/KanjiContext';
import { getPrimaryHiragana, katakanaToHiragana } from '../utils/kanji';
import { KanjiSvgView } from './KanjiSvgView';

export const KanjiPrintView: React.FC = () => {
  const navigate = useNavigate();
  const { mergedKanjiList } = useKanji();

  // Column selection states for printing
  const [printStt, setPrintStt] = useState<boolean>(true);
  const [printKanji, setPrintKanji] = useState<boolean>(true);
  const [printReadings, setPrintReadings] = useState<boolean>(true);
  const [printImage, setPrintImage] = useState<boolean>(true);
  const [printPracticeBoxes, setPrintPracticeBoxes] = useState<boolean>(true);

  // Kanji selection set (default all selected)
  const [selectedHexes, setSelectedHexes] = useState<Set<string>>(
    () => new Set(mergedKanjiList.map((k) => k.hex))
  );

  // Sync if kanji list changes and selectedHexes was empty
  React.useEffect(() => {
    if (mergedKanjiList.length > 0 && selectedHexes.size === 0) {
      setSelectedHexes(new Set(mergedKanjiList.map((k) => k.hex)));
    }
  }, [mergedKanjiList]);

  const toggleKanji = (hex: string) => {
    setSelectedHexes((prev) => {
      const next = new Set(prev);
      if (next.has(hex)) {
        next.delete(hex);
      } else {
        next.add(hex);
      }
      return next;
    });
  };

  const selectAllKanji = () => {
    setSelectedHexes(new Set(mergedKanjiList.map((k) => k.hex)));
  };

  const deselectAllKanji = () => {
    setSelectedHexes(new Set());
  };

  const printableList = mergedKanjiList.filter((k) => selectedHexes.has(k.hex));

  const handlePrint = () => {
    if (printableList.length === 0) {
      return;
    }
    if (!printStt && !printKanji && !printReadings && !printImage && !printPracticeBoxes) {
      return;
    }
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Empty State if no Kanji extracted yet
  if (mergedKanjiList.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 mx-auto">
          <Printer className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Chưa có chữ Kanji nào để in
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Vui lòng nhập văn bản tiếng Nhật hoặc tải ảnh chữ Hán ở trang Nhập văn bản để tạo danh sách chữ cần in phiếu luyện viết.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/input"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>Đi tới Nhập văn bản</span>
          </Link>
        </div>
      </div>
    );
  }

  const allColumnsSelected =
    printStt && printKanji && printReadings && printImage && printPracticeBoxes;

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Configuration & Actions Bar (Hidden when printed, Sticky on scroll) */}
      <div className="print:hidden sticky top-16 sm:top-[68px] z-20">
        {/* Main Controls Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm hover:shadow-md p-4 sm:p-5 space-y-4 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="space-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-700" />
                <span>Tùy chọn In Phiếu Luyện Viết A4</span>
              </h2>
              <p className="text-xs text-slate-500">
                Chọn chữ Kanji và cấu hình các cột trước khi in • Hỗ trợ in trực tiếp hoặc xuất PDF
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={printableList.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs hover:shadow-md disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>In / Xuất PDF ngay</span>
              </button>
            </div>
          </div>

          {/* Kanji Selection Strip */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Chọn chữ Kanji để in:</span>
                <span className="text-teal-800 font-semibold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full text-[11px]">
                  {printableList.length} / {mergedKanjiList.length} chữ được chọn
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllKanji}
                  className="text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={deselectAllKanji}
                  className="text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>

            {/* Horizontally scrollable chip row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
              {mergedKanjiList.map((k) => {
                const isSelected = selectedHexes.has(k.hex);
                const hanViet = k.detail?.hanViet;
                return (
                  <button
                    key={k.hex}
                    type="button"
                    onClick={() => toggleKanji(k.hex)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs flex flex-col items-center justify-center transition-all cursor-pointer shrink-0 min-w-[42px] ${
                      isSelected
                        ? 'bg-teal-700 text-white border-teal-800 shadow-2xs font-bold'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 opacity-60'
                    }`}
                    title={`Click để ${isSelected ? 'bỏ chọn' : 'chọn'} chữ ${k.kanji}`}
                  >
                    <span className="font-kanji text-base leading-none">{k.kanji}</span>
                    {hanViet && (
                      <span
                        className={`text-[9px] font-sans mt-0.5 uppercase ${
                          isSelected ? 'text-teal-100 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {hanViet}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column Visibility Checkboxes */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Các cột hiển thị:</span>
              <button
                type="button"
                onClick={() => {
                  setPrintStt(!allColumnsSelected);
                  setPrintKanji(!allColumnsSelected);
                  setPrintReadings(!allColumnsSelected);
                  setPrintImage(!allColumnsSelected);
                  setPrintPracticeBoxes(!allColumnsSelected);
                }}
                className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
              >
                {allColumnsSelected ? 'Bỏ chọn tất cả cột' : 'Chọn tất cả cột'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setPrintStt(!printStt)}
                className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
              >
                {printStt ? (
                  <CheckSquare className="w-4 h-4 text-teal-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>STT</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintKanji(!printKanji)}
                className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
              >
                {printKanji ? (
                  <CheckSquare className="w-4 h-4 text-teal-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Chữ Hán &amp; Hán-Việt</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintReadings(!printReadings)}
                className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
              >
                {printReadings ? (
                  <CheckSquare className="w-4 h-4 text-teal-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Âm đọc &amp; Ý nghĩa</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintImage(!printImage)}
                className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
              >
                {printImage ? (
                  <CheckSquare className="w-4 h-4 text-teal-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Ảnh Nét Vẽ</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintPracticeBoxes(!printPracticeBoxes)}
                className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
              >
                {printPracticeBoxes ? (
                  <CheckSquare className="w-4 h-4 text-teal-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Ô Luyện Viết Tay</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Paper Sheet Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-8 kanji-print-paper-sheet">
        {/* Header on Printable Sheet */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
              Bảng Tra Cứu &amp; Phiếu Luyện Viết Kanji
            </h1>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Thứ tự nét viết chuẩn • Furigana • Âm Hán-Việt &amp; Ô tập viết tay
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <div>
              Ngày in: <strong className="text-slate-900">{currentDate}</strong>
            </div>
            <div>
              Tổng số:{' '}
              <strong className="text-slate-900">{printableList.length}</strong> chữ
            </div>
          </div>
        </div>

        {printableList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Chưa có chữ Kanji nào được chọn để in. Vui lòng tick chọn ít nhất một chữ ở trên.
          </div>
        ) : (
          <table className="w-full border-collapse border border-slate-400 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400 text-center">
                {printStt && <th className="p-2 border-r border-slate-300 w-12">STT</th>}
                {printKanji && (
                  <th className="p-2 border-r border-slate-300 w-32">Chữ Hán &amp; Hán-Việt</th>
                )}
                {printReadings && (
                  <th className="p-2 border-r border-slate-300 text-left">Âm đọc &amp; Ý nghĩa</th>
                )}
                {printImage && <th className="p-2 border-r border-slate-300 w-28">Thứ tự nét</th>}
                {printPracticeBoxes && <th className="p-2 w-48">Ô luyện viết tay</th>}
              </tr>
            </thead>
            <tbody>
              {printableList.map((item, index) => {
                const hiragana = getPrimaryHiragana(item.detail);
                const onReadings = item.detail?.on || [];
                const kunReadings = item.detail?.kun || [];
                const meanings = item.detail?.meanings || [];
                const hanViet = item.detail?.hanViet || '';
                const jlpt = item.detail?.jlpt;

                return (
                  <tr key={item.hex || index} className="border-b border-slate-300">
                    {printStt && (
                      <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-500 align-middle">
                        {index + 1}
                      </td>
                    )}
                    {printKanji && (
                      <td className="p-2 border-r border-slate-300 text-center align-middle">
                        <div className="font-kanji text-2xl font-black text-slate-900 leading-none">
                          {item.kanji}
                        </div>
                        {hiragana && (
                          <div className="text-[10px] text-slate-500 mt-0.5">{hiragana}</div>
                        )}
                        {hanViet && (
                          <div className="text-[10px] font-extrabold text-slate-800 mt-1 uppercase">
                            {hanViet}
                          </div>
                        )}
                        {jlpt && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 text-[9px] font-bold border border-slate-300 rounded text-slate-600">
                            {jlpt}
                          </span>
                        )}
                      </td>
                    )}
                    {printReadings && (
                      <td className="p-2 border-r border-slate-300 align-middle text-slate-700">
                        <div className="space-y-1">
                          {onReadings.length > 0 && (
                            <div>
                              <strong className="text-slate-900">On: </strong>
                              {onReadings.map((r, i) => (
                                <span key={i} className="mr-1">
                                  {r}{' '}
                                  <span className="text-slate-500 text-[10px]">
                                    ({katakanaToHiragana(r)})
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                          {kunReadings.length > 0 && (
                            <div>
                              <strong className="text-slate-900">Kun: </strong>
                              <span className="font-kanji">{kunReadings.join(', ')}</span>
                            </div>
                          )}
                          {meanings.length > 0 && (
                            <div className="font-medium text-slate-900 mt-1">
                              <strong>Nghĩa: </strong> {meanings.join('; ')}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    {printImage && (
                      <td className="p-2 border-r border-slate-300 text-center align-middle bg-white">
                        <div className="w-18 h-18 mx-auto border border-slate-200 rounded p-1 flex items-center justify-center bg-white">
                          <KanjiSvgView
                            svgUrl={item.svgUrl}
                            kanji={item.kanji}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </td>
                    )}
                    {printPracticeBoxes && (
                      <td className="p-2 text-center align-middle">
                        <div className="inline-flex items-center gap-1 justify-center">
                          {/* Watermark trace box */}
                          <div className="relative w-8 h-8 border border-slate-400 flex items-center justify-center bg-white">
                            <span className="font-kanji text-base text-slate-200 font-normal select-none">
                              {item.kanji}
                            </span>
                          </div>
                          {[1, 2, 3].map((b) => (
                            <div
                              key={b}
                              className="relative w-8 h-8 border border-slate-400 flex items-center justify-center bg-white"
                            >
                              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-300 pointer-events-none" />
                              <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-slate-300 pointer-events-none" />
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
