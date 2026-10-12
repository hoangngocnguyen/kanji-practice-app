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
      {/* 1. MOBILE RESPONSIVE CARD VIEW (Displays on screens < 768px, perfect for phones & small tablets) */}
      <div className="md:hidden space-y-3.5">
        {kanjiList.map((item) => {
          const status = copyStatus[item.hex] || 'idle';
          const isCopied = status === 'copied';
          const isCopying = status === 'copying';
          const detail = item.detail;

          return (
            <div
              key={`mobile-${item.hex}`}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5 transition-all hover:border-teal-400 group"
            >
              {/* Header: STT, Kanji & Quick Info */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                    #{item.id}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    U+{item.hex.toUpperCase()}
                  </span>
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
                  title="Click để mở hoạt ảnh nét vẽ"
                >
                  {showGrid && <KanjiGridOverlay />}
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
                  {/* Subtle hint icon */}
                  <div className="absolute bottom-1 right-1 bg-white/90 rounded-md p-0.5 shadow-2xs border border-slate-200 text-teal-700">
                    <PlayCircle className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Text Metadata */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      onClick={() => onInspect(item)}
                      className="font-kanji font-black text-3xl text-slate-900 leading-none cursor-pointer hover:text-teal-700 transition-colors"
                      title="Bấm để xem chi tiết"
                    >
                      {item.kanji}
                    </span>
                    <button
                      onClick={() => speakJapanese(item.kanji)}
                      className="p-1 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    {detail?.hanViet && (
                      <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg truncate">
                        {detail.hanViet}
                      </span>
                    )}
                  </div>

                  {/* Meanings */}
                  {detail?.meanings && detail.meanings.length > 0 && (
                    <p className="text-xs text-slate-700 font-medium line-clamp-2">
                      <strong className="text-slate-900">Nghĩa:</strong> {detail.meanings.join(', ')}
                    </p>
                  )}

                  {/* Readings */}
                  <div className="flex flex-wrap gap-1 text-[11px] pt-0.5">
                    {detail?.on && detail.on.length > 0 && (
                      <span className="text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-medium truncate max-w-full">
                        On: {detail.on.slice(0, 2).join(', ')}
                      </span>
                    )}
                    {detail?.kun && detail.kun.length > 0 && (
                      <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium truncate max-w-full">
                        Kun: {detail.kun.slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>

                  {/* External link */}
                  <div className="pt-0.5">
                    <a
                      href={`https://mazii.net/vi-VN/search/kanji/${encodeURIComponent(item.kanji)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-teal-700 font-medium inline-flex items-center gap-0.5 hover:underline"
                    >
                      Từ điển Mazii <ExternalLink className="w-2.5 h-2.5" />
                    </a>
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
                  <span>Xem hoạt ảnh</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. TABLET & DESKTOP TABLE VIEW (Displays on md: >= 768px screens) */}
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200/90 shadow-xs bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              {/* Cột 1: STT */}
              <th scope="col" className="py-4 px-3 lg:px-4 w-14 lg:w-16 text-center">
                STT
              </th>
              {/* Cột 2: Chữ Kanji & Âm Hán-Việt */}
              <th scope="col" className="py-4 px-3 lg:px-5 w-36 lg:w-40 text-center">
                Chữ Kanji / Hán-Việt
              </th>
              {/* Cột 3: Hình ảnh thứ tự nét vẽ & Ý nghĩa */}
              <th scope="col" className="py-4 px-4 lg:px-6 min-w-[320px]">
                Thứ tự nét vẽ & Thông tin tra cứu
              </th>
              {/* Cột 4: Nút bấm Sao chép ảnh */}
              <th scope="col" className="py-4 px-4 lg:px-6 w-44 lg:w-52 text-center">
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

              return (
                <tr
                  key={item.hex}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  {/* Cột 1: STT */}
                  <td className="py-5 px-3 lg:px-4 text-center text-xs font-mono font-semibold text-slate-400 group-hover:text-teal-700">
                    #{item.id}
                  </td>

                  {/* Cột 2: Chữ Kanji & Hán-Việt */}
                  <td className="py-5 px-3 lg:px-5 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="relative group/kanji flex items-center justify-center">
                        <span
                          onClick={() => onInspect(item)}
                          className="font-kanji font-black text-4xl lg:text-5xl text-slate-800 group-hover:text-teal-700 transition-colors cursor-pointer select-all drop-shadow-2xs leading-none"
                          title={`Click để mở hoạt ảnh nét vẽ và tra nghĩa chữ ${item.kanji}`}
                        >
                          {item.kanji}
                        </span>
                        <button
                          onClick={() => speakJapanese(item.kanji)}
                          className="opacity-0 group-hover/kanji:opacity-100 absolute -right-6 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-teal-700 transition-opacity cursor-pointer"
                          title="Nghe phát âm tiếng Nhật"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Âm Hán-Việt */}
                      {detail?.hanViet && (
                        <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/90 px-2.5 py-0.5 rounded-lg tracking-wide shadow-2xs">
                          {detail.hanViet}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          U+{item.hex.toUpperCase()}
                        </span>
                        {detail?.jlpt && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getJlptBadgeClass(detail.jlpt)}`}>
                            {detail.jlpt}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cột 3: Hình ảnh thứ tự nét vẽ & Tra cứu nghĩa */}
                  <td className="py-5 px-4 lg:px-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-5">
                      {/* KHUNG HÌNH ẢNH */}
                      <div
                        onClick={() => onInspect(item)}
                        className="relative w-28 h-28 lg:w-36 lg:h-36 shrink-0 bg-white rounded-2xl border-2 border-slate-200/90 p-2 shadow-xs hover:shadow-md hover:border-teal-500 transition-all cursor-pointer group/img flex items-center justify-center overflow-hidden"
                        title={`Click để xem Hoạt ảnh nét vẽ (Animation) và tra cứu chi tiết`}
                      >
                        {/* Lưới ô chữ điền nếu bật Kèm lưới (+ Grid) */}
                        {showGrid && <KanjiGridOverlay />}

                        <img
                          src={item.svgUrl}
                          alt={`Thứ tự nét viết chữ ${item.kanji}`}
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
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity rounded-2xl backdrop-blur-2xs">
                          <span className="bg-white/95 text-slate-800 font-bold text-xs px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 border border-slate-200">
                            <PlayCircle className="w-3.5 h-3.5 text-teal-600" /> Xem hoạt ảnh
                          </span>
                        </div>
                      </div>

                      {/* Metadata & Ý nghĩa tiếng Việt */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-800">
                            {item.kanji} • {detail?.hanViet || 'Nét vẽ'}
                          </span>
                          {detail?.strokeCount && (
                            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                              {detail.strokeCount} nét
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-mono px-2 py-0.5 rounded font-medium">
                            {item.hex}.svg
                          </span>
                        </div>

                        {/* Ý nghĩa tiếng Việt */}
                        {detail?.meanings && detail.meanings.length > 0 && (
                          <p className="text-xs font-semibold text-slate-700 leading-snug">
                            Nghĩa: <span className="text-slate-900 font-bold">{detail.meanings.join(', ')}</span>
                          </p>
                        )}

                        {/* Âm On & Kun */}
                        {(detail?.on?.length || detail?.kun?.length) ? (
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            {detail?.on && detail.on.length > 0 && (
                              <span className="text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-medium">
                                On: {detail.on.join(', ')}
                              </span>
                            )}
                            {detail?.kun && detail.kun.length > 0 && (
                              <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                                Kun: {detail.kun.join(', ')}
                              </span>
                            )}
                          </div>
                        ) : null}

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={() => onInspect(item)}
                            className="text-xs text-teal-800 hover:text-teal-950 font-semibold inline-flex items-center gap-1.5 cursor-pointer bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-xl transition-colors border border-teal-200/80"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-teal-600" /> Hoạt ảnh & Tra nghĩa
                          </button>

                          <button
                            onClick={() => speakJapanese(item.kanji)}
                            className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1 cursor-pointer"
                            title="Nghe phát âm"
                          >
                            <Volume2 className="w-3.5 h-3.5" /> Nghe đọc
                          </button>

                          <a
                            href={`https://mazii.net/vi-VN/search/kanji/${encodeURIComponent(item.kanji)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-500 hover:text-teal-700 font-medium inline-flex items-center gap-0.5 hover:underline"
                          >
                            Mazii <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Cột 4: Nút bấm Sao chép ảnh */}
                  <td className="py-5 px-4 lg:px-6 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <button
                        onClick={() => onCopyImage(item)}
                        disabled={isCopying}
                        className={`w-full sm:w-36 lg:w-40 inline-flex items-center justify-center gap-2 px-3 lg:px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer active:scale-95 shadow-xs min-h-[38px] ${
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

                      {/* Nút tải PNG phụ */}
                      <button
                        onClick={() => onDownloadPng(item)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Tải ảnh PNG nền trắng về máy tính"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải PNG về máy</span>
                      </button>
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
