import React, { useState } from 'react';
import { Printer, X, CheckSquare, Square } from 'lucide-react';
import { KanjiItem } from '../types/kanji';
import { getPrimaryHiragana, katakanaToHiragana } from '../utils/kanji';
import { KanjiSvgView } from './KanjiSvgView';

interface KanjiPrintModalProps {
  kanjiList: KanjiItem[];
  isOpen: boolean;
  onClose: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const KanjiPrintModal: React.FC<KanjiPrintModalProps> = ({
  kanjiList,
  isOpen,
  onClose,
  showToast,
}) => {
  // Column selection states for printing
  const [printStt, setPrintStt] = useState<boolean>(true);
  const [printKanji, setPrintKanji] = useState<boolean>(true);
  const [printReadings, setPrintReadings] = useState<boolean>(true);
  const [printImage, setPrintImage] = useState<boolean>(true);
  const [printPracticeBoxes, setPrintPracticeBoxes] = useState<boolean>(true);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (kanjiList.length === 0) {
      showToast('Danh sách Kanji đang trống!', 'error');
      return;
    }
    if (!printStt && !printKanji && !printReadings && !printImage && !printPracticeBoxes) {
      showToast('Vui lòng chọn ít nhất một cột để in!', 'error');
      return;
    }

    showToast('Đang mở hộp thoại in tài liệu...', 'info');
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Tùy Chọn & In Phiếu Luyện Viết Kanji</h2>
              <p className="text-xs text-teal-100">
                Tùy chỉnh các cột in ấn • Chuẩn định dạng giấy A4 Genkouyoushi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column Selection Toggles */}
        <div className="px-6 py-3.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="font-bold text-slate-700">Chọn các cột in:</div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setPrintStt(!printStt)}
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              {printStt ? <CheckSquare className="w-4 h-4 text-teal-700" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>STT</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintKanji(!printKanji)}
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              {printKanji ? <CheckSquare className="w-4 h-4 text-teal-700" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>Chữ Hán & Hán-Việt</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintReadings(!printReadings)}
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              {printReadings ? <CheckSquare className="w-4 h-4 text-teal-700" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>Âm đọc & Ý nghĩa</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintImage(!printImage)}
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              {printImage ? <CheckSquare className="w-4 h-4 text-teal-700" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>Ảnh Nét Vẽ</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintPracticeBoxes(!printPracticeBoxes)}
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              {printPracticeBoxes ? <CheckSquare className="w-4 h-4 text-teal-700" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>Ô Luyện Viết Tay</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Action summary */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            Tổng số: <strong className="text-slate-900 font-bold">{kanjiList.length}</strong> chữ Kanji
          </div>
          <button
            onClick={handlePrint}
            disabled={kanjiList.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            🖨️ Tiến Hành In Hoặc Lưu PDF
          </button>
        </div>

        {/* Scrollable Preview Sheet (This is also what prints cleanly via print styles) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60 printable-sheet-container">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden p-6 printable-sheet-content">
            {/* Header for print preview */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                  Bảng Tra Cứu & Phiếu Luyện Viết Kanji (Kanji Practice Sheet)
                </h1>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Thứ tự nét viết chuẩn • Furigana • Âm Hán-Việt & Ô tập viết tay
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <div>Ngày in: <strong className="text-slate-900">{currentDate}</strong></div>
                <div>Tổng số: <strong className="text-slate-900">{kanjiList.length}</strong> chữ</div>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400 text-center">
                  {printStt && <th className="p-2.5 border-r border-slate-300 w-12">STT</th>}
                  {printKanji && <th className="p-2.5 border-r border-slate-300 w-32">Chữ Hán & Hán-Việt</th>}
                  {printReadings && <th className="p-2.5 border-r border-slate-300 text-left">Âm đọc & Ý nghĩa</th>}
                  {printImage && <th className="p-2.5 border-r border-slate-300 w-28">Thứ tự nét</th>}
                  {printPracticeBoxes && <th className="p-2.5 w-48">Ô luyện viết tay</th>}
                </tr>
              </thead>
              <tbody>
                {kanjiList.map((item, index) => {
                  const hiragana = getPrimaryHiragana(item.detail);
                  const onReadings = item.detail?.on || [];
                  const kunReadings = item.detail?.kun || [];
                  const meanings = item.detail?.meanings || [];
                  const hanViet = item.detail?.hanViet || '';
                  const jlpt = item.detail?.jlpt;

                  return (
                    <tr key={item.hex || index} className="border-b border-slate-300">
                      {printStt && (
                        <td className="p-2.5 border-r border-slate-300 text-center font-bold text-slate-500 align-middle">
                          {index + 1}
                        </td>
                      )}
                      {printKanji && (
                        <td className="p-2.5 border-r border-slate-300 text-center align-middle">
                          <div className="font-kanji text-3xl font-black text-slate-900 leading-none">
                            {item.kanji}
                          </div>
                          {hiragana && <div className="text-[10px] text-slate-500 mt-0.5">{hiragana}</div>}
                          {hanViet && (
                            <div className="text-[11px] font-extrabold text-slate-800 mt-1 uppercase">
                              {hanViet}
                            </div>
                          )}
                          {jlpt && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold border border-slate-300 rounded text-slate-600">
                              {jlpt}
                            </span>
                          )}
                        </td>
                      )}
                      {printReadings && (
                        <td className="p-2.5 border-r border-slate-300 align-middle text-slate-700">
                          <div className="space-y-1">
                            {onReadings.length > 0 && (
                              <div>
                                <strong className="text-slate-900">On: </strong>
                                {onReadings.map((r, i) => (
                                  <span key={i} className="mr-1">
                                    {r} <span className="text-slate-500 text-[10px]">({katakanaToHiragana(r)})</span>
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
                        <td className="p-2.5 border-r border-slate-300 text-center align-middle bg-white">
                          <div className="w-20 h-20 mx-auto border border-slate-200 rounded p-1 flex items-center justify-center bg-white">
                            <KanjiSvgView
                              svgUrl={item.svgUrl}
                              kanji={item.kanji}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </td>
                      )}
                      {printPracticeBoxes && (
                        <td className="p-2.5 text-center align-middle">
                          <div className="inline-flex items-center gap-1 justify-center">
                            {/* Watermark trace box */}
                            <div className="relative w-9 h-9 border border-slate-400 flex items-center justify-center bg-white">
                              <span className="font-kanji text-lg text-slate-200 font-normal select-none">
                                {item.kanji}
                              </span>
                            </div>
                            {[1, 2, 3].map((b) => (
                              <div
                                key={b}
                                className="relative w-9 h-9 border border-slate-400 flex items-center justify-center bg-white"
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
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Hệ thống in ấn bảng nét Kanji chuẩn</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
