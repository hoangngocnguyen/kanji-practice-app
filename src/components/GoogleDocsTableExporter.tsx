import React, { useState } from 'react';
import { Copy, Check, Download, X, Table, CheckSquare, Square } from 'lucide-react';
import { KanjiItem } from '../types/kanji';
import { convertSvgToPngBlob, getPrimaryHiragana, katakanaToHiragana } from '../utils/kanji';
import { KanjiSvgView } from './KanjiSvgView';

interface GoogleDocsTableExporterProps {
  kanjiList: KanjiItem[];
  isOpen: boolean;
  onClose: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const GoogleDocsTableExporter: React.FC<GoogleDocsTableExporterProps> = ({
  kanjiList,
  isOpen,
  onClose,
  showToast,
}) => {
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Column selection states
  const [includeStt, setIncludeStt] = useState<boolean>(false);
  const [includeKanji, setIncludeKanji] = useState<boolean>(true);
  const [includeReadings, setIncludeReadings] = useState<boolean>(false);
  const [includeImage, setIncludeImage] = useState<boolean>(true);

  if (!isOpen) return null;

  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const generateTableHtmlAndImages = async (): Promise<{ html: string; text: string }> => {
    let htmlRows = '';
    let plainTextLines = '';

    for (let i = 0; i < kanjiList.length; i++) {
      const item = kanjiList[i];
      const hiragana = getPrimaryHiragana(item.detail);
      const onReadings = item.detail?.on || [];
      const kunReadings = item.detail?.kun || [];
      const meanings = item.detail?.meanings || [];
      const hanViet = item.detail?.hanViet || '';
      const jlpt = item.detail?.jlpt;
      const strokeCount = item.detail?.strokeCount;

      let imgSrc = item.svgUrl;
      if (includeImage) {
        try {
          const pngBlob = await convertSvgToPngBlob(item.svgUrl, false);
          imgSrc = await blobToDataUrl(pngBlob);
        } catch (e) {
          console.warn(`Không thể chuyển đổi SVG sang PNG cho chữ ${item.kanji}:`, e);
        }
      }

      const onStr = onReadings.join(', ');
      const kunStr = kunReadings.join(', ');
      const meaningStr = meanings.join('; ');

      plainTextLines += `[${i + 1}] ${item.kanji} (${hanViet}) - ${meaningStr}\n`;

      let rowCells = '';

      if (includeStt) {
        rowCells += `
          <td style="padding: 12px; text-align: center; font-weight: bold; color: #475569; width: 40px; vertical-align: middle; border-right: 1px solid #cbd5e1;">
            ${i + 1}
          </td>
        `;
      }

      if (includeKanji) {
        rowCells += `
          <td style="padding: 12px; text-align: center; vertical-align: middle; width: 120px; border-right: 1px solid #cbd5e1;">
            <div style="font-size: 32px; font-weight: 900; line-height: 1; color: #0f172a; font-family: 'Hiragino Sans', 'Meiryo', sans-serif;">
              ${item.kanji}
            </div>
            ${hiragana ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${hiragana}</div>` : ''}
            ${hanViet ? `<div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 4px; text-transform: uppercase;">${hanViet}</div>` : ''}
            <div style="margin-top: 4px; font-size: 10px; color: #64748b;">
              ${jlpt ? `<span style="border: 1px solid #cbd5e1; padding: 1px 4px; border-radius: 3px; margin-right: 3px;">${jlpt}</span>` : ''}
              ${strokeCount ? `<span>${strokeCount} nét</span>` : ''}
            </div>
          </td>
        `;
      }

      if (includeReadings) {
        rowCells += `
          <td style="padding: 12px; vertical-align: middle; font-size: 12px; color: #1e293b; width: 220px; border-right: 1px solid #cbd5e1;">
            ${onStr ? `<div><strong>On:</strong> ${onStr}</div>` : ''}
            ${kunStr ? `<div style="margin-top: 2px;"><strong>Kun:</strong> ${kunStr}</div>` : ''}
            ${meaningStr ? `<div style="margin-top: 4px; color: #0f172a; font-weight: 500;"><strong>Nghĩa:</strong> ${meaningStr}</div>` : ''}
          </td>
        `;
      }

      if (includeImage) {
        rowCells += `
          <td style="padding: 12px; text-align: center; vertical-align: middle; background-color: #ffffff;">
            <div style="display: inline-block; padding: 4px; border: 1px solid #e2e8f0; border-radius: 6px; background: #ffffff;">
              <img src="${imgSrc}" width="96" height="96" alt="${item.kanji}" style="width: 96px; height: 96px; object-fit: contain; display: block;" />
            </div>
          </td>
        `;
      }

      htmlRows += `
        <tr style="border-bottom: 1px solid #cbd5e1; page-break-inside: avoid;">
          ${rowCells}
        </tr>
      `;
    }

    let headerCells = '';
    if (includeStt) headerCells += '<th style="padding: 10px; border-right: 1px solid #94a3b8; width: 40px;">STT</th>';
    if (includeKanji) headerCells += '<th style="padding: 10px; border-right: 1px solid #94a3b8; width: 120px;">Chữ Hán & Hán Việt</th>';
    if (includeReadings) headerCells += '<th style="padding: 10px; border-right: 1px solid #94a3b8; width: 220px;">Âm đọc & Ý nghĩa</th>';
    if (includeImage) headerCells += '<th style="padding: 10px;">Ảnh Nét Vẽ Kanji</th>';

    const html = `
      <table border="1" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #94a3b8; width: 100%; font-family: Arial, sans-serif; font-size: 13px; color: #0f172a;">
        <thead>
          <tr style="background-color: #f1f5f9; color: #1e293b; font-weight: bold; text-align: center;">
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${htmlRows}
        </tbody>
      </table>
    `;

    return { html, text: plainTextLines };
  };

  const handleCopyTableToClipboard = async () => {
    if (kanjiList.length === 0) {
      showToast('Danh sách Kanji đang trống!', 'error');
      return;
    }
    if (!includeStt && !includeKanji && !includeReadings && !includeImage) {
      showToast('Vui lòng chọn ít nhất một cột để sao chép!', 'error');
      return;
    }

    setIsCopying(true);
    try {
      showToast('Đang tạo bảng và ảnh theo các cột đã chọn...', 'info');
      const { html, text } = await generateTableHtmlAndImages();

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([clipboardItem]);

        setCopied(true);
        showToast('Đã sao chép bảng vào Clipboard! Bạn có thể dán thẳng (Ctrl + V) vào Google Docs!', 'success');
        setTimeout(() => setCopied(false), 3000);
      } else {
        showToast('Trình duyệt không hỗ trợ ClipboardItem nâng cao. Hãy dùng nút Tải File HTML.', 'error');
      }
    } catch (e) {
      console.error('Lỗi sao chép bảng:', e);
      showToast('Không thể sao chép bảng vào clipboard.', 'error');
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownloadHtmlFile = async () => {
    if (!includeStt && !includeKanji && !includeReadings && !includeImage) {
      showToast('Vui lòng chọn ít nhất một cột!', 'error');
      return;
    }
    try {
      showToast('Đang chuẩn bị file HTML xuất bảng...', 'info');
      const { html } = await generateTableHtmlAndImages();

      const fullDoc = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bảng Kanji Luyện Viết - Google Docs Export</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
          h1 { font-size: 20px; margin-bottom: 8px; }
          p { color: #64748b; font-size: 13px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Bảng Tra Cứu & Nét Vẽ Kanji</h1>
        <p>Sao chép toàn bộ bảng dưới đây và dán vào Google Docs hoặc Microsoft Word.</p>
        ${html}
      </body>
      </html>`;

      const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kanji_table_export_${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Đã tải xuống file HTML bảng Kanji thành công!', 'success');
    } catch (e) {
      showToast('Lỗi tải xuống file HTML.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs">
              <Table className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Xuất Bảng & Tùy Chọn Cột (Dán Google Docs)</h2>
              <p className="text-xs text-emerald-100">
                Lựa chọn các cột hiển thị theo ý thích • Sao chép 1 lần dán toàn bộ
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
        <div className="px-6 py-3.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-bold text-slate-700 flex items-center gap-1.5">
            <span>Chọn các cột hiển thị:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setIncludeStt(!includeStt)}
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              {includeStt ? <CheckSquare className="w-4 h-4 text-teal-700" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>STT</span>
            </button>
            <button
              type="button"
              onClick={() => setIncludeKanji(!includeKanji)}
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              {includeKanji ? <CheckSquare className="w-4 h-4 text-teal-700" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>Chữ Hán & Hán-Việt</span>
            </button>
            <button
              type="button"
              onClick={() => setIncludeReadings(!includeReadings)}
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              {includeReadings ? <CheckSquare className="w-4 h-4 text-teal-700" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>Âm đọc & Ý nghĩa</span>
            </button>
            <button
              type="button"
              onClick={() => setIncludeImage(!includeImage)}
              className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              {includeImage ? <CheckSquare className="w-4 h-4 text-teal-700" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>Ảnh Nét Vẽ Kanji</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Action summary */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Tổng số: <strong className="text-slate-900 font-bold">{kanjiList.length}</strong> chữ Kanji
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtmlFile}
              disabled={kanjiList.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Tải File HTML
            </button>
            <button
              onClick={handleCopyTableToClipboard}
              disabled={isCopying || kanjiList.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  Đã Sao Chép Thành Công!
                </>
              ) : isCopying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang Xử Lý & Tạo Ảnh...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  📋 Sao Chép Bảng Vào Clipboard (1 Click)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Preview Table */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-center">
                  {includeStt && <th className="p-3 border-r border-slate-200 w-12">STT</th>}
                  {includeKanji && <th className="p-3 border-r border-slate-200 w-28">Chữ Hán & Hán Việt</th>}
                  {includeReadings && <th className="p-3 border-r border-slate-200 text-left">Âm đọc & Ý nghĩa</th>}
                  {includeImage && <th className="p-3 w-36">Ảnh Nét Vẽ Kanji</th>}
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
                    <tr key={item.hex || index} className="border-b border-slate-200 hover:bg-slate-50/80 transition-colors">
                      {includeStt && (
                        <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-500 align-middle">
                          {index + 1}
                        </td>
                      )}
                      {includeKanji && (
                        <td className="p-3 border-r border-slate-200 text-center align-middle">
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
                      {includeReadings && (
                        <td className="p-3 border-r border-slate-200 align-middle text-slate-700">
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
                      {includeImage && (
                        <td className="p-3 text-center align-middle bg-white">
                          <div className="w-20 h-20 mx-auto border border-slate-200 rounded-lg p-1 flex items-center justify-center bg-white shadow-xs">
                            <KanjiSvgView
                              svgUrl={item.svgUrl}
                              kanji={item.kanji}
                              className="w-full h-full object-contain"
                            />
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
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Mẹo: Sau khi bấm sao chép, hãy mở Google Docs và nhấn <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono text-slate-700">Ctrl + V</kbd></span>
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
