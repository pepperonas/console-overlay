// Background service worker v1.4.0
chrome.runtime.onInstalled.addListener(() => {
  // Set default state
  chrome.storage.local.set({ isEnabled: false });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getState') {
    chrome.storage.local.get(['isEnabled'], (result) => {
      sendResponse({ isEnabled: result.isEnabled || false });
    });
    return true; // Keep message channel open for async response
  }
});

// Keyboard shortcut → toggle overlay on the active tab
chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-overlay') return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id || !tab.url) return;
    if (/^(chrome|edge|about|chrome-extension):/i.test(tab.url)) return;
    chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' }).catch(() => {
      // Content script not present (e.g. page loaded before install) — flip storage so
      // the next navigation picks it up.
      chrome.storage.local.get(['isEnabled'], (result) => {
        chrome.storage.local.set({ isEnabled: !result.isEnabled });
      });
    });
  });
});
