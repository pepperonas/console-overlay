// Content script v1.2.5
(function() {
  'use strict';

  let overlay = null;
  let isEnabled = false;
  let logs = [];
  let messageQueue = [];
  let isReady = false;

  // Dragging
  let isDragging = false;
  let dragStartX, dragStartY, windowStartX, windowStartY;

  // Resizing
  let isResizing = false;
  let resizeDirection = null;
  let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight, resizeStartLeft, resizeStartTop;

  // Window state
  let isMinimized = false;
  let isMaximized = false;
  let savedStateMinimize = null;
  let savedStateMaximize = null;

  // Inject script
  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  // Request buffered logs from injected script
  function loadBufferedLogs() {
    // Post message to request buffer
    window.postMessage({
      type: 'CONSOLE_OVERLAY_REQUEST_BUFFER',
      source: 'console-overlay-content'
    }, '*');
  }

  // Create overlay
  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'console-overlay-container';
    overlay.className = 'console-overlay';
    
    overlay.innerHTML = `
      <div class="console-window">
        <div class="console-titlebar">
          <span class="console-title">Console Overlay</span>
          <div class="console-controls">
            <button class="console-btn console-minimize">−</button>
            <button class="console-btn console-maximize">□</button>
            <button class="console-btn console-close">×</button>
          </div>
        </div>
        <div class="console-toolbar">
          <button class="console-toolbar-btn console-clear">Clear</button>
          <button class="console-toolbar-btn console-copy">Copy All</button>
          <div class="console-opacity-control">
            <label><span>🔆</span><input type="range" class="opacity-slider" min="20" max="100" value="95" step="5"></label>
          </div>
          <div class="console-filters">
            <label><input type="checkbox" class="filter-log" checked> Log</label>
            <label><input type="checkbox" class="filter-info" checked> Info</label>
            <label><input type="checkbox" class="filter-warn" checked> Warn</label>
            <label><input type="checkbox" class="filter-error" checked> Error</label>
            <label><input type="checkbox" class="filter-debug" checked> Debug</label>
          </div>
        </div>
        <div class="console-content">
          <div class="console-logs"></div>
        </div>
        <div class="console-resize-handle resize-nw"></div>
        <div class="console-resize-handle resize-n"></div>
        <div class="console-resize-handle resize-ne"></div>
        <div class="console-resize-handle resize-w"></div>
        <div class="console-resize-handle resize-e"></div>
        <div class="console-resize-handle resize-sw"></div>
        <div class="console-resize-handle resize-s"></div>
        <div class="console-resize-handle resize-se"></div>
      </div>
    `;

    document.documentElement.appendChild(overlay);
    attachEventListeners();
    loadState();
  }

  function attachEventListeners() {
    const win = overlay.querySelector('.console-window');
    const titlebar = overlay.querySelector('.console-titlebar');
    
    // Dragging
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.console-controls') || isMaximized) return;
      isDragging = true;
      const rect = win.getBoundingClientRect();
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      windowStartX = rect.left;
      windowStartY = rect.top;
      e.preventDefault();
    });

    titlebar.addEventListener('dblclick', (e) => {
      if (e.target === titlebar || e.target.classList.contains('console-title')) {
        toggleMaximize();
      }
    });

    // Resizing
    overlay.querySelectorAll('.console-resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        if (isMaximized || isMinimized) return;
        isResizing = true;
        
        const classList = handle.classList;
        if (classList.contains('resize-nw')) resizeDirection = 'nw';
        else if (classList.contains('resize-n')) resizeDirection = 'n';
        else if (classList.contains('resize-ne')) resizeDirection = 'ne';
        else if (classList.contains('resize-w')) resizeDirection = 'w';
        else if (classList.contains('resize-e')) resizeDirection = 'e';
        else if (classList.contains('resize-sw')) resizeDirection = 'sw';
        else if (classList.contains('resize-s')) resizeDirection = 's';
        else if (classList.contains('resize-se')) resizeDirection = 'se';

        const rect = win.getBoundingClientRect();
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        resizeStartWidth = rect.width;
        resizeStartHeight = rect.height;
        resizeStartLeft = rect.left;
        resizeStartTop = rect.top;

        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Mouse move/up
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        let newLeft = windowStartX + deltaX;
        let newTop = windowStartY + deltaY;

        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - win.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - win.offsetHeight));

        win.style.left = newLeft + 'px';
        win.style.top = newTop + 'px';
        win.style.right = 'auto';
        win.style.bottom = 'auto';
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStartX;
        const deltaY = e.clientY - resizeStartY;

        let newWidth = resizeStartWidth;
        let newHeight = resizeStartHeight;
        let newLeft = resizeStartLeft;
        let newTop = resizeStartTop;

        if (resizeDirection.includes('e')) newWidth += deltaX;
        if (resizeDirection.includes('w')) { newWidth -= deltaX; newLeft += deltaX; }
        if (resizeDirection.includes('s')) newHeight += deltaY;
        if (resizeDirection.includes('n')) { newHeight -= deltaY; newTop += deltaY; }

        // Constraints
        if (newWidth < 400) {
          if (resizeDirection.includes('w')) newLeft += newWidth - 400;
          newWidth = 400;
        }
        if (newHeight < 300) {
          if (resizeDirection.includes('n')) newTop += newHeight - 300;
          newHeight = 300;
        }

        newWidth = Math.min(newWidth, window.innerWidth);
        newHeight = Math.min(newHeight, window.innerHeight);

        if (newLeft < 0) { newWidth += newLeft; newLeft = 0; }
        if (newTop < 0) { newHeight += newTop; newTop = 0; }

        win.style.width = newWidth + 'px';
        win.style.height = newHeight + 'px';
        
        if (resizeDirection.includes('w') || resizeDirection.includes('n')) {
          win.style.left = newLeft + 'px';
          win.style.top = newTop + 'px';
          win.style.right = 'auto';
          win.style.bottom = 'auto';
        }
      }
    });

    function handleMouseUp() {
      if (isDragging) { isDragging = false; saveState(); }
      if (isResizing) { isResizing = false; resizeDirection = null; saveState(); }
    }

    document.addEventListener('mouseup', handleMouseUp);

    // Buttons
    overlay.querySelector('.console-close').addEventListener('click', () => toggleOverlay());
    overlay.querySelector('.console-minimize').addEventListener('click', () => toggleMinimize());
    overlay.querySelector('.console-maximize').addEventListener('click', () => toggleMaximize());
    overlay.querySelector('.console-clear').addEventListener('click', () => clearLogs());
    overlay.querySelector('.console-copy').addEventListener('click', () => copyAllLogs());

    // Opacity
    overlay.querySelector('.opacity-slider').addEventListener('input', (e) => {
      win.style.opacity = e.target.value / 100;
      saveState();
    });

    // Filters
    overlay.querySelectorAll('.console-filters input').forEach(f => {
      f.addEventListener('change', () => renderLogs());
    });
  }

  function toggleMinimize() {
    const win = overlay.querySelector('.console-window');
    const content = overlay.querySelector('.console-content');
    const toolbar = overlay.querySelector('.console-toolbar');

    isMinimized = !isMinimized;

    if (isMinimized) {
      savedStateMinimize = { height: win.style.height };
      content.style.display = 'none';
      toolbar.style.display = 'none';
      win.style.height = 'auto';
    } else {
      content.style.display = 'flex';
      toolbar.style.display = 'flex';
      if (savedStateMinimize?.height) win.style.height = savedStateMinimize.height;
    }
    saveState();
  }

  function toggleMaximize() {
    const win = overlay.querySelector('.console-window');

    isMaximized = !isMaximized;

    if (isMaximized) {
      savedStateMaximize = {
        left: win.style.left,
        top: win.style.top,
        right: win.style.right,
        bottom: win.style.bottom,
        width: win.style.width,
        height: win.style.height
      };
      win.style.left = '0';
      win.style.top = '0';
      win.style.right = 'auto';
      win.style.bottom = 'auto';
      win.style.width = '100vw';
      win.style.height = '100vh';
      win.classList.add('maximized');
    } else {
      if (savedStateMaximize) {
        win.style.left = savedStateMaximize.left || '';
        win.style.top = savedStateMaximize.top || '';
        win.style.right = savedStateMaximize.right || '20px';
        win.style.bottom = savedStateMaximize.bottom || '20px';
        win.style.width = savedStateMaximize.width || '600px';
        win.style.height = savedStateMaximize.height || '400px';
      }
      win.classList.remove('maximized');
    }
    saveState();
  }

  function addLogDirect(logData) {
    logs.push(logData);
    if (logs.length > 1000) logs.shift();
    renderLogs();
  }

  function addLog(logData) {
    if (isReady && overlay && isEnabled) {
      addLogDirect(logData);
    } else {
      messageQueue.push(logData);
    }
  }

  function renderLogs() {
    if (!overlay) return;
    const container = overlay.querySelector('.console-logs');
    const filters = {
      log: overlay.querySelector('.filter-log').checked,
      info: overlay.querySelector('.filter-info').checked,
      warn: overlay.querySelector('.filter-warn').checked,
      error: overlay.querySelector('.filter-error').checked,
      debug: overlay.querySelector('.filter-debug').checked
    };

    container.innerHTML = '';
    
    logs.filter(log => filters[log.type]).forEach(log => {
      const entry = document.createElement('div');
      entry.className = `console-log console-log-${log.type}`;
      const time = new Date(log.timestamp).toLocaleTimeString();
      
      entry.innerHTML = `
        <span class="console-log-time">${time}</span>
        <span class="console-log-type">[${log.type.toUpperCase()}]</span>
        <span class="console-log-message">${escapeHtml(log.message)}</span>
        <button class="console-log-copy">📋</button>
      `;
      
      entry.querySelector('.console-log-copy').addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`[${new Date(log.timestamp).toLocaleString()}] [${log.type.toUpperCase()}] ${log.message}`);
        showNotification('Copied!');
      });
      
      container.appendChild(entry);
    });
    
    container.scrollTop = container.scrollHeight;
  }

  function clearLogs() {
    logs = [];
    renderLogs();
  }

  function copyAllLogs() {
    const filters = {
      log: overlay.querySelector('.filter-log').checked,
      info: overlay.querySelector('.filter-info').checked,
      warn: overlay.querySelector('.filter-warn').checked,
      error: overlay.querySelector('.filter-error').checked,
      debug: overlay.querySelector('.filter-debug').checked
    };
    
    const filtered = logs.filter(log => filters[log.type]);
    const text = filtered.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(text);
    showNotification(`${filtered.length} logs copied`);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'console-notification';
    notif.textContent = message;
    overlay.appendChild(notif);
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
      notif.classList.remove('show');
      setTimeout(() => notif.remove(), 300);
    }, 2000);
  }

  function saveState() {
    if (!overlay) return;
    const win = overlay.querySelector('.console-window');
    const slider = overlay.querySelector('.opacity-slider');
    
    chrome.storage.local.set({
      overlayState: {
        left: win.style.left,
        top: win.style.top,
        width: win.style.width,
        height: win.style.height,
        opacity: win.style.opacity || '0.95',
        opacityValue: slider ? slider.value : '95',
        isMinimized,
        isMaximized
      }
    });
  }

  function loadState() {
    chrome.storage.local.get(['overlayState'], (result) => {
      if (!result.overlayState) return;
      const win = overlay.querySelector('.console-window');
      const slider = overlay.querySelector('.opacity-slider');
      const content = overlay.querySelector('.console-content');
      const toolbar = overlay.querySelector('.console-toolbar');
      const state = result.overlayState;

      if (state.left) win.style.left = state.left;
      if (state.top) win.style.top = state.top;
      if (state.width) win.style.width = state.width;
      if (state.height) win.style.height = state.height;
      if (state.opacity) win.style.opacity = state.opacity;
      if (state.opacityValue && slider) slider.value = state.opacityValue;

      // Apply minimized state directly (don't toggle)
      if (state.isMinimized) {
        isMinimized = true;
        savedStateMinimize = { height: state.height || win.style.height };
        content.style.display = 'none';
        toolbar.style.display = 'none';
        win.style.height = 'auto';
      }

      // Apply maximized state directly (don't toggle)
      if (state.isMaximized && !state.isMinimized) {
        isMaximized = true;
        savedStateMaximize = {
          left: state.left,
          top: state.top,
          width: state.width,
          height: state.height
        };
        win.style.left = '0';
        win.style.top = '0';
        win.style.width = '100vw';
        win.style.height = '100vh';
        win.classList.add('maximized');
      }
    });
  }

  function toggleOverlay() {
    isEnabled = !isEnabled;
    
    if (isEnabled) {
      if (!overlay) createOverlay();
      overlay.style.display = 'block';
      isReady = true;
      
      // Request buffered logs
      loadBufferedLogs();
      
      // Process queued messages
      setTimeout(() => {
        while (messageQueue.length > 0) {
          addLogDirect(messageQueue.shift());
        }
      }, 100);
    } else {
      if (overlay) overlay.style.display = 'none';
      isReady = false;
    }
    
    chrome.storage.local.set({ isEnabled });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    // Handle regular console messages
    if (event.data?.type === 'CONSOLE_OVERLAY_MESSAGE' && event.data?.source === 'console-interceptor') {
      addLog(event.data.data);
    }
    
    // Handle buffer response
    if (event.data?.type === 'CONSOLE_OVERLAY_BUFFER_RESPONSE' && event.data?.source === 'console-interceptor') {
      if (event.data.buffer && Array.isArray(event.data.buffer)) {
        event.data.buffer.forEach(logData => {
          addLogDirect(logData);
        });
        console.log('[Console Overlay] Loaded', event.data.buffer.length, 'buffered logs');
      }
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleOverlay') {
      toggleOverlay();
      sendResponse({ isEnabled });
    }
  });

  injectScript();
  
  chrome.storage.local.get(['isEnabled'], (result) => {
    if (result.isEnabled) toggleOverlay();
  });
})();
