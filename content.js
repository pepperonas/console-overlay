// Content script v1.4.0
(function() {
  'use strict';

  const MAX_LOGS = 1000;

  let host = null;        // shadow host element in the page tree
  let root = null;        // shadow root containing the overlay UI
  let isEnabled = false;
  let logs = [];
  let isReady = false;
  let loadingBuffer = false;

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

  // Current geometry remembered separately from the maximized fullscreen geometry,
  // so un-maximizing (even after a reload) restores the real previous size.
  let normalGeometry = null;

  const FILTER_TYPES = ['log', 'info', 'warn', 'error', 'debug'];

  function $(sel) { return root ? root.querySelector(sel) : null; }
  function $all(sel) { return root ? root.querySelectorAll(sel) : []; }

  // Request buffered logs from injected script
  function loadBufferedLogs() {
    window.postMessage({
      type: 'CONSOLE_OVERLAY_REQUEST_BUFFER',
      source: 'console-overlay-content'
    }, '*');
  }

  // Create overlay inside a Shadow DOM so page CSS can never bleed in (or out).
  function createOverlay() {
    host = document.createElement('div');
    host.id = 'console-overlay-host';
    host.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;margin:0;padding:0;border:0;' +
      'z-index:2147483647;pointer-events:none;color-scheme:dark;';

    root = host.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('overlay.css');
    root.appendChild(link);

    const win = document.createElement('div');
    win.className = 'console-window';
    win.innerHTML = `
      <div class="console-titlebar">
        <span class="console-title">Console Overlay</span>
        <div class="console-controls">
          <button class="console-btn console-minimize" title="Minimize" aria-label="Minimize">−</button>
          <button class="console-btn console-maximize" title="Maximize" aria-label="Maximize">□</button>
          <button class="console-btn console-close" title="Close" aria-label="Close">×</button>
        </div>
      </div>
      <div class="console-toolbar">
        <button class="console-toolbar-btn console-clear" title="Clear all logs">Clear</button>
        <button class="console-toolbar-btn console-copy" title="Copy filtered logs">Copy All</button>
        <div class="console-opacity-control">
          <label><span>🔆</span><input type="range" class="opacity-slider" min="20" max="100" value="95" step="5" aria-label="Overlay opacity"></label>
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
        <div class="console-logs" role="log" aria-live="polite"></div>
      </div>
      <div class="console-resize-handle resize-nw"></div>
      <div class="console-resize-handle resize-n"></div>
      <div class="console-resize-handle resize-ne"></div>
      <div class="console-resize-handle resize-w"></div>
      <div class="console-resize-handle resize-e"></div>
      <div class="console-resize-handle resize-sw"></div>
      <div class="console-resize-handle resize-s"></div>
      <div class="console-resize-handle resize-se"></div>
    `;
    root.appendChild(win);

    (document.body || document.documentElement).appendChild(host);
    attachEventListeners();
    loadState();
  }

  function getWin() { return $('.console-window'); }

  function attachEventListeners() {
    const win = getWin();
    const titlebar = $('.console-titlebar');

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
    $all('.console-resize-handle').forEach(handle => {
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

    // Mouse move/up — listeners live on document (events bubble out of the shadow tree)
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
      if (isDragging) { isDragging = false; captureNormalGeometry(); saveState(); }
      if (isResizing) { isResizing = false; resizeDirection = null; captureNormalGeometry(); saveState(); }
    }

    document.addEventListener('mouseup', handleMouseUp);

    // Buttons
    $('.console-close').addEventListener('click', () => toggleOverlay());
    $('.console-minimize').addEventListener('click', () => toggleMinimize());
    $('.console-maximize').addEventListener('click', () => toggleMaximize());
    $('.console-clear').addEventListener('click', () => clearLogs());
    $('.console-copy').addEventListener('click', () => copyAllLogs());

    // Opacity
    $('.opacity-slider').addEventListener('input', (e) => {
      win.style.opacity = e.target.value / 100;
      saveState();
    });

    // Filters
    $all('.console-filters input').forEach(f => {
      f.addEventListener('change', () => { renderLogs(); saveState(); });
    });
  }

  // Remember the un-maximized window box so we can always restore it.
  function captureNormalGeometry() {
    if (isMaximized || isMinimized) return;
    const win = getWin();
    if (!win) return;
    normalGeometry = {
      left: win.style.left,
      top: win.style.top,
      width: win.style.width,
      height: win.style.height
    };
  }

  function toggleMinimize() {
    const win = getWin();
    const content = $('.console-content');
    const toolbar = $('.console-toolbar');

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
    const win = getWin();

    isMaximized = !isMaximized;

    if (isMaximized) {
      captureNormalGeometry();
      win.style.left = '0';
      win.style.top = '0';
      win.style.right = 'auto';
      win.style.bottom = 'auto';
      win.style.width = '100vw';
      win.style.height = '100vh';
      win.classList.add('maximized');
    } else {
      const g = normalGeometry || {};
      win.style.left = g.left || '';
      win.style.top = g.top || '';
      win.style.right = g.left ? 'auto' : '20px';
      win.style.bottom = g.top ? 'auto' : '20px';
      win.style.width = g.width || '600px';
      win.style.height = g.height || '400px';
      win.classList.remove('maximized');
    }
    saveState();
  }

  function isScrolledToBottom(container) {
    return container.scrollHeight - container.scrollTop - container.clientHeight < 40;
  }

  function buildEntry(log) {
    const entry = document.createElement('div');
    entry.className = `console-log console-log-${log.type}`;

    const time = document.createElement('span');
    time.className = 'console-log-time';
    time.textContent = new Date(log.timestamp).toLocaleTimeString();

    const type = document.createElement('span');
    type.className = 'console-log-type';
    type.textContent = `[${log.type.toUpperCase()}]`;

    const msg = document.createElement('span');
    msg.className = 'console-log-message';
    msg.textContent = log.message;

    const copy = document.createElement('button');
    copy.className = 'console-log-copy';
    copy.title = 'Copy this log';
    copy.setAttribute('aria-label', 'Copy this log');
    copy.textContent = '📋';
    copy.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(`[${new Date(log.timestamp).toLocaleString()}] [${log.type.toUpperCase()}] ${log.message}`);
      showNotification('Copied!');
    });

    entry.append(time, type, msg, copy);
    return entry;
  }

  function getFilters() {
    const filters = {};
    FILTER_TYPES.forEach(t => {
      const cb = $(`.filter-${t}`);
      filters[t] = cb ? cb.checked : true;
    });
    return filters;
  }

  // Incremental append for a single new log — O(1), no full rebuild.
  function appendLogEntry(log) {
    if (!root) return;
    const container = $('.console-logs');
    const filters = getFilters();
    if (!filters[log.type]) return;

    const stick = isScrolledToBottom(container);
    container.appendChild(buildEntry(log));
    // Cap DOM nodes so long-running, high-volume pages stay O(1) amortized.
    while (container.childElementCount > MAX_LOGS) {
      container.removeChild(container.firstElementChild);
    }
    if (stick) container.scrollTop = container.scrollHeight;
  }

  // Full rebuild — only on filter change, buffer load, or clear.
  function renderLogs() {
    if (!root) return;
    const container = $('.console-logs');
    const filters = getFilters();

    const frag = document.createDocumentFragment();
    logs.filter(log => filters[log.type]).forEach(log => frag.appendChild(buildEntry(log)));

    container.replaceChildren(frag);
    container.scrollTop = container.scrollHeight;
  }

  function addLogDirect(logData) {
    logs.push(logData);
    if (logs.length > MAX_LOGS) logs.shift();
    appendLogEntry(logData);
  }

  function addLog(logData) {
    if (isReady && root && isEnabled && !loadingBuffer) {
      addLogDirect(logData);
    }
    // While loading the buffer (or before ready) we drop live messages here:
    // the buffer snapshot already contains everything up to this moment.
  }

  function clearLogs() {
    logs = [];
    renderLogs();
  }

  function copyAllLogs() {
    const filters = getFilters();
    const filtered = logs.filter(log => filters[log.type]);
    const text = filtered.map(log =>
      `[${new Date(log.timestamp).toLocaleString()}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n');

    copyText(text);
    showNotification(`${filtered.length} logs copied`);
  }

  // Clipboard with graceful fallback for insecure (http) contexts.
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
      (document.body || document.documentElement).appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    } catch (e) {
      // give up silently
    }
  }

  function showNotification(message) {
    if (!root) return;
    const notif = document.createElement('div');
    notif.className = 'console-notification';
    notif.textContent = message;
    root.appendChild(notif);
    requestAnimationFrame(() => notif.classList.add('show'));
    setTimeout(() => {
      notif.classList.remove('show');
      setTimeout(() => notif.remove(), 300);
    }, 2000);
  }

  function saveState() {
    if (!root) return;
    const win = getWin();
    const slider = $('.opacity-slider');

    chrome.storage.local.set({
      overlayState: {
        // Persist the normal (un-maximized) geometry so restore is always correct.
        left: normalGeometry?.left ?? win.style.left,
        top: normalGeometry?.top ?? win.style.top,
        width: normalGeometry?.width ?? win.style.width,
        height: normalGeometry?.height ?? win.style.height,
        opacity: win.style.opacity || '0.95',
        opacityValue: slider ? slider.value : '95',
        filters: getFilters(),
        isMinimized,
        isMaximized
      }
    });
  }

  function loadState() {
    chrome.storage.local.get(['overlayState'], (result) => {
      if (!result.overlayState || !root) return;
      const win = getWin();
      const slider = $('.opacity-slider');
      const content = $('.console-content');
      const toolbar = $('.console-toolbar');
      const state = result.overlayState;

      if (state.left) win.style.left = state.left;
      if (state.top) win.style.top = state.top;
      if (state.width) win.style.width = state.width;
      if (state.height) win.style.height = state.height;
      if (state.left || state.top) { win.style.right = 'auto'; win.style.bottom = 'auto'; }
      if (state.opacity) win.style.opacity = state.opacity;
      if (state.opacityValue && slider) slider.value = state.opacityValue;

      // Restore filters
      if (state.filters) {
        FILTER_TYPES.forEach(t => {
          const cb = $(`.filter-${t}`);
          if (cb && typeof state.filters[t] === 'boolean') cb.checked = state.filters[t];
        });
        renderLogs();
      }

      // The persisted geometry is the normal box.
      normalGeometry = {
        left: state.left || '',
        top: state.top || '',
        width: state.width || '',
        height: state.height || ''
      };

      if (state.isMinimized) {
        isMinimized = true;
        savedStateMinimize = { height: state.height || win.style.height };
        content.style.display = 'none';
        toolbar.style.display = 'none';
        win.style.height = 'auto';
      }

      if (state.isMaximized && !state.isMinimized) {
        isMaximized = true;
        win.style.left = '0';
        win.style.top = '0';
        win.style.right = 'auto';
        win.style.bottom = 'auto';
        win.style.width = '100vw';
        win.style.height = '100vh';
        win.classList.add('maximized');
      }
    });
  }

  function toggleOverlay() {
    isEnabled = !isEnabled;

    if (isEnabled) {
      if (!root) createOverlay();
      host.style.display = 'block';
      isReady = true;
      logs = [];

      // Load the buffer as the single source of truth; drop live messages until it arrives.
      loadingBuffer = true;
      loadBufferedLogs();
    } else {
      if (host) host.style.display = 'none';
      isReady = false;
    }

    chrome.storage.local.set({ isEnabled });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data?.type === 'CONSOLE_OVERLAY_MESSAGE' && event.data?.source === 'console-interceptor') {
      addLog(event.data.data);
    }

    if (event.data?.type === 'CONSOLE_OVERLAY_BUFFER_RESPONSE' && event.data?.source === 'console-interceptor') {
      if (event.data.buffer && Array.isArray(event.data.buffer)) {
        logs = event.data.buffer.slice(-MAX_LOGS);
        renderLogs();
      }
      loadingBuffer = false;
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleOverlay') {
      toggleOverlay();
      sendResponse({ isEnabled });
    }
  });

  chrome.storage.local.get(['isEnabled'], (result) => {
    if (result.isEnabled) toggleOverlay();
  });
})();
