document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('quick-search-input');
  const searchBtn = document.getElementById('quick-search-btn');
  const snipBtn = document.getElementById('btn-snip-capture');
  const uploadBtn = document.getElementById('btn-upload-image');
  const fileInput = document.getElementById('popup-file-input');
  const tooltipToggle = document.getElementById('toggle-tooltip');
  const autoSpeechToggle = document.getElementById('toggle-autospeech');
  const openWebLink = document.getElementById('open-web-app');

  // Load saved settings
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get({
      enableFloatingTooltip: true,
      autoSpeech: false
    }, (items) => {
      if (tooltipToggle) tooltipToggle.checked = items.enableFloatingTooltip;
      if (autoSpeechToggle) autoSpeechToggle.checked = items.autoSpeech;
    });
  }

  // Save settings on toggle
  if (tooltipToggle) {
    tooltipToggle.addEventListener('change', () => {
      if (chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ enableFloatingTooltip: tooltipToggle.checked });
      }
    });
  }

  if (autoSpeechToggle) {
    autoSpeechToggle.addEventListener('change', () => {
      if (chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ autoSpeech: autoSpeechToggle.checked });
      }
    });
  }

  // Snipping Screen Capture Action: Send fire-and-forget message to Background Service Worker
  if (snipBtn) {
    snipBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: "TRIGGER_CAPTURE_SCREEN" });
      window.close();
    });
  }

  // File Upload Action in Popup
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        processImageFileInPopup(file);
      }
    });
  }

  // Paste Image (Ctrl+V) anywhere in Popup
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          processImageFileInPopup(blob);
          break;
        }
      }
    }
  });

  function processImageFileInPopup(fileOrBlob) {
    if (!fileOrBlob) return;
    if (uploadBtn) uploadBtn.innerText = '⌛ Đang đọc ảnh...';

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (!dataUrl) return;

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { action: "START_SCREEN_SNIP_DATA_URL", imageUri: dataUrl }, () => {
            if (chrome.runtime.lastError) {
              chrome.scripting.executeScript({ target: { tabId: tabId }, files: ["content.js"] }, () => {
                chrome.tabs.sendMessage(tabId, { action: "START_SCREEN_SNIP_DATA_URL", imageUri: dataUrl });
                window.close();
              });
            } else {
              window.close();
            }
          });
        }
      });
    };
    reader.readAsDataURL(fileOrBlob);
  }

  // Search Action: Send fire-and-forget message to Background Service Worker
  function triggerSearch() {
    const text = searchInput ? searchInput.value.trim() : '';
    if (!text) return;

    chrome.runtime.sendMessage({ action: "TRIGGER_SEARCH", text: text });
    window.close();
  }

  if (searchBtn) searchBtn.addEventListener('click', triggerSearch);
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') triggerSearch();
    });
  }

  if (openWebLink) {
    openWebLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: "https://luyenkanji.vercel.app" });
    });
  }
});
