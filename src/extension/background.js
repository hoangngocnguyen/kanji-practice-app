// Luyện Kanji - Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menu for selected Japanese text
  chrome.contextMenus.create({
    id: "luyen-kanji-analyze",
    title: "Phân tích Kanji '%s' với Luyện Kanji",
    contexts: ["selection"]
  });

  console.log("Tiện ích Luyện Kanji đã được cài đặt thành công.");
});

// Handle Context Menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "luyen-kanji-analyze" && info.selectionText && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: "OPEN_KANJI_MODAL",
      text: info.selectionText
    }).catch(err => {
      console.warn("Lỗi gửi message tới content script:", err);
    });
  }
});

// Handle proxy API calls or settings sync if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_CONFIG") {
    chrome.storage.sync.get({
      enableFloatingTooltip: true,
      autoSpeech: false,
      ankiHost: "http://127.0.0.1:8765"
    }, (items) => {
      sendResponse(items);
    });
    return true; // async response
  }
});
