// Popup script
document.addEventListener('DOMContentLoaded', async () => {
  const toggleCheckbox = document.getElementById('toggleOverlay');
  const statusText = document.getElementById('status');

  // Get current state
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.storage.local.get(['isEnabled'], (result) => {
    const isEnabled = result.isEnabled || false;
    toggleCheckbox.checked = isEnabled;
    updateStatus(isEnabled);
  });

  // Handle toggle
  toggleCheckbox.addEventListener('change', async () => {
    const isEnabled = toggleCheckbox.checked;
    
    try {
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleOverlay' 
      });
      updateStatus(isEnabled);
    } catch (error) {
      console.error('Error toggling overlay:', error);
      // If content script not ready, just update storage
      chrome.storage.local.set({ isEnabled });
      updateStatus(isEnabled);
      
      // Show reload hint
      statusText.textContent = 'Please reload the page to activate';
      statusText.style.color = '#ffa726';
    }
  });

  function updateStatus(isEnabled) {
    if (isEnabled) {
      statusText.textContent = 'Overlay is active';
      statusText.classList.add('active');
    } else {
      statusText.textContent = 'Overlay is disabled';
      statusText.classList.remove('active');
    }
  }
});
