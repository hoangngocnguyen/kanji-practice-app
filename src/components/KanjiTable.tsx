import React from 'react';
import {
  Copy,
  CheckCheck,
  RefreshCw,
  Download,
  Eye,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import { KanjiItem, CopyStatus } from '../types/kanji';

interface KanjiTableProps {
  kanjiList: KanjiItem[];
  copyStatus: Record<string, CopyStatus>;
  onCopyImage: (item: KanjiItem) => void;
  onDownloadPng: (item: KanjiItem) => void;
  onInspect: (item: KanjiItem) => void;
}

export const KanjiTable: React.FC<KanjiTableProps> = ({
  kanjiList,
  copyStatus,
  onCopyImage,
  onDownloadPng,
  onInspect,
}) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-sm bg-white">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
            {/* Cột 1: STT */}
            <th scope="col" className="py-4 px-4 w-16 text-center">
              STT
            </th>
            {/* Cột 2: Chữ Kanji */}
            <th scope="col" className="py-4 px-6 w-36 text-center">
              Chữ Kanji
            </th>
            {/* Cột 3: Hình ảnh thứ tự nét vẽ */}
            <th scope="col" className="py-4 px-6 min-w-[280px]">
              Thứ tự nét vẽ (KanjiVG SVG)
            </th>
            {/* Cột 4: Nút bấm Copy ảnh */}
            <th scope="col" className="py-4 px-6 w-56 text-center">
              Thao tác Clipboard
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {kanjiList.map((item) => {
            const status = copyStatus[item.hex] || 'idle';
            const isCopied = status === 'copied';
            const isCopying = status === 'copying';

            return (
              <tr
                key={item.hex}
                className="hover:bg-blue-50/30 transition-colors group"
              >
                {/* Cột 1: STT (#1, #2, ...) */}
                <td className="py-5 px-4 text-center text-xs font-mono font-semibold text-slate-400 group-hover:text-blue-600">
                  #{item.id}
                </td>

                {/* Cột 2: Chữ Kanji (Font chữ to, đậm, căn giữa) */}
                <td className="py-5 px-6 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <span
                      onClick={() => onInspect(item)}
                      className="font-kanji font-black text-5xl text-slate-800 group-hover:text-blue-600 transition-colors cursor-pointer select-all drop-shadow-2xs leading-none"
                      title={`Xem chi tiết chữ ${item.kanji}`}
                    >
                      {item.kanji}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 font-medium mt-2 bg-slate-100 px-2 py-0.5 rounded-md">
                      U+{item.hex.toUpperCase()}
                    </span>
                  </div>
                </td>

                {/* Cột 3: Hình ảnh thứ tự nét vẽ (Ảnh lớn, rõ nét 140x140px) */}
                <td className="py-5 px-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {/* KHUNG HÌNH ẢNH TO VÀ RÕ RÀNG */}
                    <div
                      onClick={() => onInspect(item)}
                      className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 bg-white rounded-2xl border-2 border-slate-200/90 p-2 shadow-xs hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer group/img flex items-center justify-center overflow-hidden"
                      title={`Click để phóng to chữ ${item.kanji} và luyện viết`}
                    >
                      <img
                        src={item.svgUrl}
                        alt={`Thứ tự nét viết chữ ${item.kanji}`}
                        loading="lazy"
                        className="w-full h-full object-contain filter contrast-125 transform group-hover/img:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'text-center p-2 text-xs text-amber-600 font-medium';
                            fallback.innerText = 'Chưa có ảnh nét vẽ';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                      {/* Hover Overlay Hint */}
                      <div className="absolute inset-0 bg-blue-900/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity rounded-2xl backdrop-blur-2xs">
                        <span className="bg-white/95 text-blue-700 font-semibold text-xs px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5" /> Phóng to
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Quick Links */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {item.kanji} • Thứ tự nét vẽ
                        </span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-mono px-2 py-0.5 rounded font-medium">
                          {item.hex}.svg
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                        Các nét được đánh số thứ tự 1, 2, 3... theo đúng quy tắc thư pháp bút thuận Nhật Bản.
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <a
                          href={`https://jisho.org/search/${encodeURIComponent(item.kanji)}%20%23kanji`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 hover:underline"
                        >
                          Tra Jisho.org <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-slate-300">•</span>
                        <button
                          onClick={() => onInspect(item)}
                          className="text-xs text-slate-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Luyện viết thử
                        </button>
                      </div>
                      <div className="pt-0.5 text-[11px] text-slate-400">
                        Nguồn:{' '}
                        <a
                          href="https://kanjivg.tagaini.net/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 underline"
                        >
                          KanjiVG
                        </a>{' '}
                        © Ulrich Apel •{' '}
                        <a
                          href="https://creativecommons.org/licenses/by-sa/3.0/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 underline font-medium"
                        >
                          CC BY-SA 3.0
                        </a>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Cột 4: Nút bấm "📋 Copy ảnh" */}
                <td className="py-5 px-6 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <button
                      onClick={() => onCopyImage(item)}
                      disabled={isCopying}
                      className={`w-full sm:w-44 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs transition-all cursor-pointer active:scale-95 shadow-sm ${
                        isCopied
                          ? 'bg-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-300'
                          : isCopying
                          ? 'bg-blue-100 text-blue-800 cursor-wait'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 hover:shadow-md'
                      }`}
                      title="Vẽ ảnh lên Canvas nền trắng (#FFFFFF) và sao chép trực tiếp vào Clipboard"
                    >
                      {isCopied ? (
                        <>
                          <CheckCheck className="w-4 h-4 text-emerald-200 animate-pulse" />
                          <span>✨ Đã copy ảnh!</span>
                        </>
                      ) : isCopying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Đang xuất PNG...</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>📋 Copy ảnh</span>
                        </>
                      )}
                    </button>

                    {/* Nút tải PNG phụ */}
                    <button
                      onClick={() => onDownloadPng(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
  );
};
