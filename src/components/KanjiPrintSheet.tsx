import React from 'react';
import { KanjiItem } from '../types/kanji';
import { getPrimaryHiragana, katakanaToHiragana } from '../utils/kanji';
import { KanjiSvgView } from './KanjiSvgView';

interface KanjiPrintSheetProps {
  kanjiList: KanjiItem[];
}

export const KanjiPrintSheet: React.FC<KanjiPrintSheetProps> = ({ kanjiList }) => {
  const currentDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (kanjiList.length === 0) return null;

  return (
    <div className="print-only hidden print:block w-full text-slate-900 bg-white font-sans text-xs">
      {/* Print Document Header */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
            Bảng Tra Cứu & Phiếu Luyện Viết Nét Chữ Hán (Kanji Practice Sheet)
          </h1>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Thứ tự nét viết chuẩn Nhật Bản • Phiên âm Hiragana (Furigana) • Âm Hán-Việt & Ô tập viết tay
          </p>
        </div>
        <div className="text-right text-[11px] text-slate-600">
          <div>Ngày in: <strong className="text-slate-900">{currentDate}</strong></div>
          <div>Tổng số: <strong className="text-slate-900">{kanjiList.length}</strong> chữ Kanji</div>
        </div>
      </div>

      {/* Printable Table */}
      <table className="w-full border-collapse border border-slate-400">
        <thead>
          <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold border-b border-slate-400">
            <th className="p-2 border-r border-slate-300 w-10 text-center">STT</th>
            <th className="p-2 border-r border-slate-300 w-24 text-center">Chữ Kanji</th>
            <th className="p-2 border-r border-slate-300 w-28 text-center">Thứ tự nét</th>
            <th className="p-2 border-r border-slate-300 w-44 text-left">Âm On / Kun (Hiragana)</th>
            <th className="p-2 border-r border-slate-300 text-left">Ý nghĩa tiếng Việt</th>
            <th className="p-2 w-48 text-center">Ô luyện viết tay (Genkouyoushi)</th>
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
            const strokeCount = item.detail?.strokeCount;

            return (
              <tr
                key={item.hex || index}
                className="border-b border-slate-300 break-inside-avoid print:break-inside-avoid page-break-inside-avoid"
                style={{ pageBreakInside: 'avoid' }}
              >
                {/* 1. STT */}
                <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-500">
                  {index + 1}
                </td>

                {/* 2. Kanji with Furigana Ruby + Hán Việt */}
                <td className="p-2 border-r border-slate-300 text-center align-middle">
                  <div className="flex flex-col items-center justify-center">
                    {/* Ruby text with Hiragana on top */}
                    <ruby className="font-kanji text-3xl font-black text-slate-950 leading-none">
                      {item.kanji}
                      {hiragana && (
                        <rt className="text-[10px] font-medium text-slate-700 tracking-normal select-none">
                          {hiragana}
                        </rt>
                      )}
                    </ruby>
                    {/* Hán Việt */}
                    {hanViet && (
                      <span className="font-extrabold text-[11px] text-slate-900 mt-1 uppercase tracking-wide">
                        {hanViet}
                      </span>
                    )}
                    {/* JLPT & Stroke badge */}
                    <div className="flex items-center gap-1 mt-0.5 text-[9px] text-slate-500">
                      {jlpt && <span className="font-bold border border-slate-300 px-1 rounded">{jlpt}</span>}
                      {strokeCount && <span>{strokeCount} nét</span>}
                    </div>
                  </div>
                </td>

                {/* 3. Stroke order diagram SVG */}
                <td className="p-2 border-r border-slate-300 text-center align-middle">
                  <div className="w-20 h-20 mx-auto border border-slate-200 rounded p-1 flex items-center justify-center bg-white">
                    <KanjiSvgView
                      svgUrl={item.svgUrl}
                      kanji={item.kanji}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </td>

                {/* 4. On / Kun Readings with Hiragana */}
                <td className="p-2 border-r border-slate-300 align-middle text-[11px]">
                  <div className="space-y-1">
                    {onReadings.length > 0 && (
                      <div>
                        <strong className="text-slate-800 font-bold">On: </strong>
                        <span className="text-slate-700 font-medium">
                          {onReadings.map((r, i) => (
                            <span key={i} className="mr-1.5">
                              {r} <span className="text-slate-500 text-[10px]">({katakanaToHiragana(r)})</span>
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                    {kunReadings.length > 0 && (
                      <div>
                        <strong className="text-slate-800 font-bold">Kun: </strong>
                        <span className="text-slate-700 font-medium font-kanji">
                          {kunReadings.join(', ')}
                        </span>
                      </div>
                    )}
                    {onReadings.length === 0 && kunReadings.length === 0 && (
                      <span className="text-slate-400 italic">Đang cập nhật âm đọc</span>
                    )}
                  </div>
                </td>

                {/* 5. Meaning */}
                <td className="p-2 border-r border-slate-300 align-middle text-[11px] text-slate-800">
                  {meanings.length > 0 ? (
                    <div className="font-medium line-clamp-3 leading-relaxed">
                      {meanings.join('; ')}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Tra cứu chi tiết nét vẽ</span>
                  )}
                </td>

                {/* 6. Practice Boxes (Genkouyoushi) */}
                <td className="p-2 align-middle text-center">
                  <div className="inline-flex items-center gap-1.5 justify-center">
                    {/* Box 1: Watermark faint kanji for tracing */}
                    <div className="relative w-10 h-10 border border-slate-400 flex items-center justify-center bg-white">
                      {/* Grid cross lines */}
                      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200 pointer-events-none" />
                      <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-slate-200 pointer-events-none" />
                      <span className="font-kanji text-xl text-slate-200 font-normal select-none">
                        {item.kanji}
                      </span>
                    </div>

                    {/* Box 2, 3, 4: Blank practice boxes with cross + diagonal dashes */}
                    {[1, 2, 3].map((b) => (
                      <div
                        key={b}
                        className="relative w-10 h-10 border border-slate-400 flex items-center justify-center bg-white"
                      >
                        {/* Cross dashes */}
                        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-300 pointer-events-none" />
                        <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-slate-300 pointer-events-none" />
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer in print */}
      <div className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
        <span>Luyện Kanji Worksheet • Luyện viết chữ đẹp mỗi ngày</span>
        <span>Dữ liệu nét vẽ bản quyền KanjiVG Project (CC BY-SA 3.0)</span>
      </div>
    </div>
  );
};
