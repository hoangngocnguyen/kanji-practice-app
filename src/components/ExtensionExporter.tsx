import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Chrome, CheckCircle2 } from 'lucide-react';
import { KANJI_DICTIONARY } from '../data/kanjiDictionary';

export const ExtensionExporter: React.FC = () => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportDone, setExportDone] = useState<boolean>(false);

  const handleDownloadZip = async () => {
    setIsExporting(true);
    setExportDone(false);

    try {
      const zip = new JSZip();

      // 1. Add Manifest V3
      zip.file('manifest.json', JSON.stringify({
        manifest_version: 3,
        name: "Luyện Kanji - Tra Cứu & Dịch Kanji Nhật-Việt",
        short_name: "Luyện Kanji",
        version: "1.0.0",
        description: "Tiện ích bôi đen tra cứu Kanji, nét vẽ động KanjiVG, âm Hán-Việt, từ ghép và chuyển hướng Web App.",
        permissions: ["activeTab", "storage", "contextMenus", "scripting"],
        host_permissions: ["<all_urls>"],
        action: {
          default_popup: "popup.html",
          default_icon: {
            "16": "icons/icon16.png",
            "48": "icons/icon48.png",
            "128": "icons/icon128.png"
          }
        },
        background: { service_worker: "background.js" },
        content_scripts: [
          {
            matches: ["<all_urls>"],
            js: ["content.js"],
            run_at: "document_idle"
          }
        ],
        icons: {
          "16": "icons/icon16.png",
          "48": "icons/icon48.png",
          "128": "icons/icon128.png"
        },
        web_accessible_resources: [
          {
            resources: ["icons/*"],
            matches: ["<all_urls>"]
          }
        ]
      }, null, 2));

      // 2. Add Background Script
      zip.file('background.js', `
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "luyen-kanji-analyze",
    title: "Phân tích Kanji '%s' với Luyện Kanji",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "luyen-kanji-analyze" && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: "OPEN_KANJI_MODAL",
      text: info.selectionText
    }).catch(err => console.warn("Lỗi gửi message:", err));
  }
});
      `);

      // Bundle complete dictionary with examples (compounds)
      const bundledDictObj = Object.fromEntries(
        Object.entries(KANJI_DICTIONARY).map(([k, v]) => [
          k,
          {
            hanviet: v.hanViet || 'HÁN VIỆT',
            onyomi: v.on || [],
            kunyomi: v.kun || [],
            jlpt: v.jlpt || 'N3',
            strokeCount: v.strokeCount || 5,
            meaning: Array.isArray(v.meanings) ? v.meanings.join(', ') : (v.meanings || `Chữ Kanji ${k}`),
            radical: v.radical || 'Bộ thủ',
            examples: v.examples || []
          }
        ])
      );
      const bundledDictJson = JSON.stringify(bundledDictObj);

      // 3. Add Content Script
      const contentJsCode = `/**
 * Luyện Kanji - Content Script với Shadow DOM Isolation & Real SVG Stroke Order Animation
 */
(function () {
  if (window.__LUYEN_KANJI_CONTENT_LOADED__) return;
  window.__LUYEN_KANJI_CONTENT_LOADED__ = true;

  const TARGET_WEB_APP_URL = "https://luyenkanji.vercel.app";
  const KANJI_DICTIONARY = ${bundledDictJson};

  const STROKE_COLORS = [
    '#2563eb', '#ef4444', '#0f172a', '#16a34a', '#d97706',
    '#9333ea', '#0891b2', '#db2777', '#4f46e5', '#ca8a04'
  ];

  function getKanjiHex(char) {
    const codePoint = char.codePointAt(0) || char.charCodeAt(0);
    return codePoint.toString(16).toLowerCase().padStart(5, '0');
  }

  const svgCache = new Map();

  async function fetchKanjiSvgDoc(char) {
    const hex = getKanjiHex(char);
    const url = 'https://cdn.jsdelivr.net/gh/kanjivg/kanjivg/kanji/' + hex + '.svg';
    let rawSvg = svgCache.get(url);
    if (!rawSvg) {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      rawSvg = await res.text();
      svgCache.set(url, rawSvg);
    }
    const parser = new DOMParser();
    return parser.parseFromString(rawSvg, 'image/svg+xml');
  }

  async function renderKanjiSvgStatic(char, containerEl) {
    if (!containerEl) return;
    try {
      const doc = await fetchKanjiSvgDoc(char);
      const paths = Array.from(doc.querySelectorAll('path[d]'));
      paths.forEach((path, idx) => {
        const color = STROKE_COLORS[idx % STROKE_COLORS.length];
        path.setAttribute('stroke', color);
        path.setAttribute('style', 'stroke: ' + color + ' !important; stroke-width: 3.3px !important; stroke-linecap: round; stroke-linejoin: round; fill: none;');
      });

      const numberGroup = doc.querySelector('g[id*="StrokeNumbers"]');
      if (numberGroup) {
        numberGroup.setAttribute('style', 'display: block;');
        const textEls = Array.from(numberGroup.querySelectorAll('text'));
        textEls.forEach((textEl, idx) => {
          const numColor = STROKE_COLORS[idx % STROKE_COLORS.length];
          textEl.setAttribute('fill', numColor);
          textEl.setAttribute('style', 'fill: ' + numColor + ' !important; font-size: 6.5px !important; font-weight: 700 !important; fill-opacity: 0.9 !important;');
        });
      }

      const svgEl = doc.querySelector('svg');
      if (svgEl) {
        svgEl.setAttribute('width', '100%');
        svgEl.setAttribute('height', '100%');
        svgEl.setAttribute('style', 'width: 100%; height: 100%; display: block;');
      }

      const serializer = new XMLSerializer();
      containerEl.innerHTML = serializer.serializeToString(doc);
    } catch (err) {
      containerEl.innerHTML = '<div style="font-size: 40px; font-weight: 900; color: #0f766e;">' + char + '</div>';
    }
  }

  let hostDiv = document.getElementById('luyen-kanji-root');
  if (!hostDiv) {
    hostDiv = document.createElement('div');
    hostDiv.id = 'luyen-kanji-root';
    document.body.appendChild(hostDiv);
  }
  const shadowRoot = hostDiv.attachShadow({ mode: 'open' });

  const css = "* { box-sizing: border-box; margin: 0; padding: 0; } " +
    ".lk-tooltip-btn { position: absolute; z-index: 2147483647; display: inline-flex; align-items: center; gap: 8px; background: #0f172a; color: #ffffff; padding: 7px 14px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); cursor: pointer; font-size: 13px; font-weight: 700; border: 1px solid rgba(255,255,255,0.2); transition: all 0.15s ease; user-select: none; } " +
    ".lk-tooltip-btn:hover { background: #0f766e; transform: translateY(-2px); } " +
    ".lk-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(2px); z-index: 2147483646; display: flex; align-items: center; justify-content: center; padding: 16px; } " +
    ".lk-card { position: fixed; top: 60px; left: calc(50vw - 380px); width: 100%; max-width: 760px; max-height: 88vh; background: #ffffff; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #cbd5e1; user-select: none; } " +
    ".lk-header { padding: 14px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; cursor: grab; } " +
    ".lk-header:active { cursor: grabbing; } " +
    ".lk-header h3 { font-size: 15px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; } " +
    ".lk-body { padding: 20px; overflow-y: auto; flex: 1; user-select: text; } " +
    ".lk-kanji-card { display: flex; gap: 16px; background: #ffffff; padding: 16px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 14px; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.15s ease; } " +
    ".lk-kanji-card:hover { border-color: #0d9488; } " +
    ".lk-kanji-col1 { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 90px; flex-shrink: 0; text-align: center; } " +
    ".lk-stt-badge { font-family: monospace; font-size: 12px; font-weight: 700; color: #0f766e; } " +
    ".lk-jlpt-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #ccfbf1; color: #115e59; border: 1px solid #99f6e4; } " +
    ".lk-kanji-big { font-size: 42px; font-weight: 900; color: #0f172a; margin: 2px 0; } " +
    ".lk-hanviet-badge { font-size: 12px; font-weight: 700; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 6px; margin-bottom: 4px; } " +
    ".lk-mazii-link { font-size: 11px; color: #94a3b8; text-decoration: none; font-weight: 500; } " +
    ".lk-mazii-link:hover { color: #0f766e; text-decoration: underline; } " +
    ".lk-kanji-col2 { width: 88px; height: 88px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; position: relative; overflow: hidden; } " +
    ".lk-kanji-col2:hover { border-color: #0d9488; } " +
    ".lk-kanji-col2::after { content: '▶ Xem nét'; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.75); color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s ease; } " +
    ".lk-kanji-col2:hover::after { opacity: 1; } " +
    ".lk-kanji-col3 { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; } " +
    ".lk-badge-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; } " +
    ".lk-pill { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; color: #475569; } " +
    ".lk-pill-on { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-family: monospace; } " +
    ".lk-pill-kun { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; font-family: monospace; } " +
    ".lk-meaning { font-size: 12px; color: #334155; font-weight: 500; line-height: 1.4; } " +
    ".lk-btn-row { display: flex; gap: 8px; margin-top: 4px; } " +
    ".lk-btn { padding: 6px 12px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease; } " +
    ".lk-btn:hover { background: #f8fafc; color: #0f172a; } " +
    ".lk-btn-primary { background: #0d9488; color: #fff; border-color: #0d9488; } " +
    ".lk-btn-primary:hover { background: #0f766e; } " +
    ".lk-practice-subtabs { display: flex; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 0 16px; gap: 4px; margin-bottom: 16px; border-radius: 12px; } " +
    ".lk-subtab { padding: 10px 14px; font-size: 12px; font-weight: 700; color: #64748b; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid transparent; } " +
    ".lk-subtab.active { color: #0f766e; border-bottom-color: #0f766e; background: #ffffff; } " +
    ".lk-canvas-wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 10px; } " +
    "canvas { border: 2px dashed #cbd5e1; border-radius: 16px; background: #ffffff; cursor: crosshair; }";

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  shadowRoot.appendChild(styleEl);

  let currentTooltip = null;
  let currentModal = null;
  let activePracticeTab = 'animation';
  let animTimerId = null;

  function extractKanji(text) {
    if (!text) return [];
    var matches = text.match(/[\\u4e00-\\u9faf\\u3400-\\u4dbf]/g) || [];
    return [...new Set(matches)];
  }

  function speakJapanese(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  document.addEventListener('mouseup', (e) => {
    if (e.target && e.target.closest && e.target.closest('#luyen-kanji-root')) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';

      if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
      }

      const kanjis = extractKanji(text);
      if (text && kanjis.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const btn = document.createElement('div');
        btn.className = 'lk-tooltip-btn';
        btn.innerHTML = '<span id="lk-btn-modal" style="display:inline-flex; align-items:center; gap:4px;">⛩️ Tra Kanji (' + kanjis.length + ')</span>' +
          '<span style="opacity:0.3; margin:0 2px;">|</span>' +
          '<span id="lk-btn-web" style="display:inline-flex; align-items:center; gap:4px;" title="Mở trên trang Web Luyện Kanji">🌐 Mở Web</span>';
        btn.style.left = (window.scrollX + rect.left + (rect.width / 2) - 90) + 'px';
        btn.style.top = (window.scrollY + rect.top - 42) + 'px';

        btn.querySelector('#lk-btn-modal').onclick = (evt) => {
          evt.stopPropagation();
          openModal(text);
          btn.remove();
          currentTooltip = null;
        };

        btn.querySelector('#lk-btn-web').onclick = (evt) => {
          evt.stopPropagation();
          const targetUrl = TARGET_WEB_APP_URL + '/?text=' + encodeURIComponent(text);
          window.open(targetUrl, '_blank');
          btn.remove();
          currentTooltip = null;
        };

        shadowRoot.appendChild(btn);
        currentTooltip = btn;
      }
    }, 10);
  });

  function openModal(text) {
    if (currentModal) currentModal.remove();
    if (animTimerId) { clearTimeout(animTimerId); animTimerId = null; }

    const kanjis = extractKanji(text);

    const overlay = document.createElement('div');
    overlay.className = 'lk-overlay';

    overlay.innerHTML = '<div class="lk-card" id="lk-card-element">' +
      '<div class="lk-header" id="lk-header-drag" title="Kéo thả để di chuyển cửa sổ modal">' +
        '<h3><span style="opacity: 0.6; font-size: 16px;">⠿</span><span>⛩️ Luyện Kanji - Phân Tích Văn Bản (' + kanjis.length + ' chữ Hán)</span></h3>' +
        '<div style="display:flex; gap:8px; align-items:center;">' +
          '<button class="lk-btn lk-btn-primary" id="lk-open-web-app" title="Mở toàn bộ đoạn văn trên Web Luyện Kanji">🌐 Mở trên Web</button>' +
          '<button class="lk-btn" id="lk-close-modal">✕ Đóng</button>' +
        '</div>' +
      '</div>' +
      '<div class="lk-body" id="lk-modal-content"></div>' +
    '</div>';

    shadowRoot.appendChild(overlay);
    currentModal = overlay;

    const cardEl = overlay.querySelector('#lk-card-element');
    const headerEl = overlay.querySelector('#lk-header-drag');

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    headerEl.onmousedown = (e) => {
      if (e.target.closest('button') || e.target.closest('.lk-btn')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = cardEl.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      cardEl.style.left = initialLeft + 'px';
      cardEl.style.top = initialTop + 'px';
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = window.innerWidth - cardEl.offsetWidth - 10;
      const maxTop = window.innerHeight - 80;

      newLeft = Math.max(10, Math.min(maxLeft, newLeft));
      newTop = Math.max(10, Math.min(maxTop, newTop));

      cardEl.style.left = newLeft + 'px';
      cardEl.style.top = newTop + 'px';
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const closeModal = () => {
      if (animTimerId) { clearTimeout(animTimerId); animTimerId = null; }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      overlay.remove();
      currentModal = null;
    };

    overlay.querySelector('#lk-close-modal').onclick = closeModal;
    overlay.querySelector('#lk-open-web-app').onclick = (e) => {
      e.stopPropagation();
      const targetUrl = TARGET_WEB_APP_URL + '/?text=' + encodeURIComponent(text);
      window.open(targetUrl, '_blank');
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };

    renderMainKanjiList(text, kanjis);
  }

  function renderMainKanjiList(rawText, kanjis) {
    const container = currentModal.querySelector('#lk-modal-content');
    if (!container) return;

    if (kanjis.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 40px 20px; color: #64748b;">' +
        '<div style="font-size: 32px; margin-bottom: 8px;">🔍</div>' +
        '<div style="font-size: 14px; font-weight: 700; color: #0f172a;">Không tìm thấy chữ Kanji nào trong đoạn văn đã chọn</div>' +
        '<div style="font-size: 12px; margin-top: 4px;">Hãy chọn đoạn văn tiếng Nhật có chứa chữ Hán (Kanji).</div>' +
      '</div>';
      return;
    }

    container.innerHTML = kanjis.map((k, idx) => {
      const info = KANJI_DICTIONARY[k] || {
        hanviet: 'HÁN VIỆT', onyomi: ['-'], kunyomi: ['-'],
        jlpt: 'N3', strokeCount: 5, meaning: 'Chữ Kanji ' + k, radical: 'Bộ thủ', examples: []
      };

      const onyomiStr = Array.isArray(info.onyomi) ? info.onyomi.join(', ') : info.onyomi;
      const kunyomiStr = Array.isArray(info.kunyomi) ? info.kunyomi.join(', ') : info.kunyomi;

      return '<div class="lk-kanji-card">' +
        '<div class="lk-kanji-col1">' +
          '<div style="display:flex; gap:4px; align-items:center; margin-bottom:2px;"><span class="lk-stt-badge">#' + (idx + 1) + '</span><span class="lk-jlpt-badge">' + info.jlpt + '</span></div>' +
          '<div class="lk-kanji-big">' + k + '</div>' +
          '<div class="lk-hanviet-badge">' + info.hanviet + '</div>' +
          '<a class="lk-mazii-link" href="https://mazii.net/vi-VN/search/kanji/' + encodeURIComponent(k) + '" target="_blank">Mazii ↗</a>' +
        '</div>' +
        '<div class="lk-kanji-col2 lk-btn-open-practice" data-char="' + k + '" id="lk-col2-svg-' + idx + '"></div>' +
        '<div class="lk-kanji-col3">' +
          '<div class="lk-badge-row"><span class="lk-pill">' + info.strokeCount + ' nét</span><span class="lk-pill">Bộ: ' + info.radical + '</span></div>' +
          '<div class="lk-badge-row"><span class="lk-pill lk-pill-on">On: ' + onyomiStr + '</span><span class="lk-pill lk-pill-kun">Kun: ' + kunyomiStr + '</span></div>' +
          '<div class="lk-meaning"><strong>Nghĩa:</strong> ' + info.meaning + '</div>' +
          '<div class="lk-btn-row"><button class="lk-btn lk-btn-speak" data-text="' + k + '">🔊 Phát âm</button><button class="lk-btn lk-btn-primary lk-btn-open-practice" data-char="' + k + '">✍️ Luyện nét</button></div>' +
        '</div>' +
      '</div>';
    }).join('');

    kanjis.forEach((k, idx) => {
      const col2El = container.querySelector('#lk-col2-svg-' + idx);
      if (col2El) {
        renderKanjiSvgStatic(k, col2El);
      }
    });

    container.querySelectorAll('.lk-btn-speak').forEach(btn => {
      btn.onclick = () => speakJapanese(btn.dataset.text);
    });

    container.querySelectorAll('.lk-btn-open-practice').forEach(btn => {
      btn.onclick = () => {
        openPracticeModal(btn.dataset.char, rawText, kanjis);
      };
    });
  }

  function openPracticeModal(char, rawText, kanjis) {
    activePracticeTab = 'animation';
    const info = KANJI_DICTIONARY[char] || {
      hanviet: 'HÁN VIỆT', onyomi: ['-'], kunyomi: ['-'], jlpt: 'N3', strokeCount: 5, meaning: 'Chữ ' + char, radical: 'Bộ thủ', examples: []
    };

    const container = currentModal.querySelector('#lk-modal-content');
    if (!container) return;

    renderPracticeContent(container, char, info, rawText, kanjis);
  }

  function renderPracticeContent(container, char, info, rawText, kanjis) {
    const isAnim = activePracticeTab === 'animation';
    const isDict = activePracticeTab === 'dictionary';
    const isRad = activePracticeTab === 'radicals';
    const isPrac = activePracticeTab === 'practice';

    container.innerHTML = '<div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;"><button class="lk-btn" id="lk-back-to-list">← Quay lại danh sách (' + kanjis.length + ' Kanji)</button><div style="font-size: 14px; font-weight: 800; color: #0f172a;">Chữ <span style="font-size: 20px; color: #0d9488;">' + char + '</span> (' + info.hanviet + ')</div></div><div class="lk-practice-subtabs"><button class="lk-subtab ' + (isAnim ? 'active' : '') + '" data-subtab="animation">🎬 Hoạt ảnh nét vẽ</button><button class="lk-subtab ' + (isDict ? 'active' : '') + '" data-subtab="dictionary">📖 Nghĩa & Từ ghép</button><button class="lk-subtab ' + (isRad ? 'active' : '') + '" data-subtab="radicals">🗂️ Bộ thủ & Mẹo nhớ</button><button class="lk-subtab ' + (isPrac ? 'active' : '') + '" data-subtab="practice">✍️ Tập viết tay</button></div><div id="lk-subtab-body"></div>';

    container.querySelector('#lk-back-to-list').onclick = () => {
      if (animTimerId) { clearTimeout(animTimerId); animTimerId = null; }
      renderMainKanjiList(rawText, kanjis);
    };

    const subtabs = container.querySelectorAll('.lk-subtab');
    subtabs.forEach(st => {
      st.onclick = () => {
        if (animTimerId) { clearTimeout(animTimerId); animTimerId = null; }
        subtabs.forEach(t => t.classList.remove('active'));
        st.classList.add('active');
        activePracticeTab = st.dataset.subtab;
        renderSubtabBody(container.querySelector('#lk-subtab-body'), char, info);
      };
    });

    renderSubtabBody(container.querySelector('#lk-subtab-body'), char, info);
  }

  let strokeAnimConfig = {
    playing: true,
    speed: 1.0,
    continuous: true,
    multicolor: true,
    showNumbers: true
  };

  async function startStrokeAnimation(char, boxEl, statusPillEl, togglePlayBtn) {
    if (animTimerId) { clearTimeout(animTimerId); animTimerId = null; }
    boxEl.innerHTML = '<div style="font-size: 12px; color: #94a3b8;">Đang tải hoạt ảnh SVG...</div>';

    try {
      const doc = await fetchKanjiSvgDoc(char);
      const paths = Array.from(doc.querySelectorAll('path[d]'));
      const numberGroup = doc.querySelector('g[id*="StrokeNumbers"]');

      if (paths.length === 0) {
        boxEl.innerHTML = '<div style="font-size: 48px; font-weight: 900; color: #0d9488;">' + char + '</div>';
        return;
      }

      // Format SVG canvas with background grid lines
      const svgEl = doc.querySelector('svg');
      if (svgEl) {
        svgEl.setAttribute('width', '100%');
        svgEl.setAttribute('height', '100%');
        svgEl.setAttribute('style', 'width: 100%; height: 100%; display: block;');

        // Background guide grid lines
        const gridGroup = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridGroup.setAttribute('id', 'lk-grid-lines');
        gridGroup.innerHTML = '<line x1="0" y1="54" x2="109" y2="54" stroke="#e2e8f0" stroke-width="0.8" stroke-dasharray="2,2"/><line x1="54.5" y1="0" x2="54.5" y2="109" stroke="#e2e8f0" stroke-width="0.8" stroke-dasharray="2,2"/>';
        svgEl.insertBefore(gridGroup, svgEl.firstChild);
      }

      // Configure numbers group
      if (numberGroup) {
        numberGroup.setAttribute('style', strokeAnimConfig.showNumbers ? 'display: block;' : 'display: none;');
        const textEls = Array.from(numberGroup.querySelectorAll('text'));
        textEls.forEach((textEl, idx) => {
          const numColor = strokeAnimConfig.multicolor ? STROKE_COLORS[idx % STROKE_COLORS.length] : '#0d9488';
          textEl.setAttribute('fill', numColor);
          textEl.setAttribute('style', 'fill: ' + numColor + ' !important; font-size: 6.5px !important; font-weight: 700 !important;');
        });
      }

      // Prepare paths strokeDasharray
      const pathLengths = paths.map(p => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len + ' ' + len;
        p.style.strokeDashoffset = len + '';
        p.style.transition = 'none';
        const color = strokeAnimConfig.multicolor ? STROKE_COLORS[paths.indexOf(p) % STROKE_COLORS.length] : '#0f766e';
        p.setAttribute('stroke', color);
        p.setAttribute('style', 'stroke: ' + color + ' !important; stroke-width: 3.5px !important; stroke-linecap: round; stroke-linejoin: round; fill: none; stroke-dasharray: ' + len + ' ' + len + '; stroke-dashoffset: ' + len + ';');
        return len;
      });

      const serializer = new XMLSerializer();
      boxEl.innerHTML = serializer.serializeToString(doc);

      // Re-query newly attached DOM elements inside boxEl
      const domBox = boxEl.querySelector('svg');
      const domPaths = Array.from(domBox.querySelectorAll('path[d]'));

      let currentIdx = 0;
      strokeAnimConfig.playing = true;
      if (togglePlayBtn) togglePlayBtn.innerHTML = '⏸️ Tạm dừng';

      function playStep() {
        if (!strokeAnimConfig.playing) return;

        if (currentIdx >= domPaths.length) {
          statusPillEl.textContent = 'Hoàn tất (' + domPaths.length + '/' + domPaths.length + ' nét)';
          if (strokeAnimConfig.continuous) {
            animTimerId = setTimeout(() => {
              // Reset all paths
              domPaths.forEach((p, idx) => {
                p.style.transition = 'none';
                p.style.strokeDashoffset = pathLengths[idx] + '';
              });
              currentIdx = 0;
              playStep();
            }, 1000);
          } else {
            strokeAnimConfig.playing = false;
            if (togglePlayBtn) togglePlayBtn.innerHTML = '▶️ Tiếp tục';
          }
          return;
        }

        const strokeNum = currentIdx + 1;
        statusPillEl.textContent = 'Nét thứ ' + strokeNum + ' / ' + domPaths.length;

        const curPath = domPaths[currentIdx];
        const len = pathLengths[currentIdx];
        const duration = 0.45 / strokeAnimConfig.speed;

        curPath.style.transition = 'stroke-dashoffset ' + duration + 's linear';
        curPath.style.strokeDashoffset = '0';

        currentIdx++;
        animTimerId = setTimeout(playStep, (duration * 1000) + 40);
      }

      playStep();

    } catch (err) {
      boxEl.innerHTML = '<div style="font-size: 48px; font-weight: 900; color: #0d9488;">' + char + '</div>';
    }
  }

  function renderSubtabBody(body, char, info) {
    if (!body) return;

    if (activePracticeTab === 'animation') {
      body.innerHTML = '<div style="text-align: center; padding: 10px 0;">' +
        '<div style="display:inline-flex; align-items:center; gap:8px; background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; margin-bottom:12px;" id="lk-stroke-status-pill">' +
          'Đang phát hoạt ảnh...' +
        '</div>' +
        '<div style="width: 250px; height: 250px; margin: 0 auto; background: #ffffff; border: 2px solid #e2e8f0; border-radius: 16px; padding: 12px; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);" id="lk-anim-svg-box"></div>' +
        '<div style="margin-top: 14px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center;">' +
          '<button class="lk-btn lk-btn-primary" id="lk-anim-toggle-play">⏸️ Tạm dừng</button>' +
          '<button class="lk-btn" id="lk-anim-replay">🔄 Vẽ lại</button>' +
          '<button class="lk-btn" id="lk-anim-speed-btn">⚡ Tốc độ: 1.0x</button>' +
          '<button class="lk-btn" id="lk-anim-speak-btn">🔊 Phát âm</button>' +
        '</div>' +
        '<div style="margin-top: 10px; display: flex; gap: 10px; justify-content: center; font-size: 11px; color: #475569;">' +
          '<label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" id="lk-anim-chk-continuous" checked /> Vẽ liên tục</label>' +
          '<label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" id="lk-anim-chk-color" checked /> Đa màu nét</label>' +
          '<label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" id="lk-anim-chk-numbers" checked /> Hiển thị số nét</label>' +
        '</div>' +
      '</div>';

      const animBox = body.querySelector('#lk-anim-svg-box');
      const statusPill = body.querySelector('#lk-stroke-status-pill');
      const togglePlayBtn = body.querySelector('#lk-anim-toggle-play');

      startStrokeAnimation(char, animBox, statusPill, togglePlayBtn);

      togglePlayBtn.onclick = () => {
        strokeAnimConfig.playing = !strokeAnimConfig.playing;
        togglePlayBtn.innerHTML = strokeAnimConfig.playing ? '⏸️ Tạm dừng' : '▶️ Tiếp tục';
        if (strokeAnimConfig.playing) {
          startStrokeAnimation(char, animBox, statusPill, togglePlayBtn);
        } else if (animTimerId) {
          clearTimeout(animTimerId);
          animTimerId = null;
        }
      };

      body.querySelector('#lk-anim-replay').onclick = () => {
        startStrokeAnimation(char, animBox, statusPill, togglePlayBtn);
      };

      const speedBtn = body.querySelector('#lk-anim-speed-btn');
      speedBtn.onclick = () => {
        if (strokeAnimConfig.speed === 1.0) strokeAnimConfig.speed = 1.5;
        else if (strokeAnimConfig.speed === 1.5) strokeAnimConfig.speed = 2.0;
        else strokeAnimConfig.speed = 1.0;
        speedBtn.textContent = '⚡ Tốc độ: ' + strokeAnimConfig.speed.toFixed(1) + 'x';
        startStrokeAnimation(char, animBox, statusPill, togglePlayBtn);
      };

      body.querySelector('#lk-anim-speak-btn').onclick = () => speakJapanese(char);

      const chkContinuous = body.querySelector('#lk-anim-chk-continuous');
      chkContinuous.onchange = (e) => { strokeAnimConfig.continuous = e.target.checked; };

      const chkColor = body.querySelector('#lk-anim-chk-color');
      chkColor.onchange = (e) => {
        strokeAnimConfig.multicolor = e.target.checked;
        startStrokeAnimation(char, animBox, statusPill, togglePlayBtn);
      };

      const chkNumbers = body.querySelector('#lk-anim-chk-numbers');
      chkNumbers.onchange = (e) => {
        strokeAnimConfig.showNumbers = e.target.checked;
        startStrokeAnimation(char, animBox, statusPill, togglePlayBtn);
      };

    } else if (activePracticeTab === 'dictionary') {
      const onyomiStr = Array.isArray(info.onyomi) ? info.onyomi.join(', ') : info.onyomi;
      const kunyomiStr = Array.isArray(info.kunyomi) ? info.kunyomi.join(', ') : info.kunyomi;

      let compoundsHtml = '';
      if (info.examples && info.examples.length > 0) {
        compoundsHtml = '<div style="margin-top: 14px;"><div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Từ ghép thường gặp (Compound Words):</div>' +
          '<div style="display: flex; flex-direction: column; gap: 6px;">' +
          info.examples.map(ex => (
            '<div style="background: #ffffff; padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">' +
              '<div><strong style="color: #0f766e; font-size: 14px;">' + ex.word + '</strong> <span style="color: #64748b; font-size: 11px;">(' + (ex.reading || ex.hiragana || '') + ')</span></div>' +
              '<div style="color: #334155; font-weight: 500;">' + ex.meaning + '</div>' +
            '</div>'
          )).join('') +
          '</div></div>';
      }

      body.innerHTML = '<div style="background: #f8fafc; padding: 16px; border-radius: 14px; border: 1px solid #e2e8f0;">' +
        '<div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Hán-Việt: <span style="color: #0d9488;">' + info.hanviet + '</span> • Trình độ: <span style="color: #0f766e;">' + info.jlpt + '</span></div>' +
        '<div style="font-size: 13px; color: #334155; margin-bottom: 6px;"><strong>Âm On:</strong> ' + onyomiStr + ' | <strong>Âm Kun:</strong> ' + kunyomiStr + '</div>' +
        '<div style="font-size: 13px; color: #334155; margin-bottom: 8px;"><strong>Ý nghĩa:</strong> ' + info.meaning + '</div>' +
        '<div style="font-size: 12px; color: #64748b;">Bộ thủ chính: <strong>' + info.radical + '</strong> (' + info.strokeCount + ' nét)</div>' +
        compoundsHtml +
      '</div>';

    } else if (activePracticeTab === 'radicals') {
      body.innerHTML = '<div style="background: #f8fafc; padding: 16px; border-radius: 14px; border: 1px solid #e2e8f0;">' +
        '<div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Phân bóc bộ thủ cấu thành & Mẹo nhớ:</div>' +
        '<div style="font-size: 15px; font-weight: 700; color: #0d9488; margin-bottom: 10px;">Bộ thủ chính: ' + info.radical + ' (' + info.strokeCount + ' nét)</div>' +
        '<div style="font-size: 12px; color: #475569; line-height: 1.6;">Chữ Kanji <strong>' + char + '</strong> (' + info.hanviet + ') được cấu thành từ bộ <strong>' + info.radical + '</strong>. Viết đúng quy tắc từ trên xuống dưới, từ trái sang phải với tổng cộng <strong>' + info.strokeCount + '</strong> nét chuẩn.</div>' +
      '</div>';

    } else if (activePracticeTab === 'practice') {
      body.innerHTML = '<div style="text-align: center;">' +
        '<p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Vẽ đè lên khung hướng dẫn nét mờ màu xám đơn sắc bên dưới:</p>' +
        '<div class="lk-canvas-wrap">' +
          '<canvas id="lk-practice-canvas" width="260" height="260"></canvas>' +
          '<div style="display: flex; gap: 10px;">' +
            '<button class="lk-btn" id="lk-clear-practice">🔄 Xóa nét vẽ</button>' +
            '<button class="lk-btn lk-btn-primary" id="lk-speak-practice">🔊 Phát âm</button>' +
          '</div>' +
        '</div>' +
      '</div>';

      setupPracticeCanvas(body.querySelector('#lk-practice-canvas'), char);
      body.querySelector('#lk-speak-practice').onclick = () => speakJapanese(char);
    }
  }

  function setupPracticeCanvas(canvas, char) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function drawTemplate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(130, 0); ctx.lineTo(130, 260);
      ctx.moveTo(0, 130); ctx.lineTo(260, 130);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '170px "Noto Sans JP", "Hiragino Sans", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 130, 135);
    }

    drawTemplate();

    let isDrawing = false;
    ctx.strokeStyle = '#0d9488';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function startDraw(x, y) {
      isDrawing = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    function moveDraw(x, y) {
      if (!isDrawing) return;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    function endDraw() { isDrawing = false; }

    canvas.onmousedown = (e) => startDraw(e.offsetX, e.offsetY);
    canvas.onmousemove = (e) => moveDraw(e.offsetX, e.offsetY);
    canvas.onmouseup = endDraw;

    canvas.ontouchstart = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      startDraw(touch.clientX - rect.left, touch.clientY - rect.top);
    };
    canvas.ontouchmove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      moveDraw(touch.clientX - rect.left, touch.clientY - rect.top);
    };
    canvas.ontouchend = endDraw;

    const clearBtn = shadowRoot.querySelector('#lk-clear-practice');
    if (clearBtn) clearBtn.onclick = drawTemplate;
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((req) => {
      if (req.action === "OPEN_KANJI_MODAL" && req.text) {
        openModal(req.text);
      }
    });
  }
})();`;
      zip.file('content.js', contentJsCode);

      // 4. Add Popup HTML
      zip.file('popup.html', `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Luyện Kanji Popup</title></head>
<body style="width: 280px; font-family: sans-serif; padding: 16px; background: #0f172a; color: #ffffff;">
  <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #2dd4bf;">⛩️ Luyện Kanji</h3>
  <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">Bôi đen chữ Kanji trên trang web bất kỳ để mở Floating Tooltip tra cứu nét vẽ động và thông tin từ điển Hán-Việt.</p>
  <a href="https://luyenkanji.vercel.app" target="_blank" style="display: block; margin-top: 14px; padding: 8px 12px; background: #0d9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 700; text-align: center;">🌐 Mở Trang Web Luyện Kanji</a>
</body>
</html>
      `);

      // 5. Generate actual PNG icons for Chrome Extension Manifest V3
      const createIconBlob = (size: number): Promise<Blob> => {
        return new Promise((resolve) => {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, size, size);

            ctx.fillStyle = '#0d9488';
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.floor(size * 0.5)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('漢', size / 2, size / 2 + size * 0.04);
          }
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/png');
        });
      };

      const icon16 = await createIconBlob(16);
      const icon48 = await createIconBlob(48);
      const icon128 = await createIconBlob(128);

      const iconsFolder = zip.folder('icons');
      if (iconsFolder) {
        iconsFolder.file('icon16.png', icon16);
        iconsFolder.file('icon48.png', icon48);
        iconsFolder.file('icon128.png', icon128);
      }

      // Generate ZIP blob
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `LuyenKanji-ChromeExtension-v1.0.zip`);

      setExportDone(true);
    } catch (err) {
      console.error('Lỗi khi đóng gói tệp ZIP:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-teal-800/40 my-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="p-2 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-500/30">
              <Chrome className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 px-2.5 py-1 rounded-full border border-teal-700/50">
              Manifest V3 Standard • Dynamic Stroke Animation
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Tải Tiện Ích Chrome Extension "Luyện Kanji"
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Tiện ích bôi đen văn bản trên mọi trang web (NHK News, Twitter, Manga) để bật nút 
            <strong> Tra Kanji</strong>, xem nét vẽ SVG hoạt ảnh động có điều khiển tốc độ/phát lại, âm Hán-Việt, từ ghép và nút 
            <strong> 🌐 Mở trên Web</strong> chuyển toàn bộ câu tới <code>https://luyenkanji.vercel.app</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={isExporting}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 cursor-pointer shrink-0 disabled:opacity-50 text-sm active:scale-95"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Đang đóng gói ZIP...</span>
            </>
          ) : exportDone ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
              <span>Đã tải ZIP thành công!</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5 text-slate-950" />
              <span>Tải gói ZIP Extension (.zip)</span>
            </>
          )}
        </button>
      </div>

      {/* Installation steps guide */}
      <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
        <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/50">
          <div className="font-bold text-white mb-1">1. Giải nén tệp ZIP</div>
          <div>Sau khi tải về, giải nén thư mục <code>LuyenKanji-ChromeExtension-v1.0</code> ra máy tính.</div>
        </div>
        <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/50">
          <div className="font-bold text-white mb-1">2. Mở Chrome Extensions</div>
          <div>Truy cập <code>chrome://extensions</code> trên thanh địa chỉ, bật toggle <strong>Developer mode</strong> ở góc phải.</div>
        </div>
        <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/50">
          <div className="font-bold text-white mb-1">3. Tải tiện ích đã giải nén</div>
          <div>Bấm nút <strong>Load unpacked</strong> và chọn thư mục vừa giải nén để hoàn tất cài đặt!</div>
        </div>
      </div>
    </div>
  );
};
