// This script runs in the page context to intercept console calls v1.3.0
(function() {
  'use strict';

  // Prevent double initialization
  if (window.__consoleOverlayInitialized) return;
  window.__consoleOverlayInitialized = true;

  // Create a buffer for logs before the overlay is ready
  window.__consoleOverlayBuffer = window.__consoleOverlayBuffer || [];
  
  // Store original console methods
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
    table: console.table.bind(console),
    dir: console.dir.bind(console),
    dirxml: console.dirxml.bind(console),
    trace: console.trace.bind(console),
    assert: console.assert.bind(console),
    count: console.count.bind(console),
    countReset: console.countReset.bind(console),
    time: console.time.bind(console),
    timeLog: console.timeLog.bind(console),
    timeEnd: console.timeEnd.bind(console),
    group: console.group.bind(console),
    groupCollapsed: console.groupCollapsed.bind(console),
    groupEnd: console.groupEnd.bind(console),
    clear: console.clear.bind(console)
  };

  function formatArgs(args) {
    return Array.from(args).map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  function sendToOverlay(type, message, stack) {
    const logData = {
      type: type,
      message: message,
      timestamp: new Date().toISOString(),
      stack: stack
    };

    // Buffer the log
    if (window.__consoleOverlayBuffer.length < 1000) {
      window.__consoleOverlayBuffer.push(logData);
    } else {
      window.__consoleOverlayBuffer.shift();
      window.__consoleOverlayBuffer.push(logData);
    }

    // Also send via postMessage
    try {
      window.postMessage({
        type: 'CONSOLE_OVERLAY_MESSAGE',
        source: 'console-interceptor',
        data: logData
      }, '*');
    } catch (e) {
      // Silently fail
    }
  }

  function interceptConsole(method, type) {
    console[method] = function(...args) {
      // Call original method first
      originalConsole[method](...args);

      // Send to content script
      const message = formatArgs(args);
      const stack = type === 'error' ? (args[0]?.stack || null) : null;
      sendToOverlay(type, message, stack);
    };
  }

  // Intercept all console methods
  interceptConsole('log', 'log');
  interceptConsole('warn', 'warn');
  interceptConsole('error', 'error');
  interceptConsole('info', 'info');
  interceptConsole('debug', 'debug');

  // Generic interceptions (table, dir, dirxml)
  interceptConsole('table', 'log');
  interceptConsole('dir', 'log');
  interceptConsole('dirxml', 'log');

  // console.trace() — include stack trace
  console.trace = function(...args) {
    originalConsole.trace(...args);
    const label = args.length > 0 ? formatArgs(args) : 'console.trace';
    const stack = new Error().stack;
    sendToOverlay('debug', 'Trace: ' + label, stack);
  };

  // console.assert() — only log on failure
  console.assert = function(condition, ...args) {
    originalConsole.assert(condition, ...args);
    if (!condition) {
      const message = args.length > 0 ? 'Assertion failed: ' + formatArgs(args) : 'Assertion failed';
      sendToOverlay('error', message, new Error().stack);
    }
  };

  // console.count() / console.countReset()
  const counters = {};
  console.count = function(label) {
    originalConsole.count(label);
    const key = label !== undefined ? String(label) : 'default';
    counters[key] = (counters[key] || 0) + 1;
    sendToOverlay('log', key + ': ' + counters[key], null);
  };
  console.countReset = function(label) {
    originalConsole.countReset(label);
    const key = label !== undefined ? String(label) : 'default';
    counters[key] = 0;
    sendToOverlay('log', key + ': 0', null);
  };

  // console.time() / console.timeLog() / console.timeEnd()
  const timers = {};
  console.time = function(label) {
    originalConsole.time(label);
    const key = label !== undefined ? String(label) : 'default';
    timers[key] = performance.now();
  };
  console.timeLog = function(label, ...args) {
    originalConsole.timeLog(label, ...args);
    const key = label !== undefined ? String(label) : 'default';
    if (timers[key] !== undefined) {
      const elapsed = (performance.now() - timers[key]).toFixed(3);
      const extra = args.length > 0 ? ' ' + formatArgs(args) : '';
      sendToOverlay('log', key + ': ' + elapsed + 'ms' + extra, null);
    }
  };
  console.timeEnd = function(label) {
    originalConsole.timeEnd(label);
    const key = label !== undefined ? String(label) : 'default';
    if (timers[key] !== undefined) {
      const elapsed = (performance.now() - timers[key]).toFixed(3);
      sendToOverlay('log', key + ': ' + elapsed + 'ms', null);
      delete timers[key];
    }
  };

  // console.group() / console.groupCollapsed() / console.groupEnd()
  console.group = function(...args) {
    originalConsole.group(...args);
    const label = args.length > 0 ? formatArgs(args) : '';
    sendToOverlay('log', '▼ ' + label, null);
  };
  console.groupCollapsed = function(...args) {
    originalConsole.groupCollapsed(...args);
    const label = args.length > 0 ? formatArgs(args) : '';
    sendToOverlay('log', '▶ ' + label, null);
  };
  console.groupEnd = function() {
    originalConsole.groupEnd();
    // No log output
  };

  // console.clear()
  console.clear = function() {
    originalConsole.clear();
    sendToOverlay('info', 'Console was cleared', null);
  };

  // Intercept unhandled errors
  window.addEventListener('error', (event) => {
    const message = `${event.message}\n  at ${event.filename}:${event.lineno}:${event.colno}`;
    const stack = event.error?.stack || null;
    sendToOverlay('error', message, stack);
  }, true);

  // Intercept unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const message = `Unhandled Promise Rejection: ${event.reason}`;
    const stack = event.reason?.stack || null;
    sendToOverlay('error', message, stack);
  }, true);

  // Intercept XMLHttpRequest errors
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._consoleOverlay = { method, url };
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('loadend', function() {
      if (this.status >= 400) {
        const message = `${this._consoleOverlay?.method || 'XHR'} ${this._consoleOverlay?.url || 'unknown'}\n${this.status} (${this.statusText || 'Error'})`;
        sendToOverlay('error', message, null);
      }
    });
    return originalXHRSend.apply(this, args);
  };

  // Intercept Fetch API errors
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : input?.url || 'unknown';
    const method = init?.method || (typeof input === 'object' ? input?.method : null) || 'GET';

    return originalFetch.apply(this, arguments)
      .then(response => {
        if (!response.ok) {
          const message = `${method} ${url}\n${response.status} (${response.statusText || 'Error'})`;
          sendToOverlay('error', message, null);
        }
        return response;
      })
      .catch(error => {
        const message = `${method} ${url}\nNetwork Error: ${error.message}`;
        sendToOverlay('error', message, null);
        throw error;
      });
  };

  // Send initial log
  sendToOverlay('log', 'Console Overlay: Monitoring active (+ Network)', null);

  // Listen for buffer requests
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'CONSOLE_OVERLAY_REQUEST_BUFFER' && 
        event.data?.source === 'console-overlay-content') {
      // Send buffer back
      window.postMessage({
        type: 'CONSOLE_OVERLAY_BUFFER_RESPONSE',
        source: 'console-interceptor',
        buffer: window.__consoleOverlayBuffer || []
      }, '*');
    }
  });
})();
