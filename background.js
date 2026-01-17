// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Console Overlay extension installed');
  
  // Set default state
  chrome.storage.local.set({ 
    isEnabled: false 
  });
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
