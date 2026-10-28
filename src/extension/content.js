/**
 * Luyện Kanji - Content Script with Shadow DOM Isolation & Full Web-Matched Modal UI
 */
(function () {
  if (window.__LUYEN_KANJI_CONTENT_LOADED__) return;
  window.__LUYEN_KANJI_CONTENT_LOADED__ = true;

  // Embedded Kanji Database for instant lookup offline
  const KANJI_DICTIONARY = {
    '日': { hanviet: 'NHẬT', onyomi: ['ニチ', 'ジツ'], kunyomi: ['ひ', '-び', '-か'], jlpt: 'N5', strokeCount: 4, meaning: 'Mặt trời, ngày, Nhật Bản', radical: '日 (Nhật)', components: ['日'] },
    '本': { hanviet: 'BẢN / BỔN', onyomi: ['ホン'], kunyomi: ['moto'], jlpt: 'N5', strokeCount: 5, meaning: 'Gốc, rễ, sách, bản ngã', radical: '木 (Mộc)', components: ['木', '一'] },
    '語': { hanviet: 'NGỮ', onyomi: ['ゴ'], kunyomi: ['kata.ru'], jlpt: 'N5', strokeCount: 14, meaning: 'Ngôn ngữ, từ ngữ, nói chuyện', radical: '言 (Ngôn)', components: ['言', '五', '口'] },
    '学': { hanviet: 'HỌC', onyomi: ['ガク'], kunyomi: ['mana.bu'], jlpt: 'N5', strokeCount: 8, meaning: 'Học tập, trường học, học vấn', radical: '子 (Tử)', components: ['冖', '子'] },
    '校': { hanviet: 'HIỆU', onyomi: ['コウ'], kunyomi: [], jlpt: 'N5', strokeCount: 10, meaning: 'Trường học, so sánh, sửa chữa', radical: '木 (Mộc)', components: ['木', '交'] },
    '人': { hanviet: 'NHÂN', onyomi: ['ジン', 'ニン'], kunyomi: ['hito'], jlpt: 'N5', strokeCount: 2, meaning: 'Con người, nhân sự', radical: '人 (Nhân)', components: ['人'] },
    '時': { hanviet: 'THỜI', onyomi: ['ジ'], kunyomi: ['toki'], jlpt: 'N5', strokeCount: 10, meaning: 'Thời gian, giờ, lúc', radical: '日 (Nhật)', components: ['日', '寺'] },
    '間': { hanviet: 'GIAN', onyomi: ['カン', 'ケン'], kunyomi: ['aida', 'ma'], jlpt: 'N5', strokeCount: 12, meaning: 'Khoảng cách, giữa, không gian', radical: '門 (Môn)', components: ['門', '日'] },
    '新': { hanviet: 'TÂN', onyomi: ['シン'], kunyomi: ['atara.shii', 'ara.ta'], jlpt: 'N5', strokeCount: 13, meaning: 'Mới, tươi mới, Tân Văn', radical: '斤 (Cân)', components: ['立', '木', '斤'] },
    '聞': { hanviet: 'VĂN', onyomi: ['ブン', 'モン'], kunyomi: ['ki.ku'], jlpt: 'N5', strokeCount: 14, meaning: 'Nghe, tin tức, văn minh', radical: '耳 (Nhĩ)', components: ['門', '耳'] },
    '車': { hanviet: 'XA', onyomi: ['シャ'], kunyomi: ['kuruma'], jlpt: 'N5', strokeCount: 7, meaning: 'Xe cộ, bánh xe', radical: '車 (Xa)', components: ['車'] },
    '電': { hanviet: 'ĐIỆN', onyomi: ['デン'], kunyomi: [], jlpt: 'N5', strokeCount: 13, meaning: 'Điện, chớp, điện thoại', radical: '雨 (Vũ)', components: ['雨', '申'] },
    '食': { hanviet: 'THỰC', onyomi: ['ショク', 'ジキ'], kunyomi: ['ta.beru', 'ku.u'], jlpt: 'N5', strokeCount: 9, meaning: 'Ăn, thức ăn, món ăn', radical: '食 (Thực)', components: ['人', '良'] },
    '飲': { hanviet: 'ẨM', onyomi: ['イン'], kunyomi: ['no.mu'], jlpt: 'N5', strokeCount: 12, meaning: 'Uống, thức uống', radical: '食 (Thực)', components: ['食', '欠'] },
    '行': { hanviet: 'HÀNH / HÀNG', onyomi: ['コウ', 'ギョウ'], kunyomi: ['i.ku', 'yu.ku', 'oko.nau'], jlpt: 'N5', strokeCount: 6, meaning: 'Đi, tiến hành, hàng lối', radical: '行 (Hành)', components: ['彳', '亍'] },
    '来': { hanviet: 'LAI', onyomi: ['ライ'], kunyomi: ['ku.ru', 'ki.tasu'], jlpt: 'N5', strokeCount: 7, meaning: 'Đến, tương lai, lai khách', radical: '木 (Mộc)', components: ['一', '米'] },
    '生': { hanviet: 'SINH', onyomi: ['セイ', 'ショウ'], kunyomi: ['i.kiru', 'u.maru', 'na.ma'], jlpt: 'N5', strokeCount: 5, meaning: 'Sống, sinh sản, tươi sống', radical: '生 (Sinh)', components: ['生'] },
    '先': { hanviet: 'TIÊN', onyomi: ['セン'], kunyomi: ['saki'], jlpt: 'N5', strokeCount: 6, meaning: 'Trước, tiên tiến, đầu tiên', radical: '儿 (Nhi)', components: ['牛', '儿'] },
    '私': { hanviet: 'TƯ', onyomi: ['シ'], kunyomi: ['watashi', 'watakushi'], jlpt: 'N5', strokeCount: 7, meaning: 'Tôi, riêng tư, tư nhân', radical: '禾 (Hòa)', components: ['禾', 'ム'] },
    '友': { hanviet: 'HỮU', onyomi: ['ユウ'], kunyomi: ['tomo'], jlpt: 'N5', strokeCount: 4, meaning: 'Bạn bè, thân hữu', radical: '又 (Hựu)', components: ['ナ', '又'] },
    '愛': { hanviet: 'ÁI', onyomi: ['アイ'], kunyomi: ['aito.su'], jlpt: 'N3', strokeCount: 13, meaning: 'Yêu thương, ái tình', radical: '心 (Tâm)', components: ['爪', '冖', '心', '夂'] },
    '道': { hanviet: 'ĐẠO', onyomi: ['ドウ', 'TOU'], kunyomi: ['michi'], jlpt: 'N4', strokeCount: 12, meaning: 'Con đường, đạo đức, phương pháp', radical: '辵 (Sước)', components: ['首', '辶'] }
  };

  // Shadow DOM Container Setup
  let hostDiv = document.getElementById('luyen-kanji-root');
  if (!hostDiv) {
    hostDiv = document.createElement('div');
    hostDiv.id = 'luyen-kanji-root';
    document.body.appendChild(hostDiv);
  }
  const shadowRoot = hostDiv.attachShadow({ mode: 'open' });

  // Inject CSS styles matching web app theme
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
    }
    .lk-tooltip-btn:hover { background: #0f766e; transform: translateY(-2px); }

    .lk-overlay {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      z-index: 2147483646;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
    }

    .lk-card {
      position: fixed;
      top: 60px;
      left: calc(50vw - 380px);
      width: 100%; max-width: 760px; max-height: 88vh;
      background: #ffffff; border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);
      display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid #cbd5e1;
      user-select: none;
    }

    .lk-header {
      padding: 14px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
      display: flex; align-items: center; justify-content: space-between;
      cursor: grab;
    }
    .lk-header:active { cursor: grabbing; }
    .lk-header h3 { font-size: 16px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; }

    .lk-body { padding: 20px; overflow-y: auto; flex: 1; user-select: text; }

    /* Web App Style Kanji List Card */
    .lk-kanji-card {
      display: flex; gap: 16px; background: #ffffff; padding: 16px;
      border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 14px;
      align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      transition: all 0.15s ease;
    }
    .lk-kanji-card:hover { border-color: #0d9488; }

    .lk-kanji-col1 {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-width: 90px; flex-shrink: 0; text-align: center;
    }
    .lk-stt-badge { font-family: monospace; font-size: 12px; font-weight: 700; color: #0f766e; }
    .lk-jlpt-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #ccfbf1; color: #115e59; border: 1px solid #99f6e4; }
    .lk-kanji-big { font-size: 42px; font-weight: 900; color: #0f172a; margin: 2px 0; font-family: "Noto Sans JP", sans-serif; }
    .lk-hanviet-badge { font-size: 12px; font-weight: 700; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 6px; margin-bottom: 4px; }
    .lk-mazii-link { font-size: 11px; color: #94a3b8; text-decoration: none; font-weight: 500; }
    .lk-mazii-link:hover { color: #0f766e; text-decoration: underline; }

    .lk-kanji-col2 {
      width: 88px; height: 88px; background: #f8fafc; border: 2px solid #e2e8f0;
      border-radius: 16px; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; cursor: pointer; position: relative; overflow: hidden;
      font-size: 48px; font-weight: 900; color: #0f766e;
    }
    .lk-kanji-col2:hover { border-color: #0d9488; }
    .lk-kanji-col2::after {
      content: "▶ Xem nét"; position: absolute; inset: 0; background: rgba(15, 23, 42, 0.75);
      color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center;
      justify-content: center; opacity: 0; transition: opacity 0.15s ease;
    }
    .lk-kanji-col2:hover::after { opacity: 1; }

    .lk-kanji-col3 { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }

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

    /* Practice Modal Inner UI with 4 Tabs */
    .lk-practice-subtabs {
      display: flex; background: #f1f5f9; border-bottom: 1px solid #e2e8f0;
      padding: 0 16px; gap: 4px; margin-bottom: 16px; border-radius: 12px;
    }
    .lk-subtab {
      padding: 10px 14px; font-size: 12px; font-weight: 700; color: #64748b;
      border: none; background: transparent; cursor: pointer; border-bottom: 2px solid transparent;
    }
    .lk-subtab.active { color: #0f766e; border-bottom-color: #0f766e; background: #ffffff; }

    .lk-canvas-wrap {
      display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 10px;
    }
    .lk-anim-char {
      font-size: 160px;
      font-family: "Noto Sans JP", sans-serif;
      color: #0f766e;
      font-weight: 900;
      line-height: 1;
    }
    canvas { border: 2px dashed #cbd5e1; border-radius: 16px; background: #ffffff; cursor: crosshair; }
  `;
  shadowRoot.appendChild(styleEl);

  let currentTooltip = null;
  let currentModal = null;
  let activePracticeChar = null;
  let activePracticeTab = 'animation';

  // Helper: Extract Kanji strictly matching Han script characters
  function extractKanji(text) {
    if (!text) return [];
    const matches = text.match(/\p{Script=Han}/gu) || [];
    return [...new Set(matches)];
  }

  // Handle Text Selection
  document.addEventListener('mouseup', (e) => {
    if (e.target && e.target.closest && e.target.closest('#luyen-kanji-root')) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';

      if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
      }

      if (text && extractKanji(text).length > 0) {
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

  // TTS Speech
  function speakJapanese(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  // Render Draggable Kanji Modal matching Web App Style
  function openModal(text) {
    if (currentModal) currentModal.remove();

    const kanjis = extractKanji(text);
    activePracticeChar = null;

    const overlay = document.createElement('div');
    overlay.className = 'lk-overlay';

    overlay.innerHTML = `
      <div class="lk-card" id="lk-card-element">
        <div class="lk-header" id="lk-header-drag" title="Kéo thả để di chuyển cửa sổ modal">
          <h3>
            <span style="opacity: 0.6; font-size: 16px;">⠿</span>
            <span>⛩️ Luyện Kanji - Phân Tích Văn Bản (${kanjis.length} chữ Hán)</span>
          </h3>
          <button class="lk-btn" id="lk-close-modal">✕ Đóng</button>
        </div>
        <div class="lk-body" id="lk-modal-content">
          <!-- Dynamic Content -->
        </div>
      </div>
    `;

    shadowRoot.appendChild(overlay);
    currentModal = overlay;

    const cardEl = overlay.querySelector('#lk-card-element');
    const headerEl = overlay.querySelector('#lk-header-drag');

    // Make modal card draggable around viewport
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

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = window.innerWidth - cardEl.offsetWidth - 10;
      const maxTop = window.innerHeight - 80;

      newLeft = Math.max(10, Math.min(maxLeft, newLeft));
      newTop = Math.max(10, Math.min(maxTop, newTop));

      cardEl.style.left = `${newLeft}px`;
      cardEl.style.top = `${newTop}px`;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const closeModal = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      overlay.remove();
      currentModal = null;
    };

    overlay.querySelector('#lk-close-modal').onclick = closeModal;
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
      container.innerHTML = `<div style="text-align:center; padding: 30px; color: #64748b;">Không tìm thấy chữ Kanji nào trong đoạn văn đã chọn.</div>`;
      return;
    }

    container.innerHTML = kanjis.map((k, idx) => {
      const info = KANJI_DICTIONARY[k] || {
        hanviet: 'HÁN VIỆT',
        onyomi: ['-'], kunyomi: ['-'],
        jlpt: 'N3', strokeCount: 5,
        meaning: `Chữ Kanji ${k}`, radical: 'Bộ thủ', components: [k]
      };

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
              <button class="lk-btn lk-btn-primary lk-btn-open-practice" data-char="${k}">✍️ Luyện nét</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.lk-btn-speak').forEach(btn => {
      btn.onclick = () => speakJapanese(btn.dataset.text);
    });

    container.querySelectorAll('.lk-btn-open-practice').forEach(btn => {
      btn.onclick = () => {
        openPracticeModal(btn.dataset.char, rawText, kanjis);
      };
    });
  }

  // Open Full 4-Tab Practice Modal matching Image 3 & Web App PracticeModal
  function openPracticeModal(char, rawText, kanjis) {
    activePracticeChar = char;
    activePracticeTab = 'animation';
    const info = KANJI_DICTIONARY[char] || {
      hanviet: 'HÁN VIỆT', onyomi: ['-'], kunyomi: ['-'], jlpt: 'N3', strokeCount: 5, meaning: `Chữ ${char}`, radical: 'Bộ thủ'
    };

    const container = currentModal.querySelector('#lk-modal-content');
    if (!container) return;

    renderPracticeContent(container, char, info, rawText, kanjis);
  }

  function renderPracticeContent(container, char, info, rawText, kanjis) {
    container.innerHTML = `
      <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <button class="lk-btn" id="lk-back-to-list">← Quay lại danh sách (${kanjis.length} Kanji)</button>
        <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
          Chữ <span style="font-size: 20px; color: #0d9488;">${char}</span> (${info.hanviet})
        </div>
      </div>

      <div class="lk-practice-subtabs">
        <button class="lk-subtab ${activePracticeTab === 'animation' ? 'active' : ''}" data-subtab="animation">🎬 Hoạt ảnh nét vẽ</button>
        <button class="lk-subtab ${activePracticeTab === 'dictionary' ? 'active' : ''}" data-subtab="dictionary">📖 Nghĩa & Từ ghép</button>
        <button class="lk-subtab ${activePracticeTab === 'radicals' ? 'active' : ''}" data-subtab="radicals">🗂️ Bộ thủ & Mẹo nhớ</button>
        <button class="lk-subtab ${activePracticeTab === 'practice' ? 'active' : ''}" data-subtab="practice">✍️ Tập viết tay</button>
      </div>

      <div id="lk-subtab-body"></div>
    `;

    container.querySelector('#lk-back-to-list').onclick = () => {
      renderMainKanjiList(rawText, kanjis);
    };

    const subtabs = container.querySelectorAll('.lk-subtab');
    subtabs.forEach(st => {
      st.onclick = () => {
        subtabs.forEach(t => t.classList.remove('active'));
        st.classList.add('active');
        activePracticeTab = st.dataset.subtab;
        renderSubtabBody(container.querySelector('#lk-subtab-body'), char, info);
      };
    });

    renderSubtabBody(container.querySelector('#lk-subtab-body'), char, info);
  }

  function renderSubtabBody(body, char, info) {
    if (!body) return;

    if (activePracticeTab === 'animation') {
      body.innerHTML = `
        <div style="text-align: center; padding: 10px;">
          <div style="width: 260px; height: 260px; margin: 0 auto; background: #ffffff; border: 2px solid #e2e8f0; border-radius: 16px; display: flex; align-items: center; justify-content: center; position: relative;">
            <div class="lk-anim-char">${char}</div>
          </div>
          <div style="margin-top: 14px; display: flex; gap: 8px; justify-content: center;">
            <button class="lk-btn lk-btn-primary" id="lk-anim-play">▶ Phát hoạt ảnh</button>
            <button class="lk-btn" id="lk-anim-speak">🔊 Phát âm</button>
          </div>
        </div>
      `;
      body.querySelector('#lk-anim-speak').onclick = () => speakJapanese(char);
      body.querySelector('#lk-anim-play').onclick = () => speakJapanese(char);

    } else if (activePracticeTab === 'dictionary') {
      const onyomiStr = Array.isArray(info.onyomi) ? info.onyomi.join(', ') : info.onyomi;
      const kunyomiStr = Array.isArray(info.kunyomi) ? info.kunyomi.join(', ') : info.kunyomi;

      body.innerHTML = `
        <div style="background: #f8fafc; p-4; border-radius: 14px; border: 1px solid #e2e8f0; padding: 16px; space-y: 10px;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
            Hán-Việt: <span style="color: #0d9488;">${info.hanviet}</span>
          </div>
          <div style="font-size: 13px; color: #334155; margin-bottom: 6px;">
            <strong>Âm On:</strong> ${onyomiStr} | <strong>Âm Kun:</strong> ${kunyomiStr}
          </div>
          <div style="font-size: 13px; color: #334155; margin-bottom: 12px;">
            <strong>Ý nghĩa:</strong> ${info.meaning}
          </div>
          <div style="font-size: 12px; color: #64748b;">
            Bộ thủ chính: <strong>${info.radical}</strong> (${info.strokeCount} nét)
          </div>
        </div>
      `;

    } else if (activePracticeTab === 'radicals') {
      body.innerHTML = `
        <div style="background: #f8fafc; padding: 16px; border-radius: 14px; border: 1px solid #e2e8f0;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Phân bóc bộ thủ cấu thành:</div>
          <div style="font-size: 15px; font-weight: 700; color: #0d9488; margin-bottom: 10px;">
            Bộ thủ: ${info.radical}
          </div>
          <div style="font-size: 12px; color: #475569; line-height: 1.5;">
            Chữ Kanji <strong>${char}</strong> thuộc bộ <strong>${info.radical}</strong>, gồm <strong>${info.strokeCount}</strong> nét vẽ tiêu chuẩn.
          </div>
        </div>
      `;

    } else if (activePracticeTab === 'practice') {
      body.innerHTML = `
        <div style="text-align: center;">
          <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Vẽ đè lên khung hướng dẫn nét mờ màu xám đơn sắc bên dưới:</p>
          <div class="lk-canvas-wrap">
            <canvas id="lk-practice-canvas" width="260" height="260"></canvas>
            <div style="display: flex; gap: 10px;">
              <button class="lk-btn" id="lk-clear-practice">🔄 Xóa nét vẽ</button>
              <button class="lk-btn lk-btn-primary" id="lk-speak-practice">🔊 Phát âm</button>
            </div>
          </div>
        </div>
      `;

      setupPracticeCanvas(body.querySelector('#lk-practice-canvas'), char);
      body.querySelector('#lk-speak-practice').onclick = () => speakJapanese(char);
    }
  }

  // Setup Canvas for Writing Practice
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

      ctx.font = '180px "Noto Sans JP", "Hiragino Sans", sans-serif';
      ctx.fillStyle = '#cbd5e1'; // Solid clean light gray
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

  // Listen to messages from extension background
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((req) => {
      if (req.action === "OPEN_KANJI_MODAL" && req.text) {
        openModal(req.text);
      }
    });
  }
})();
