# Console Overlay - Development Guide

## Projektübersicht

Console Overlay ist eine Chrome/Edge Browser-Extension zur Live-Überwachung von Console-Ausgaben. Sie ermöglicht Entwicklern das Anzeigen, Filtern und Kopieren von Console-Logs in einem praktischen Overlay-Fenster.

## Architektur

```
console-overlay/
├── manifest.json       # Extension-Konfiguration (Manifest V3)
├── background.js       # Service Worker für Extension-Events
├── content.js          # Hauptlogik: Overlay-Management, UI, Events
├── injected.js         # Console-Interception im Page Context
├── overlay.css         # Styling (Dark Theme, VS Code-inspiriert)
├── popup.html/js       # Extension-Popup mit Toggle-Switch
├── icons/              # Extension-Icons (16, 48, 128px)
├── demo.html           # Demo-Seite zum Testen
└── test.html           # Test-Seite für Entwicklung
```

## Kernkomponenten

### content.js (Hauptlogik)
- **Overlay-Erstellung**: Erstellt das UI-Fenster mit Drag & Drop, Resize
- **Event-Handling**: Mouse-Events für Verschieben/Größenänderung
- **State-Management**: Speichert Fensterposition in `chrome.storage.local`
- **Log-Rendering**: Filtert und zeigt Logs an
- **Message-Handling**: Empfängt Logs von `injected.js` via `postMessage`

### injected.js (Console-Interception)
- **Console-Wrapping**: Überschreibt `console.log/warn/error/info/debug`
- **Buffer**: Speichert bis zu 1000 Logs vor Overlay-Aktivierung
- **Error-Handling**: Fängt `window.onerror` und `unhandledrejection`
- **Message-Bridge**: Sendet Logs via `postMessage` an Content Script

### overlay.css
- **Dark Theme**: VS Code-inspiriertes Design
- **Animations**: Smooth Transitions für UI-Elemente
- **Responsive**: Resize-Handles an allen Kanten

## Entwicklung

### Lokale Installation
```bash
# 1. Repo klonen
git clone https://github.com/pepperonas/console-overlay.git

# 2. In Chrome/Edge laden
# chrome://extensions/ → Entwicklermodus → "Entpackte Erweiterung laden"
```

### Debugging
- **Content Script**: DevTools → Console auf der Seite
- **Background**: chrome://extensions → "Service Worker inspizieren"
- **Popup**: Rechtsklick auf Icon → "Popup prüfen"

### Testen
- `demo.html` im Browser öffnen
- Extension aktivieren
- Console-Ausgaben werden im Overlay angezeigt

## Wichtige Patterns

### Message-Flow
```
Webseite Console → injected.js → postMessage → content.js → Overlay UI
```

### State Persistence
```javascript
// Speichern
chrome.storage.local.set({ overlayState: {...} });

// Laden
chrome.storage.local.get(['overlayState'], (result) => {...});
```

### Log-Format
```javascript
{
  type: 'log' | 'warn' | 'error' | 'info' | 'debug',
  message: string,
  timestamp: ISO-String,
  stack: string | null
}
```

## Grenzen & Limitierungen

- **Max 1000 Logs**: Ältere werden automatisch entfernt
- **Keine chrome:// Seiten**: Extension kann dort nicht injizieren
- **Erstaktivierung**: Erfordert Page-Reload für Console-Interception

## Code-Konventionen

- **Vanilla JS**: Keine Frameworks/Libraries
- **IIFE-Pattern**: Selbstausführende Funktionen zur Isolation
- **'use strict'**: Strict Mode in allen Dateien
- **Event-Delegation**: Wo möglich für Performance

## Häufige Änderungen

### Neuen Log-Typ hinzufügen
1. `injected.js`: `interceptConsole()` erweitern
2. `content.js`: Filter-Checkbox hinzufügen
3. `overlay.css`: Styling für neuen Typ

### UI-Element hinzufügen
1. `content.js`: HTML in `createOverlay()` ergänzen
2. `overlay.css`: Styling hinzufügen
3. Event-Listener in `attachEventListeners()` registrieren

### Storage-Wert hinzufügen
1. `saveState()`: Neuen Wert speichern
2. `loadState()`: Wert beim Start laden

## Build & Release

Kein Build-Prozess erforderlich. Direkt als entpackte Extension laden oder als .zip verpacken für Distribution.

```bash
# ZIP für Release erstellen
zip -r console-overlay.zip . -x ".*" -x "__MACOSX" -x "*.git*"
```

## Version

Aktuelle Version: **1.2.5** (siehe manifest.json)

## Kontakt

**Martin Pfeffer**
martin.pfeffer@celox.io
https://celox.io
