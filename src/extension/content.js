/**
 * Luyện Kanji - Content Script với Shadow DOM Isolation, Screen Snipping OCR & Floating Kanji Modal
 */
(function () {
  if (window.__LUYEN_KANJI_CONTENT_LOADED__) {
    // If script is re-injected, trigger snipping immediately
    if (typeof window.__LUYEN_KANJI_START_SNIP__ === 'function') {
      window.__LUYEN_KANJI_START_SNIP__();
    }
    return;
  }
  window.__LUYEN_KANJI_CONTENT_LOADED__ = true;

  const TARGET_WEB_APP_URL = "https://luyenkanji.vercel.app";

  // Embedded Kanji Database for instant lookup
  const KANJI_DICTIONARY = {
    '日': { hanviet: 'NHẬT', onyomi: ['ニチ', 'ジツ'], kunyomi: ['ひ', '-び', '-か'], jlpt: 'N5', strokeCount: 4, meaning: 'Mặt trời, ngày, Nhật Bản', radical: '日 (Nhật)' },
    '本': { hanviet: 'BẢN / BỔN', onyomi: ['ホン'], kunyomi: ['moto'], jlpt: 'N5', strokeCount: 5, meaning: 'Gốc, rễ, sách, bản ngã', radical: '木 (Mộc)' },
    '語': { hanviet: 'NGỮ', onyomi: ['ゴ'], kunyomi: ['kata.ru'], jlpt: 'N5', strokeCount: 14, meaning: 'Ngôn ngữ, từ ngữ, nói chuyện', radical: '言 (Ngôn)' },
    '学': { hanviet: 'HỌC', onyomi: ['ガク'], kunyomi: ['mana.bu'], jlpt: 'N5', strokeCount: 8, meaning: 'Học tập, trường học, học vấn', radical: '子 (Tử)' },
    '校': { hanviet: 'HIỆU', onyomi: ['コウ'], kunyomi: [], jlpt: 'N5', strokeCount: 10, meaning: 'Trường học, so sánh, sửa chữa', radical: '木 (Mộc)' },
    '人': { hanviet: 'NHÂN', onyomi: ['ジン', 'ニン'], kunyomi: ['hito'], jlpt: 'N5', strokeCount: 2, meaning: 'Con người, nhân sự', radical: '人 (Nhân)' },
    '時': { hanviet: 'THỜI', onyomi: ['ジ'], kunyomi: ['toki'], jlpt: 'N5', strokeCount: 10, meaning: 'Thời gian, giờ, lúc', radical: '日 (Nhật)' },
    '間': { hanviet: 'GIAN', onyomi: ['カン', 'ケン'], kunyomi: ['aida', 'ma'], jlpt: 'N5', strokeCount: 12, meaning: 'Khoảng cách, giữa, không gian', radical: '門 (Môn)' },
    '新': { hanviet: 'TÂN', onyomi: ['シン'], kunyomi: ['atara.shii', 'ara.ta'], jlpt: 'N5', strokeCount: 13, meaning: 'Mới, tươi mới, Tân Văn', radical: '斤 (Cân)' },
    '聞': { hanviet: 'VĂN', onyomi: ['ブン', 'モン'], kunyomi: ['ki.ku'], jlpt: 'N5', strokeCount: 14, meaning: 'Nghe, tin tức, văn minh', radical: '耳 (Nhĩ)' },
    '車': { hanviet: 'XA', onyomi: ['シャ'], kunyomi: ['kuruma'], jlpt: 'N5', strokeCount: 7, meaning: 'Xe cộ, bánh xe', radical: '車 (Xa)' },
    '電': { hanviet: 'ĐIỆN', onyomi: ['デン'], kunyomi: [], jlpt: 'N5', strokeCount: 13, meaning: 'Điện, chớp, điện thoại', radical: '雨 (Vũ)' },
    '食': { hanviet: 'THỰC', onyomi: ['ショク', 'ジキ'], kunyomi: ['ta.beru', 'ku.u'], jlpt: 'N5', strokeCount: 9, meaning: 'Ăn, thức ăn, món ăn', radical: '食 (Thực)' },
    '飲': { hanviet: 'ẨM', onyomi: ['イン'], kunyomi: ['no.mu'], jlpt: 'N5', strokeCount: 12, meaning: 'Uống, thức uống', radical: '食 (Thực)' },
    '行': { hanviet: 'HÀNH / HÀNG', onyomi: ['コウ', 'ギョウ'], kunyomi: ['i.ku', 'yu.ku', 'oko.nau'], jlpt: 'N5', strokeCount: 6, meaning: 'Đi, tiến hành, hàng lối', radical: '行 (Hành)' },
    '来': { hanviet: 'LAI', onyomi: ['ライ'], kunyomi: ['ku.ru', 'ki.tasu'], jlpt: 'N5', strokeCount: 7, meaning: 'Đến, tương lai, lai khách', radical: '木 (Mộc)' },
    '生': { hanviet: 'SINH', onyomi: ['セイ', 'ショウ'], kunyomi: ['i.kiru', 'u.maru', 'na.ma'], jlpt: 'N5', strokeCount: 5, meaning: 'Sống, sinh sản, tươi sống', radical: '生 (Sinh)' },
    '先': { hanviet: 'TIÊN', onyomi: ['セン'], kunyomi: ['saki'], jlpt: 'N5', strokeCount: 6, meaning: 'Trước, tiên tiến, đầu tiên', radical: '儿 (Nhi)' },
    '私': { hanviet: 'TƯ', onyomi: ['シ'], kunyomi: ['watashi', 'watakushi'], jlpt: 'N5', strokeCount: 7, meaning: 'Tôi, riêng tư, tư nhân', radical: '禾 (Hòa)' },
    '友': { hanviet: 'HỮU', onyomi: ['ユウ'], kunyomi: ['tomo'], jlpt: 'N5', strokeCount: 4, meaning: 'Bạn bè, thân hữu', radical: '又 (Hựu)' },
    '愛': { hanviet: 'ÁI', onyomi: ['アイ'], kunyomi: ['aito.su'], jlpt: 'N3', strokeCount: 13, meaning: 'Yêu thương, ái tình', radical: '心 (Tâm)' },
    '道': { hanviet: 'ĐẠO', onyomi: ['ドウ', 'TOU'], kunyomi: ['michi'], jlpt: 'N4', strokeCount: 12, meaning: 'Con đường, đạo đức, phương pháp', radical: '辵 (Sước)' },
    '東': { hanviet: 'ĐÔNG', onyomi: ['トウ'], kunyomi: ['higashi'], jlpt: 'N5', strokeCount: 8, meaning: 'Phía đông, Tokyo', radical: '木 (Mộc)' },
    '京': { hanviet: 'KINH', onyomi: ['キョウ', 'ケイ'], kunyomi: ['miyako'], jlpt: 'N5', strokeCount: 8, meaning: 'Kinh đô, thành phố lớn', radical: '亠 (Đầu)' },
    '駅': { hanviet: 'DỊCH', onyomi: ['エキ'], kunyomi: [], jlpt: 'N5', strokeCount: 14, meaning: 'Nhà ga xe điện, trạm', radical: '馬 (Mã)' },
    '制': { hanviet: 'CHẾ', onyomi: ['セイ'], kunyomi: [], jlpt: 'N3', strokeCount: 8, meaning: 'Chế độ, quy định, kiểm soát, ban hành', radical: '刀 (Đao)' },
    '限': { hanviet: 'HẠN', onyomi: ['ゲン'], kunyomi: ['かぎ.る', 'かぎ.り'], jlpt: 'N3', strokeCount: 9, meaning: 'Giới hạn, hạn mức, phạm vi, ranh giới', radical: '阜 (Phụ)' },
    '定': { hanviet: 'ĐỊNH', onyomi: ['テイ', 'ジョウ'], kunyomi: ['さだ.める', 'さだ.まる'], jlpt: 'N3', strokeCount: 8, meaning: 'Quyết định, cố định, quy định, ổn định', radical: '宀 (Miên)' },
    '切': { hanviet: 'THIẾT / CẮT', onyomi: ['セツ', 'サイ'], kunyomi: ['き.る', 'き.れる'], jlpt: 'N4', strokeCount: 4, meaning: 'Cắt, thái, khẩn thiết, hết', radical: '刀 (Đao)' },
    '符': { hanviet: 'PHÙ', onyomi: ['フ'], kunyomi: [], jlpt: 'N3', strokeCount: 11, meaning: 'Phù hiệu, tấm vé, dấu hiệu', radical: '竹 (Trúc)' },
    '票': { hanviet: 'PHIẾU', onyomi: ['ヒョウ'], kunyomi: [], jlpt: 'N3', strokeCount: 11, meaning: 'Lá phiếu, vé, phiếu bầu', radical: '示 (Thị)' },
    '勝': { hanviet: 'THẮNG', onyomi: ['ショウ'], kunyomi: ['か.つ', 'まさ.る'], jlpt: 'N3', strokeCount: 12, meaning: 'Thắng lợi, vượt qua, cảnh đẹp', radical: '力 (Lực)' },
    '負': { hanviet: 'PHỤ', onyomi: ['フ'], kunyomi: ['ま.ける', 'ま.かす'], jlpt: 'N3', strokeCount: 9, meaning: 'Thua, gánh vác, âm', radical: '貝 (Bối)' },
    '約': { hanviet: 'ƯỚC', onyomi: ['ヤク'], kunyomi: [], jlpt: 'N3', strokeCount: 9, meaning: 'Lời hứa, khoảng chừng, tóm tắt', radical: '糸 (Mịch)' },
    '束': { hanviet: 'THÚC', onyomi: ['ソク'], kunyomi: ['たば', 'たば.ねる'], jlpt: 'N3', strokeCount: 7, meaning: 'Bó, buộc, ràng buộc', radical: '木 (Mộc)' },
    '階': { hanviet: 'GIAI', onyomi: ['カイ'], kunyomi: [], jlpt: 'N3', strokeCount: 12, meaning: 'Tầng nhà, cầu thang, giai cấp', radical: '阜 (Phụ)' },
    '段': { hanviet: 'ĐOẠN', onyomi: ['ダン'], kunyomi: [], jlpt: 'N3', strokeCount: 9, meaning: 'Bậc, giai đoạn, đoạn văn', radical: '殳 (Thù)' },
    '格': { hanviet: 'CÁCH', onyomi: ['カク', 'コウ'], kunyomi: [], jlpt: 'N3', strokeCount: 10, meaning: 'Tư cách, quy cách, khung', radical: '木 (Mộc)' },
    '規': { hanviet: 'QUY', onyomi: ['キ'], kunyomi: [], jlpt: 'N3', strokeCount: 11, meaning: 'Quy tắc, khuôn thước, quy mô', radical: '見 (Kiến)' }
  };

  function getKanjiDetails(k) {
    if (KANJI_DICTIONARY[k]) {
      const d = KANJI_DICTIONARY[k];
      return {
        hanviet: d.hanviet || d.hanViet || 'HÁN VIỆT',
        onyomi: d.onyomi || d.on || ['-'],
        kunyomi: d.kunyomi || d.kun || ['-'],
        jlpt: d.jlpt || 'N3',
        strokeCount: d.strokeCount || 8,
        meaning: d.meaning || (Array.isArray(d.meanings) ? d.meanings.join(', ') : `Chữ Kanji ${k}`),
        radical: d.radical || 'Bộ thủ'
      };
    }
    return {
      hanviet: 'HÁN VIỆT',
      onyomi: ['Tra Mazii ↗'],
      kunyomi: ['Tra Mazii ↗'],
      jlpt: 'N3',
      strokeCount: 8,
      meaning: `Âm Hán Việt & nghĩa chữ ${k}. Bấm nút Mazii ↗ để xem chi tiết.`,
      radical: 'Bộ thủ'
    };
  }

  // Shadow DOM Container Setup with Failsafe Host Positioning
  let hostDiv = document.getElementById('luyen-kanji-root');
  if (!hostDiv) {
    hostDiv = document.createElement('div');
    hostDiv.id = 'luyen-kanji-root';
    (document.body || document.documentElement).appendChild(hostDiv);
  }

  function updateHostStyle(active) {
    if (!hostDiv) return;
    if (active) {
      hostDiv.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; pointer-events: auto !important; margin: 0 !important; padding: 0 !important; border: none !important; display: block !important;';
    } else {
      hostDiv.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; z-index: 2147483647 !important; pointer-events: none !important; margin: 0 !important; padding: 0 !important; border: none !important; display: block !important;';
    }
  }

  let shadowRoot = hostDiv.shadowRoot;
  if (!shadowRoot) {
    shadowRoot = hostDiv.attachShadow({ mode: 'open' });
  }

  // Inject CSS Styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
    :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans JP", sans-serif; color: #0f172a; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    .lk-tooltip-btn {
      position: absolute;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0f172a;
      color: #ffffff;
      padding: 7px 14px;
      border-radius: 20px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      border: 1px solid rgba(255,255,255,0.2);
      transition: all 0.15s ease;
      user-select: none;
      pointer-events: auto;
    }
    .lk-tooltip-btn:hover { background: #0f766e; transform: translateY(-2px); }

    .lk-overlay {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(2px);
      z-index: 2147483646;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      pointer-events: auto;
    }

    .lk-card {
      position: fixed;
      top: 50px;
      left: calc(50vw - 390px);
      width: 100%; max-width: 780px; max-height: 90vh;
      background: #ffffff; border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);
      display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid #cbd5e1;
      user-select: none;
      pointer-events: auto;
    }

    .lk-header {
      padding: 12px 20px; background: #0f172a; color: #ffffff;
      display: flex; align-items: center; justify-content: space-between;
      cursor: grab;
    }
    .lk-header:active { cursor: grabbing; }
    .lk-header h3 { font-size: 15px; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 8px; }

    /* Modal Top Search Bar Row */
    .lk-modal-search-row {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .lk-modal-search-input {
      flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 10px;
      font-size: 13px; outline: none; background: #ffffff; color: #0f172a;
    }
    .lk-modal-search-input:focus { border-color: #0d9488; box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.2); }

    .lk-body { padding: 18px 20px; overflow-y: auto; flex: 1; user-select: text; }

    /* OCR Snipped Preview Banner */
    .lk-ocr-banner {
      display: flex; align-items: center; gap: 12px;
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;
      padding: 10px 14px; margin-bottom: 14px;
    }
    .lk-ocr-thumb {
      max-width: 100px; max-height: 50px; object-fit: contain;
      border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff;
    }

    /* Kanji Card */
    .lk-kanji-card {
      display: flex; gap: 16px; background: #ffffff; padding: 16px;
      border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 12px;
      align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      transition: all 0.15s ease;
    }
    .lk-kanji-card:hover { border-color: #0d9488; }

    .lk-kanji-col1 {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-width: 86px; flex-shrink: 0; text-align: center;
    }
    .lk-stt-badge { font-family: monospace; font-size: 11px; font-weight: 700; color: #0f766e; }
    .lk-jlpt-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #ccfbf1; color: #115e59; }
    .lk-kanji-big { font-size: 40px; font-weight: 900; color: #0f172a; margin: 2px 0; font-family: "Noto Sans JP", sans-serif; }
    .lk-hanviet-badge { font-size: 11px; font-weight: 700; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 1px 6px; border-radius: 6px; margin-bottom: 4px; }
    .lk-mazii-link { font-size: 11px; color: #94a3b8; text-decoration: none; font-weight: 500; }
    .lk-mazii-link:hover { color: #0f766e; text-decoration: underline; }

    .lk-kanji-col2 {
      width: 84px; height: 84px; background: #f8fafc; border: 2px solid #e2e8f0;
      border-radius: 14px; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; cursor: pointer; position: relative; overflow: hidden;
      font-size: 46px; font-weight: 900; color: #0f766e;
    }
    .lk-kanji-col2:hover { border-color: #0d9488; }
    .lk-kanji-col2::after {
      content: "▶ Xem nét"; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.75);
      color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center;
      justify-content: center; opacity: 0; transition: opacity 0.15s ease;
    }
    .lk-kanji-col2:hover::after { opacity: 1; }

    .lk-kanji-col3 { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }

    .lk-badge-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .lk-pill { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; color: #475569; }
    .lk-pill-on { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-family: monospace; }
    .lk-pill-kun { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; font-family: monospace; }

    .lk-meaning { font-size: 12px; color: #334155; font-weight: 500; line-height: 1.4; }

    .lk-btn-row { display: flex; gap: 8px; margin-top: 4px; }
    .lk-btn {
      padding: 6px 12px; font-size: 12px; font-weight: 700; border-radius: 8px;
      border: 1px solid #cbd5e1; background: #ffffff; color: #334155; cursor: pointer;
      display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;
    }
    .lk-btn:hover { background: #f8fafc; color: #0f172a; }
    .lk-btn-primary { background: #0d9488; color: #fff; border-color: #0d9488; }
    .lk-btn-primary:hover { background: #0f766e; }
    .lk-btn-dark { background: #0f172a; color: #fff; border-color: #0f172a; }
    .lk-btn-dark:hover { background: #1e293b; }

    /* Bottom Web App Bar */
    .lk-footer-bar {
      padding: 10px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0;
      display: flex; align-items: center; justify-content: space-between; font-size: 12px;
    }

    /* Screen Snipping Overlay Elements */
    .lk-snipping-layer {
      position: fixed; inset: 0; width: 100vw; height: 100vh;
      z-index: 2147483647; cursor: crosshair; user-select: none;
      background: rgba(15, 23, 42, 0.65); pointer-events: auto;
    }
    .lk-snipping-canvas {
      position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;
      display: block; pointer-events: none;
    }
    .lk-snipping-hud {
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px);
      color: #ffffff; padding: 10px 24px; border-radius: 9999px;
      font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 14px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.25);
      z-index: 2147483647; pointer-events: auto;
    }
    .lk-hud-btn {
      background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.3);
      padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;
      transition: background 0.15s;
    }
    .lk-hud-btn:hover { background: rgba(255,255,255,0.35); }
    .lk-hud-btn-cancel { background: #ef4444; border-color: #f87171; }
    .lk-hud-btn-cancel:hover { background: #dc2626; }
  `;
  shadowRoot.appendChild(styleEl);

  let currentTooltip = null;
  let currentModal = null;
  let activePracticeChar = null;
  let snippingContainer = null;

  // Extract CJK characters
  function extractKanji(text) {
    if (!text) return [];
    const matches = text.match(/[\u4e00-\u9faf]/gu) || [];
    return [...new Set(matches)];
  }

  // TTS Speech
  function speakJapanese(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  // Handle Text Selection Tooltip
  document.addEventListener('mouseup', (e) => {
    if (snippingContainer) return;
    if (e.target && e.target.closest && e.target.closest('#luyen-kanji-root')) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';

      if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
      }

      if (text && extractKanji(text).length > 0) {
        updateHostStyle(true);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const btn = document.createElement('div');
        btn.className = 'lk-tooltip-btn';
        btn.innerHTML = `
          <span>⛩️</span>
          <span>Tra Kanji (${extractKanji(text).length})</span>
        `;
        btn.style.left = `${window.scrollX + rect.left + (rect.width / 2) - 60}px`;
        btn.style.top = `${window.scrollY + rect.top - 42}px`;

        btn.onclick = (evt) => {
          evt.stopPropagation();
          openModal(text);
          btn.remove();
          currentTooltip = null;
        };

        shadowRoot.appendChild(btn);
        currentTooltip = btn;
      }
    }, 10);
  });

  // SCREEN SNIPPING OCR MODULE - ACTIVATES IMMEDIATELY
  function startScreenSnipping(imageUri) {
    updateHostStyle(true);
    if (snippingContainer) snippingContainer.remove();

    const container = document.createElement('div');
    container.className = 'lk-snipping-layer';

    const canvas = document.createElement('canvas');
    canvas.className = 'lk-snipping-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    container.appendChild(canvas);

    const hud = document.createElement('div');
    hud.className = 'lk-snipping-hud';
    hud.innerHTML = `
      <span>📸 <strong>Kéo chuột để khoanh vùng Kanji</strong></span>
      <span style="opacity: 0.5;">|</span>
      <button class="lk-hud-btn" id="lk-hud-scan-all">⚡ Quét nhanh trang</button>
      <button class="lk-hud-btn lk-hud-btn-cancel" id="lk-hud-cancel">✕ Hủy (Esc)</button>
    `;
    container.appendChild(hud);

    shadowRoot.appendChild(container);
    snippingContainer = container;

    const ctx = canvas.getContext('2d');
    let bgImg = null;
    if (imageUri) {
      bgImg = new Image();
      bgImg.src = imageUri;
    }

    let isSelecting = false;
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;

    function renderSelection() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark background overlay mask
      ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isSelecting) {
        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const w = Math.abs(currentX - startX);
        const h = Math.abs(currentY - startY);

        // Clear transparent cutout window
        ctx.clearRect(x, y, w, h);

        // Bright teal selection boundary
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, w, h);

        // Dimension badge
        const badgeY = y - 24 > 0 ? y - 24 : y + h + 6;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, badgeY, 96, 20);
        ctx.fillStyle = '#2dd4bf';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${Math.round(w)} × ${Math.round(h)} px`, x + 6, badgeY + 14);
      }
    }

    // 1. Gọi renderSelection() NGAY LẬP TỨC để hiển thị lớp phủ đen mờ & HUD không có độ trễ
    renderSelection();

    // 2. Event listener bgImg.onload đóng vai trò cập nhật lại canvas sau khi ảnh Base64 nạp xong
    if (bgImg) {
      bgImg.onload = () => {
        renderSelection();
      };
    }

    const handleMouseDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('.lk-snipping-hud')) return;

      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      currentX = startX;
      currentY = startY;
      renderSelection();
    };

    const handleMouseMove = (e) => {
      if (!isSelecting) return;
      currentX = e.clientX;
      currentY = e.clientY;
      renderSelection();
    };

    const handleMouseUp = (e) => {
      if (!isSelecting) return;
      isSelecting = false;

      const cropX = Math.min(startX, currentX);
      const cropY = Math.min(startY, currentY);
      const cropW = Math.abs(currentX - startX);
      const cropH = Math.abs(currentY - startY);

      cleanup();

      if (cropW >= 8 && cropH >= 8) {
        processSnippedArea(bgImg, cropX, cropY, cropW, cropH);
      } else {
        // Point click: only inspect the primary leaf element directly under the cursor
        const elements = document.elementsFromPoint(cropX, cropY);
        let foundKanjis = [];
        for (const el of elements) {
          if (el.id === 'luyen-kanji-root') continue;
          // Skip high-level structural containers
          const tag = el.tagName ? el.tagName.toLowerCase() : '';
          if (['body', 'html', 'main', 'section', 'article', 'div'].includes(tag) && el.children.length > 2) {
            continue;
          }
          const text = el.innerText || el.textContent || '';
          const kanjis = extractKanji(text);
          if (kanjis.length > 0) {
            foundKanjis = kanjis;
            break; // Stop at deepest element matching Kanji
          }
        }
        if (foundKanjis.length > 0) {
          openModal(foundKanjis.join(''));
        } else {
          openModal('');
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') cleanup();
    };

    function cleanup() {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (snippingContainer) {
        snippingContainer.remove();
        snippingContainer = null;
      }
      if (!currentModal) {
        updateHostStyle(false);
      }
    }

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    hud.querySelector('#lk-hud-cancel').onclick = (e) => {
      e.stopPropagation();
      cleanup();
    };

    hud.querySelector('#lk-hud-scan-all').onclick = (e) => {
      e.stopPropagation();
      cleanup();
      // Scan main page elements cleanly
      const mainEl = document.querySelector('main, article, #content, .content, body');
      const allText = mainEl ? mainEl.innerText : '';
      const kanjis = extractKanji(allText);
      if (kanjis.length > 0) {
        openModal(kanjis.slice(0, 30).join(''));
      } else {
        openModal('');
      }
    };
  }

  // Crop image and extract Kanji from precise bounding rect
  function processSnippedArea(img, x, y, w, h) {
    let croppedDataUrl = null;

    if (img && img.complete && img.naturalWidth > 0) {
      try {
        const dpr = window.devicePixelRatio || 1;
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = w;
        cropCanvas.height = h;
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(
          img,
          x * dpr, y * dpr, w * dpr, h * dpr,
          0, 0, w, h
        );
        croppedDataUrl = cropCanvas.toDataURL('image/png');
      } catch (err) {
        console.warn("Lỗi crop canvas:", err);
      }
    }

    let detectedChars = [];

    // Precise DOM element extraction: find leaf text elements strictly inside selection box
    const allElements = document.querySelectorAll('body *:not(#luyen-kanji-root)');
    allElements.forEach((el) => {
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (['script', 'style', 'svg', 'path', 'iframe'].includes(tag)) return;

      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Calculate intersection overlap area
        const overlapX = Math.max(0, Math.min(x + w, rect.right) - Math.max(x, rect.left));
        const overlapY = Math.max(0, Math.min(y + h, rect.bottom) - Math.max(y, rect.top));

        // Must overlap significantly and be a leaf node (no large child elements)
        if (overlapX > 3 && overlapY > 3) {
          const isLeafNode = Array.from(el.children).every(
            (child) => ['span', 'a', 'b', 'i', 'ruby', 'rt', 'sub', 'sup'].includes(child.tagName.toLowerCase())
          );
          if (isLeafNode) {
            const text = el.innerText || el.textContent || '';
            const kanjis = extractKanji(text);
            if (kanjis.length > 0) {
              detectedChars.push(...kanjis);
            }
          }
        }
      }
    });

    detectedChars = [...new Set(detectedChars)];
    const detectedString = detectedChars.join('');

    openModal(detectedString, croppedDataUrl);
  }

  // Render Draggable Kanji Modal with Search Bar & OCR preview
  function openModal(initialText, croppedImgUrl = null) {
    updateHostStyle(true);
    if (currentModal) currentModal.remove();

    let currentText = initialText || '';
    let kanjis = extractKanji(currentText);

    const overlay = document.createElement('div');
    overlay.className = 'lk-overlay';

    overlay.innerHTML = `
      <div class="lk-card" id="lk-card-element">
        <div class="lk-header" id="lk-header-drag" title="Kéo thả để di chuyển cửa sổ modal">
          <h3>
            <span style="opacity: 0.6; font-size: 14px;">⠿</span>
            <span>⛩️ Luyện Kanji - Tra Cứu & Quét Ảnh Chữ Hán</span>
          </h3>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="lk-btn lk-btn-primary" id="lk-top-snip" title="Khoanh vùng quét ảnh mới">📸 Khoanh vùng quét</button>
            <button class="lk-btn" id="lk-close-modal">✕ Đóng</button>
          </div>
        </div>

        <!-- Top Search Bar -->
        <div class="lk-modal-search-row">
          <input type="text" id="lk-modal-search-input" class="lk-modal-search-input" placeholder="Nhập chữ Hán, câu văn tiếng Nhật cần tra..." value="${currentText}">
          <button class="lk-btn lk-btn-dark" id="lk-modal-search-btn">Tra cứu</button>
        </div>

        <div class="lk-body" id="lk-modal-content">
          <!-- Dynamic Content -->
        </div>

        <!-- Footer Bar with Web App Direct Link -->
        <div class="lk-footer-bar">
          <div style="color: #64748b;">
            Tìm thấy <strong style="color: #0d9488;" id="lk-kanji-count">${kanjis.length}</strong> chữ Hán
          </div>
          <button class="lk-btn lk-btn-primary" id="lk-open-webapp-btn">
            🌐 Mở trên Web App Luyện Kanji ↗
          </button>
        </div>
      </div>
    `;

    shadowRoot.appendChild(overlay);
    currentModal = overlay;

    const cardEl = overlay.querySelector('#lk-card-element');
    const headerEl = overlay.querySelector('#lk-header-drag');
    const searchInput = overlay.querySelector('#lk-modal-search-input');
    const searchBtn = overlay.querySelector('#lk-modal-search-btn');
    const topSnipBtn = overlay.querySelector('#lk-top-snip');
    const openWebAppBtn = overlay.querySelector('#lk-open-webapp-btn');

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
      cardEl.style.left = `${initialLeft}px`;
      cardEl.style.top = `${initialTop}px`;
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = Math.max(10, Math.min(window.innerWidth - cardEl.offsetWidth - 10, initialLeft + dx));
      let newTop = Math.max(10, Math.min(window.innerHeight - 80, initialTop + dy));
      cardEl.style.left = `${newLeft}px`;
      cardEl.style.top = `${newTop}px`;
    };

    const handleMouseUp = () => { isDragging = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const closeModal = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      overlay.remove();
      currentModal = null;
      updateHostStyle(false);
    };

    overlay.querySelector('#lk-close-modal').onclick = closeModal;
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    const doSearch = () => {
      currentText = searchInput.value.trim();
      kanjis = extractKanji(currentText);
      const countEl = overlay.querySelector('#lk-kanji-count');
      if (countEl) countEl.textContent = kanjis.length;
      renderMainKanjiList(currentText, kanjis, null);
    };

    searchBtn.onclick = doSearch;
    searchInput.onkeypress = (e) => { if (e.key === 'Enter') doSearch(); };

    topSnipBtn.onclick = () => {
      closeModal();
      startScreenSnipping(null);
    };

    openWebAppBtn.onclick = () => {
      const url = `${TARGET_WEB_APP_URL}/?text=${encodeURIComponent(currentText)}`;
      window.open(url, '_blank');
    };

    renderMainKanjiList(currentText, kanjis, croppedImgUrl);
  }

  function renderMainKanjiList(rawText, kanjis, croppedImgUrl) {
    const container = currentModal.querySelector('#lk-modal-content');
    if (!container) return;

    let bannerHtml = '';
    if (croppedImgUrl) {
      bannerHtml = `
        <div class="lk-ocr-banner">
          <img src="${croppedImgUrl}" class="lk-ocr-thumb" alt="Vùng ảnh vừa chụp" />
          <div style="flex: 1; font-size: 12px; color: #166534;">
            <strong>Ảnh chụp màn hình:</strong> Đã quét và trích xuất thành công <strong>${kanjis.length}</strong> chữ Hán.
          </div>
        </div>
      `;
    }

    if (kanjis.length === 0) {
      container.innerHTML = bannerHtml + `
        <div style="text-align:center; padding: 36px 20px; color: #64748b;">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          <div style="font-size: 14px; font-weight: 700; color: #334155;">Không tìm thấy chữ Kanji nào</div>
          <p style="font-size: 12px; margin-top: 4px;">Hãy nhập chữ Hán vào ô tìm kiếm ở trên hoặc bấm nút "📸 Khoanh vùng quét" để quét lại.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = bannerHtml + kanjis.map((k, idx) => {
      const info = getKanjiDetails(k);

      const onyomiStr = Array.isArray(info.onyomi) ? info.onyomi.join(', ') : info.onyomi;
      const kunyomiStr = Array.isArray(info.kunyomi) ? info.kunyomi.join(', ') : info.kunyomi;

      return `
        <div class="lk-kanji-card">
          <div class="lk-kanji-col1">
            <div style="display:flex; gap:4px; align-items:center; margin-bottom:2px;">
              <span class="lk-stt-badge">#${idx + 1}</span>
              <span class="lk-jlpt-badge">${info.jlpt}</span>
            </div>
            <div class="lk-kanji-big">${k}</div>
            <div class="lk-hanviet-badge">${info.hanviet}</div>
            <a class="lk-mazii-link" href="https://mazii.net/vi-VN/search/kanji/${encodeURIComponent(k)}" target="_blank">Mazii ↗</a>
          </div>

          <div class="lk-kanji-col2 lk-btn-open-practice" data-char="${k}">
            ${k}
          </div>

          <div class="lk-kanji-col3">
            <div class="lk-badge-row">
              <span class="lk-pill">${info.strokeCount} nét</span>
              <span class="lk-pill">Bộ: ${info.radical}</span>
            </div>

            <div class="lk-badge-row">
              <span class="lk-pill lk-pill-on">On: ${onyomiStr}</span>
              <span class="lk-pill lk-pill-kun">Kun: ${kunyomiStr}</span>
            </div>

            <div class="lk-meaning">
              <strong>Nghĩa:</strong> ${info.meaning}
            </div>

            <div class="lk-btn-row">
              <button class="lk-btn lk-btn-speak" data-text="${k}">🔊 Phát âm</button>
              <button class="lk-btn lk-btn-primary lk-btn-open-practice" data-char="${k}">✍️ Xem nét & Luyện viết</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.lk-btn-speak').forEach(btn => {
      btn.onclick = () => speakJapanese(btn.dataset.text);
    });

    container.querySelectorAll('.lk-btn-open-practice').forEach(btn => {
      btn.onclick = () => openPracticeModal(btn.dataset.char, rawText, kanjis);
    });
  }

  // Open Practice Detail
  function openPracticeModal(char, rawText, kanjis) {
    activePracticeChar = char;
    const info = getKanjiDetails(char);

    const container = currentModal.querySelector('#lk-modal-content');
    if (!container) return;

    container.innerHTML = `
      <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <button class="lk-btn" id="lk-back-to-list">← Quay lại danh sách (${kanjis.length} Kanji)</button>
        <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
          Chữ <span style="font-size: 22px; color: #0d9488;">${char}</span> (${info.hanviet})
        </div>
      </div>

      <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="width: 220px; height: 220px; margin: 0 auto; background: #ffffff; border: 2px solid #cbd5e1; border-radius: 16px; display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="font-size: 140px; font-weight: 900; color: #0f766e; font-family: 'Noto Sans JP', sans-serif;">${char}</div>
        </div>
        <div style="margin-top: 14px; display: flex; gap: 8px; justify-content: center;">
          <button class="lk-btn lk-btn-primary" id="lk-speak-char">🔊 Phát âm [${char}]</button>
          <a class="lk-btn" href="${TARGET_WEB_APP_URL}/?text=${encodeURIComponent(char)}" target="_blank">🌐 Mở tập viết trên Web App ↗</a>
        </div>
      </div>
    `;

    container.querySelector('#lk-back-to-list').onclick = () => {
      renderMainKanjiList(rawText, kanjis, null);
    };

    container.querySelector('#lk-speak-char').onclick = () => speakJapanese(char);
  }

  // Expose global trigger functions for re-injected contexts
  window.__LUYEN_KANJI_START_SNIP__ = startScreenSnipping;
  window.__LUYEN_KANJI_OPEN_MODAL__ = openModal;

  // Listen to messages from background service worker or popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
      if (req.action === "START_SCREEN_SNIP" || req.action === "ACTIVATE_SNIP_MODE") {
        startScreenSnipping(req.imageUri || null);
        sendResponse({ success: true });
        return true;
      } else if (req.action === "OPEN_KANJI_MODAL" && req.text) {
        openModal(req.text);
        sendResponse({ success: true });
        return true;
      }
    });
  }
})();
