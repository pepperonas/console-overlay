# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Console Overlay is a Chrome/Edge Browser Extension (Manifest V3) for live console output monitoring. It intercepts all 15 console methods (`log/warn/error/info/debug/table/dir/dirxml/trace/assert/count/countReset/time/timeLog/timeEnd/group/groupCollapsed/groupEnd/clear`), unhandled errors, promise rejections, and network errors (HTTP 4xx/5xx) and displays them in a draggable, resizable overlay window.

## Build & Development

No build process. Load directly as unpacked extension in `chrome://extensions/` (developer mode).

```bash
# ZIP for release
zip -r console-overlay.zip . -x ".*" -x "__MACOSX" -x "*.git*"
```

Testing: Open `demo.html` in browser with extension loaded.

## Architecture

### Message Flow

```
Website Console → injected.js → postMessage → content.js → Overlay UI
```

### Component Responsibilities

- **injected.js** — Runs in **page context** via `world: "MAIN"` (injected synchronously before page scripts). Wraps all native console methods and network APIs (XHR, fetch). Buffers up to 1000 logs. Sends log data via `window.postMessage` to content script. Uses `window.__consoleOverlayInitialized` guard against double init.

- **content.js** — Runs as **content script**. Creates and manages the overlay UI inside a **Shadow DOM** (`mode: open`) so page CSS cannot bleed in or out. `overlay.css` is loaded into the shadow root via a `<link>` (declared in `web_accessible_resources`). Logs render **incrementally** (`appendLogEntry`, O(1) per log); a full rebuild (`renderLogs`) happens only on filter change, buffer load, or clear. DOM nodes are capped at 1000 (oldest removed). Handles drag/drop, resize (8 handles), minimize/maximize, opacity. Persists window state (position, size, opacity, **filters**, min/max) to `chrome.storage.local`. The un-maximized geometry is tracked separately (`normalGeometry`) so un-maximizing always restores the real previous box, even after a reload.

- **background.js** — Minimal service worker. Sets default `isEnabled: false` on install. Responds to `getState` messages from popup. Listens to `chrome.commands.onCommand` (keyboard shortcut `toggle-overlay`, default `Alt+Shift+L`) and forwards a `toggleOverlay` message to the active tab.

- **popup.js / popup.html** — Extension popup with toggle switch. Sends `toggleOverlay` message to content script via `chrome.tabs.sendMessage`. Validates tab URL (no `chrome://`, `edge://`, `about:` pages). Shows the live keyboard shortcut via `chrome.commands.getAll()`.

- **overlay.css** — VS Code-inspired dark theme, loaded **inside the Shadow DOM**. Uses `:host` + isolated selectors (no page-wide prefix needed — the shadow root provides isolation).

### Key State

```javascript
// Log format passed between injected.js and content.js
{ type: 'log'|'warn'|'error'|'info'|'debug', message: string, timestamp: ISO-string, stack: string|null }

// Persisted in chrome.storage.local
{ isEnabled: bool, overlayState: { left, top, width, height, opacity, opacityValue, filters: {log,info,warn,error,debug}, isMinimized, isMaximized } }
```

`injected.js` formats arguments DevTools-style: `Error` → `.stack`, DOM nodes → tag selector, circular objects → `[Circular]`, printf specifiers (`%s %d %i %f %o %O %c %%`) resolved, messages truncated at 8000 chars.

## Code Conventions

- **Vanilla JS only** — no frameworks or libraries
- **IIFE pattern** — all files wrapped in self-executing functions for isolation
- **`'use strict'`** in all files
- **Version string** appears in `manifest.json`, `content.js`, `injected.js`, `popup.js`, and `CLAUDE.md` — update all when bumping

## Common Modification Patterns

### Adding a new log type
1. `injected.js`: Extend `interceptConsole()` with new console method wrapper
2. `content.js`: Add filter checkbox in `createOverlay()` HTML, add the type to `FILTER_TYPES`
3. `overlay.css`: Add color styling for the new type

### Adding a UI element
1. `content.js`: Add HTML in `createOverlay()`, register listener in `attachEventListeners()`
2. `overlay.css`: Add styling

### Adding persisted state
1. `content.js`: Add to `saveState()` and `loadState()`

## Limitations

- Max 1000 logs (FIFO buffer)
- Cannot run on `chrome://`, `edge://`, `about:` pages
