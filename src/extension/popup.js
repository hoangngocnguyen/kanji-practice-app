document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('quick-search-input');
  const searchBtn = document.getElementById('quick-search-btn');
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

  // Search Action
  function triggerSearch() {
    const text = searchInput.value.trim();
    if (!text) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "OPEN_KANJI_MODAL",
          text: text
        });
        window.close();
      }
    });
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
