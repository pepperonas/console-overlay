// This script runs in the page context to intercept console calls v1.4.0
(function() {
  'use strict';

  // Prevent double initialization
  if (window.__consoleOverlayInitialized) return;
  window.__consoleOverlayInitialized = true;

  const MAX_BUFFER = 1000;
  const MAX_MESSAGE_LENGTH = 8000; // truncate very large payloads to protect memory/UI

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

  // Format a single value the way DevTools roughly would.
  function formatValue(arg, seen) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';

    const t = typeof arg;
    if (t === 'string') return arg;
    if (t === 'number' || t === 'boolean') return String(arg);
    if (t === 'bigint') return String(arg) + 'n';
    if (t === 'symbol') return arg.toString();
    if (t === 'function') {
      return `ƒ ${arg.name || '(anonymous)'}()`;
    }

    // Error objects: enumerable-stringify would lose everything → use stack/message.
    if (arg instanceof Error) {
      return arg.stack || `${arg.name}: ${arg.message}`;
    }

    // DOM nodes
    if (typeof Node !== 'undefined' && arg instanceof Node) {
      if (arg instanceof Element) {
        const id = arg.id ? `#${arg.id}` : '';
        const cls = arg.className && typeof arg.className === 'string'
          ? '.' + arg.className.trim().split(/\s+/).join('.')
          : '';
        return `<${arg.tagName.toLowerCase()}${id}${cls}>`;
      }
      return String(arg.nodeName || arg);
    }

    // Other objects → safe JSON with circular guard
    seen = seen || new WeakSet();
    try {
      return JSON.stringify(arg, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        if (typeof value === 'bigint') return String(value) + 'n';
        if (typeof value === 'function') return `ƒ ${value.name || '(anonymous)'}()`;
        return value;
      }, 2);
    } catch (e) {
      try { return String(arg); } catch (_) { return '[Unserializable]'; }
    }
  }

  // Resolve printf-style format specifiers (%s %d %i %f %o %O %c %%).
  function applyFormatSpecifiers(args) {
    const first = args[0];
    if (typeof first !== 'string' || !/%[sdifoOc%]/.test(first)) return null;

    const rest = args.slice(1);
    let i = 0;
    const out = first.replace(/%([sdifoOc%])/g, (match, spec) => {
      if (spec === '%') return '%';
      if (i >= rest.length) return match;
      const value = rest[i++];
      switch (spec) {
        case 's': return typeof value === 'string' ? value : formatValue(value);
        case 'd':
        case 'i': return String(parseInt(value, 10));
        case 'f': return String(parseFloat(value));
        case 'c': return ''; // CSS styling is dropped in the overlay
        case 'o':
        case 'O':
        default: return formatValue(value);
      }
    });

    const remaining = rest.slice(i).map(a => formatValue(a));
    return [out, ...remaining].filter(s => s !== '').join(' ');
  }

  function formatArgs(args) {
    const arr = Array.from(args);
    if (arr.length === 0) return '';
    const formatted = applyFormatSpecifiers(arr);
    const message = formatted !== null
      ? formatted
      : arr.map(a => formatValue(a)).join(' ');
    if (message.length > MAX_MESSAGE_LENGTH) {
      return message.slice(0, MAX_MESSAGE_LENGTH) +
        `\n… (truncated, ${message.length - MAX_MESSAGE_LENGTH} more chars)`;
    }
    return message;
  }

  function sendToOverlay(type, message, stack) {
    const logData = {
      type: type,
      message: message,
      timestamp: new Date().toISOString(),
      stack: stack
    };

    // Buffer the log (FIFO)
    window.__consoleOverlayBuffer.push(logData);
    if (window.__consoleOverlayBuffer.length > MAX_BUFFER) {
      window.__consoleOverlayBuffer.shift();
    }

    // Also send live via postMessage
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
      const stack = args[0] instanceof Error ? args[0].stack : null;
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
    const reason = event.reason;
    const message = `Unhandled Promise Rejection: ${formatValue(reason)}`;
    const stack = reason?.stack || null;
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
  if (typeof originalFetch === 'function') {
    window.fetch = function(input, init) {
      const url = typeof input === 'string'
        ? input
        : (input && input.url) || 'unknown';
      const method = (init && init.method) ||
        (typeof input === 'object' && input ? input.method : null) || 'GET';

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
  }

  // Send initial log
  sendToOverlay('log', 'Console Overlay: Monitoring active (+ Network)', null);

  // Listen for buffer requests
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'CONSOLE_OVERLAY_REQUEST_BUFFER' &&
        event.data?.source === 'console-overlay-content') {
      window.postMessage({
        type: 'CONSOLE_OVERLAY_BUFFER_RESPONSE',
        source: 'console-interceptor',
        buffer: window.__consoleOverlayBuffer || []
      }, '*');
    }
  });
})();
