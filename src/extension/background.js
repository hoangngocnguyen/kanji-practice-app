// Luyện Kanji - Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  // 1. Context menu for selected text
  chrome.contextMenus.create({
    id: "luyen-kanji-analyze",
    title: "Phân tích Kanji '%s' với Luyện Kanji",
    contexts: ["selection"]
  });

  // 2. Context menu for Screen Snipping OCR
  chrome.contextMenus.create({
    id: "luyen-kanji-snipping",
    title: "📸 Khoanh vùng quét Kanji (Ctrl+Shift+K)",
    contexts: ["all"]
  });

  console.log("Tiện ích Luyện Kanji v2.1.0 Background Service Worker đã sẵn sàng.");
});

// Helper: Check if tab URL is restricted by Chrome security
function isRestrictedUrl(url) {
  if (!url) return true;
  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:") ||
    url.includes("chrome.google.com/webstore") ||
    url.includes("chromewebstore.google.com")
  );
}

// Perform Screen Capture and trigger content script overlay
function handleCaptureRequest(tab) {
  if (!tab || !tab.id) return;

  if (isRestrictedUrl(tab.url)) {
    console.warn("Chrome không cho phép chụp các trang hệ thống/Web Store:", tab.url);
    // Open Web App if restricted internal page
    chrome.tabs.create({ url: "https://luyenkanji.vercel.app" });
    return;
  }

  // 1. Capture visible tab safely
  chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
    const captureErr = chrome.runtime.lastError; // Read to check and silence warning
    const imgUri = captureErr ? null : dataUrl;

    // 2. Send message to content script to show snipping overlay
    chrome.tabs.sendMessage(tab.id, {
      action: "START_SCREEN_SNIP",
      imageUri: imgUri
    }, (response) => {
      const msgErr = chrome.runtime.lastError; // Read to check and silence warning

      // 3. If content script was not injected yet, inject it and re-send
      if (msgErr) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        }, () => {
          const scriptErr = chrome.runtime.lastError; // Read to check
          if (scriptErr) {
            console.warn("Không thể inject content.js:", scriptErr.message);
            return;
          }
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
              action: "START_SCREEN_SNIP",
              imageUri: imgUri
            }, () => {
              const retryErr = chrome.runtime.lastError; // Read to check
            });
          }, 100);
        });
      }
    });
  });
}

// Perform Search request
function handleSearchRequest(tab, text) {
  if (!tab || !tab.id || !text) return;

  if (isRestrictedUrl(tab.url)) {
    chrome.tabs.create({ url: `https://luyenkanji.vercel.app/?text=${encodeURIComponent(text)}` });
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    action: "OPEN_KANJI_MODAL",
    text: text
  }, () => {
    const msgErr = chrome.runtime.lastError;
    if (msgErr) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }, () => {
        const scriptErr = chrome.runtime.lastError;
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, {
            action: "OPEN_KANJI_MODAL",
            text: text
          }, () => {
            const retryErr = chrome.runtime.lastError;
          });
        }, 100);
      });
    }
  });
}

// Listen to Context Menu Clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "luyen-kanji-analyze" && info.selectionText && tab) {
    handleSearchRequest(tab, info.selectionText);
  } else if (info.menuItemId === "luyen-kanji-snipping" && tab) {
    handleCaptureRequest(tab);
  }
});

// Listen to Keyboard Commands (Ctrl+Shift+K)
if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    if (command === "capture-screen-kanji") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) handleCaptureRequest(tabs[0]);
      });
    }
  });
}

// Listen to Messages from Popup or Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "TRIGGER_CAPTURE_SCREEN") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) handleCaptureRequest(tabs[0]);
    });
    sendResponse({ status: "ok" });
    return true;
  }

  if (request.action === "TRIGGER_SEARCH" && request.text) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) handleSearchRequest(tabs[0], request.text);
    });
    sendResponse({ status: "ok" });
    return true;
  }

  if (request.action === "GET_CONFIG") {
    chrome.storage.sync.get({
      enableFloatingTooltip: true,
      autoSpeech: false
    }, (items) => {
      sendResponse(items);
    });
    return true;
  }
});
