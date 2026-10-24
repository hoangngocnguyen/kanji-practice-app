import React from 'react';
import {
  Copy,
  CheckCheck,
  RefreshCw,
  Download,
  ExternalLink,
  Volume2,
  PlayCircle
} from 'lucide-react';
import { KanjiItem, CopyStatus } from '../types/kanji';
import { speakJapanese } from '../utils/speech';
import { getJlptBadgeClass } from '../utils/colorUtils';
import { getPrimaryHiragana } from '../utils/kanji';
import { KanjiGridOverlay } from './KanjiGridOverlay';

interface KanjiTableProps {
  kanjiList: KanjiItem[];
  copyStatus: Record<string, CopyStatus>;
  showGrid?: boolean;
  onCopyImage: (item: KanjiItem) => void;
  onDownloadPng: (item: KanjiItem) => void;
  onInspect: (item: KanjiItem) => void;
}

export const KanjiTable: React.FC<KanjiTableProps> = ({
  kanjiList,
  copyStatus,
  showGrid = false,
  onCopyImage,
  onDownloadPng,
  onInspect,
}) => {
  return (
    <div className="space-y-4">
      {/* 1. MOBILE RESPONSIVE CARD VIEW (< 768px screens) */}
      <div className="md:hidden space-y-3.5">
        {kanjiList.map((item) => {
          const status = copyStatus[item.hex] || 'idle';
          const isCopied = status === 'copied';
          const isCopying = status === 'copying';
          const detail = item.detail;

          const hasOn = detail?.on && detail.on.length > 0;
          const hasKun = detail?.kun && detail.kun.length > 0;
          const hasMeanings = detail?.meanings && detail.meanings.length > 0;

          return (
            <div
              key={`mobile-${item.hex}`}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-3 transition-all hover:border-teal-400 group"
            >
              {/* Header: STT, Hán-Việt & JLPT */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                    #{item.id}
                  </span>
                  {detail?.hanViet && (
                    <span className="text-xs font-bold text-teal-900 bg-teal-50/80 border border-teal-200/90 px-2 py-0.5 rounded-lg">
                      {detail.hanViet}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {detail?.jlpt && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getJlptBadgeClass(detail.jlpt)}`}>
                      {detail.jlpt}
                    </span>
                  )}
                  {detail?.strokeCount && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                      {detail.strokeCount} nét
                    </span>
                  )}
                </div>
              </div>

              {/* Main Content: Kanji Graphic + Stroke Image + Details */}
              <div className="flex items-start gap-3.5">
                {/* Kanji Image Preview Box */}
                <div
                  onClick={() => onInspect(item)}
                  className="relative w-28 h-28 shrink-0 bg-white rounded-2xl border-2 border-slate-200/90 p-1.5 shadow-xs hover:border-teal-500 transition-all cursor-pointer flex items-center justify-center overflow-hidden"
                  title="Click để mở hoạt ảnh vẽ từng nét"
                >
                  {showGrid && <KanjiGridOverlay dashed={true} type="mi" />}
                  <img
                    src={item.svgUrl}
                    alt={`Nét viết ${item.kanji}`}
                    loading="lazy"
                    className="w-full h-full object-contain filter contrast-125 relative z-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                      const parent = (e.target as HTMLElement).parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = 'text-center p-1 text-[10px] text-slate-400';
                        fallback.innerText = 'Chưa có ảnh';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                  <div className="absolute bottom-1 right-1 bg-white/90 rounded-md p-0.5 shadow-2xs border border-slate-200 text-teal-700">
                    <PlayCircle className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Text Metadata */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ruby
                      onClick={() => onInspect(item)}
                      className="font-kanji font-black text-3xl text-slate-900 leading-none cursor-pointer hover:text-teal-700 transition-colors inline-flex flex-col items-start"
                      title="Bấm để xem hoạt ảnh nét vẽ"
                    >
                      {detail && getPrimaryHiragana(detail) && (
                        <rt className="text-[11px] font-semibold text-teal-700 select-none pb-0.5 tracking-normal">
                          {getPrimaryHiragana(detail)}
                        </rt>
                      )}
                      <span>{item.kanji}</span>
                    </ruby>
                    <button
                      onClick={() => speakJapanese(item.kanji)}
                      className="p-1 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <a
                      href={`https://mazii.net/vi-VN/search/kanji/${encodeURIComponent(item.kanji)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-teal-700 font-medium inline-flex items-center gap-0.5 ml-auto hover:underline"
                    >
                      Mazii <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  {/* Meanings */}
                  {hasMeanings && (
                    <p className="text-xs text-slate-700 font-medium line-clamp-2">
                      <strong className="text-slate-900">Nghĩa:</strong> {detail.meanings.join(', ')}
                    </p>
                  )}

                  {/* Readings: On & Kun */}
                  <div className="flex flex-col gap-1 text-[11px] pt-0.5">
                    {hasOn ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="px-1.5 py-0.2 rounded font-bold text-[10px] text-blue-800 bg-blue-50 border border-blue-200 shrink-0">
                          On
                        </span>
                        <span className="text-slate-800 font-mono font-medium truncate">
                          {detail.on.join(', ')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100">On</span>
                        <span className="italic text-[10px]">Đang nạp âm On...</span>
                      </div>
                    )}

                    {hasKun ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="px-1.5 py-0.2 rounded font-bold text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 shrink-0">
                          Kun
                        </span>
                        <span className="text-slate-800 font-mono font-medium truncate">
                          {detail.kun.join(', ')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100">Kun</span>
                        <span className="italic text-[10px]">Đang nạp âm Kun...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => onCopyImage(item)}
                  disabled={isCopying}
                  className={`py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs min-h-[38px] ${
                    isCopied
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                      : isCopying
                      ? 'bg-teal-100 text-teal-900 cursor-wait'
                      : 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-900/15'
                  }`}
                  title="Sao chép ảnh nét vẽ vào Clipboard"
                >
                  {isCopied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Đã chép!</span>
                    </>
                  ) : isCopying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-200" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép ảnh</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onInspect(item)}
                  className="py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200/80 min-h-[38px]"
                  title="Xem hoạt ảnh vẽ từng nét"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-teal-600" />
                  <span>Xem nét vẽ</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. TABLET & DESKTOP TABLE VIEW (md: >= 768px screens) */}
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/90 shadow-xs bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              {/* Cột 1: STT & JLPT */}
              <th scope="col" className="py-3.5 px-3 lg:px-4 w-16 text-center">
                STT
              </th>
              {/* Cột 2: Chữ Kanji & Âm Hán-Việt */}
              <th scope="col" className="py-3.5 px-3 lg:px-5 w-40 text-center">
                Chữ Kanji / Hán-Việt
              </th>
              {/* Cột 3: Hình ảnh thứ tự nét vẽ & Ý nghĩa */}
              <th scope="col" className="py-3.5 px-4 lg:px-6 min-w-[320px]">
                Nét vẽ & Âm đọc / Nghĩa
              </th>
              {/* Cột 4: Nút bấm Thao tác */}
              <th scope="col" className="py-3.5 px-4 lg:px-6 w-44 lg:w-48 text-center">
                Thao tác Clipboard
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {kanjiList.map((item) => {
              const status = copyStatus[item.hex] || 'idle';
              const isCopied = status === 'copied';
              const isCopying = status === 'copying';
              const detail = item.detail;

              const hasOn = detail?.on && detail.on.length > 0;
              const hasKun = detail?.kun && detail.kun.length > 0;
              const hasMeanings = detail?.meanings && detail.meanings.length > 0;

              return (
                <tr
                  key={item.hex}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  {/* Cột 1: STT & JLPT */}
                  <td className="py-4 px-3 lg:px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-teal-700">
                        #{item.id}
                      </span>
                      {detail?.jlpt && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${getJlptBadgeClass(detail.jlpt)}`}>
                          {detail.jlpt}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Cột 2: Chữ Kanji & Hán-Việt */}
                  <td className="py-4 px-3 lg:px-5 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="relative group/kanji flex items-center justify-center">
                        <ruby
                          onClick={() => onInspect(item)}
                          className="font-kanji font-black text-4xl lg:text-5xl text-slate-800 group-hover:text-teal-700 transition-colors cursor-pointer select-all drop-shadow-2xs leading-none inline-flex flex-col items-center"
                          title={`Click để mở hoạt ảnh nét vẽ chữ ${item.kanji}`}
                        >
                          {detail && getPrimaryHiragana(detail) && (
                            <rt className="text-xs font-semibold text-teal-700 select-none pb-0.5 tracking-normal font-sans">
                              {getPrimaryHiragana(detail)}
                            </rt>
                          )}
                          <span>{item.kanji}</span>
                        </ruby>
                        <button
                          onClick={() => speakJapanese(item.kanji)}
                          className="opacity-0 group-hover/kanji:opacity-100 absolute -right-6 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-teal-700 transition-opacity cursor-pointer"
                          title="Nghe phát âm tiếng Nhật"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Âm Hán-Việt nổi bật */}
                      {detail?.hanViet && (
                        <span className="text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg tracking-wide shadow-2xs">
                          {detail.hanViet}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://mazii.net/vi-VN/search/kanji/${encodeURIComponent(item.kanji)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-slate-400 hover:text-teal-700 font-medium inline-flex items-center gap-0.5 hover:underline"
                        >
                          Mazii <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </td>

                  {/* Cột 3: Hình ảnh nét vẽ & Âm đọc On/Kun, Nghĩa */}
                  <td className="py-4 px-4 lg:px-6">
                    <div className="flex items-center gap-4 lg:gap-5">
                      {/* KHUNG HÌNH ẢNH NÉT VẼ */}
                      <div
                        onClick={() => onInspect(item)}
                        className="relative w-24 h-24 lg:w-28 lg:h-28 shrink-0 bg-white rounded-2xl border-2 border-slate-200/90 p-1.5 shadow-xs hover:shadow-md hover:border-teal-500 transition-all cursor-pointer group/img flex items-center justify-center overflow-hidden"
                        title="Click để xem hoạt ảnh vẽ nét chi tiết"
                      >
                        {/* Lưới ô chữ nét đứt mảnh tinh tế */}
                        {showGrid && <KanjiGridOverlay dashed={true} type="mi" />}

                        <img
                          src={item.svgUrl}
                          alt={`Thứ tự nét chữ ${item.kanji}`}
                          loading="lazy"
                          className="w-full h-full object-contain filter contrast-125 transform group-hover/img:scale-105 transition-transform relative z-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const parent = (e.target as HTMLElement).parentElement;
                            if (parent) {
                              const fallback = document.createElement('div');
                              fallback.className = 'text-center p-2 text-xs text-slate-400 font-medium';
                              fallback.innerText = 'Chưa có ảnh nét vẽ';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity rounded-2xl backdrop-blur-2xs">
                          <span className="bg-white/95 text-slate-800 font-bold text-xs px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1 border border-slate-200">
                            <PlayCircle className="w-3.5 h-3.5 text-teal-600" /> Xem nét
                          </span>
                        </div>
                      </div>

                      {/* Chi tiết: Âm On, Âm Kun, Nghĩa tiếng Việt & Số nét */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Hàng 1: Số nét & Bộ thủ */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {detail?.strokeCount ? (
                            <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                              {detail.strokeCount} nét
                            </span>
                          ) : null}
                          {detail?.radical && (
                            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                              Bộ: {detail.radical}
                            </span>
                          )}
                        </div>

                        {/* Hàng 2: Âm On & Âm Kun chuẩn Katakana / Hiragana */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {hasOn ? (
                            <div className="inline-flex items-center gap-1 bg-blue-50/70 border border-blue-200 px-2 py-0.5 rounded-lg">
                              <span className="font-bold text-[10px] text-blue-800">On:</span>
                              <span className="text-blue-900 font-mono font-medium">
                                {detail.on.join(', ')}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg text-slate-400 text-xs">
                              <span className="font-bold text-[10px]">On:</span>
                              <span className="italic text-[11px]">Đang nạp...</span>
                            </div>
                          )}

                          {hasKun ? (
                            <div className="inline-flex items-center gap-1 bg-emerald-50/70 border border-emerald-200 px-2 py-0.5 rounded-lg">
                              <span className="font-bold text-[10px] text-emerald-800">Kun:</span>
                              <span className="text-emerald-900 font-mono font-medium">
                                {detail.kun.join(', ')}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg text-slate-400 text-xs">
                              <span className="font-bold text-[10px]">Kun:</span>
                              <span className="italic text-[11px]">Đang nạp...</span>
                            </div>
                          )}
                        </div>

                        {/* Hàng 3: Nghĩa tiếng Việt */}
                        {hasMeanings && (
                          <p className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2">
                            Nghĩa: <span className="text-slate-900 font-bold">{detail.meanings.join(', ')}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cột 4: Thao tác Sao chép ảnh & Xem hoạt ảnh */}
                  <td className="py-4 px-4 lg:px-6 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <button
                        onClick={() => onCopyImage(item)}
                        disabled={isCopying}
                        className={`w-full sm:w-36 lg:w-40 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer active:scale-95 shadow-xs min-h-[36px] ${
                          isCopied
                            ? 'bg-emerald-600 text-white shadow-emerald-500/20 ring-2 ring-emerald-300'
                            : isCopying
                            ? 'bg-teal-100 text-teal-900 cursor-wait'
                            : 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-900/15 hover:shadow-sm'
                        }`}
                        title="Vẽ ảnh lên Canvas nền trắng (#FFFFFF) và sao chép trực tiếp vào Clipboard"
                      >
                        {isCopied ? (
                          <>
                            <CheckCheck className="w-4 h-4 text-emerald-200" />
                            <span>Đã sao chép!</span>
                          </>
                        ) : isCopying ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-teal-200" />
                            <span>Đang xuất...</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Sao chép ảnh</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5 w-full justify-center">
                        <button
                          onClick={() => onInspect(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-lg transition-colors cursor-pointer font-medium"
                          title="Xem hoạt ảnh từng nét vẽ"
                        >
                          <PlayCircle className="w-3.5 h-3.5 text-teal-600" />
                          <span>Xem nét</span>
                        </button>

                        <button
                          onClick={() => onDownloadPng(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Tải ảnh PNG nền trắng về máy tính"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải ảnh</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
