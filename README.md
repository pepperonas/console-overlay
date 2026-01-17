# Console Overlay - Chrome Extension

[![Version](https://img.shields.io/badge/version-1.2.4-blue.svg)](https://github.com/pepperonas/console-overlay)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-88%2B-yellow.svg)](https://www.google.com/chrome/)
[![Edge](https://img.shields.io/badge/Edge-88%2B-blue.svg)](https://www.microsoft.com/edge)

Live Console Output Overlay für Chrome/Edge - Capture und kopiere Console Logs komfortabel!

![Console Overlay Screenshot](https://raw.githubusercontent.com/pepperonas/console-overlay/main/icons/icon128.png)

## Features

### Live Console Monitoring
- Erfasst `console.log`, `warn`, `error`, `info`, `debug` in Echtzeit
- Zeigt unbehandelte Fehler und Promise Rejections
- Timestamps für jeden Log-Eintrag
- Buffer für Logs vor Overlay-Aktivierung

### Vollwertiges Fenster
- **Drag & Drop** - Verschieben per Titelleiste
- **Resize** - 8 Resize-Handles an allen Kanten und Ecken
- **Minimieren/Maximieren** - Fenster-Controls wie bei Desktop-Apps
- **Opacity-Slider** - Transparenz von 20% bis 100%
- **State Persistence** - Position und Größe werden gespeichert

### Intelligentes Filtering
- Filter nach Log-Typ (Log, Info, Warn, Error, Debug)
- Farbcodierte Log-Typen für schnelle Übersicht
- Auto-Scroll zu neuen Einträgen

### Einfaches Kopieren
- Einzelne Logs per Klick kopieren
- "Copy All" für alle gefilterten Logs
- Timestamps inkludiert

### Modernes Dark Theme
- VS Code inspiriertes Design
- Professionelle Benutzeroberfläche
- Smooth Animations

## Installation

### Option 1: Entwicklermodus (empfohlen)

1. Repository klonen oder herunterladen:
   ```bash
   git clone https://github.com/pepperonas/console-overlay.git
   ```
2. Chrome/Edge öffnen
3. Navigiere zu `chrome://extensions/` (oder `edge://extensions/`)
4. Aktiviere **"Entwicklermodus"** (oben rechts)
5. Klicke auf **"Entpackte Erweiterung laden"**
6. Wähle den `console-overlay` Ordner aus

### Option 2: ZIP-Installation

1. Lade das Repository als ZIP herunter
2. Entpacke die Datei
3. Folge Schritten 2-6 von Option 1

## Verwendung

### Aktivierung

1. Klicke auf das Extension-Icon in der Toolbar
2. Aktiviere den Toggle-Switch **"Enable Overlay"**
3. Das Overlay erscheint auf der Seite

### Fenster-Bedienung

| Aktion | Beschreibung |
|--------|--------------|
| **Verschieben** | Ziehe das Fenster an der Titelleiste |
| **Größe ändern** | Ziehe an einer der 8 Kanten/Ecken (Min: 400x300px) |
| **Maximieren** | Klick auf □ oder Doppelklick auf Titelleiste |
| **Minimieren** | Klick auf − (zeigt nur Titelleiste) |
| **Schließen** | Klick auf × oder Toggle im Popup |
| **Transparenz** | Opacity-Slider in der Toolbar |

### Logs verwalten

- **Filter**: Checkboxen für Log / Info / Warn / Error / Debug
- **Kopieren**: 📋 bei einzelnen Logs oder "Copy All"
- **Löschen**: "Clear" Button

## Architektur

```
console-overlay/
├── manifest.json      # Extension-Konfiguration (Manifest V3)
├── background.js      # Service Worker
├── content.js         # Overlay-Management & UI
├── injected.js        # Console-Interception im Page Context
├── overlay.css        # Dark Theme Styling
├── popup.html/js      # Extension-Popup
├── icons/             # Extension-Icons
├── demo.html          # Demo-Seite
└── CLAUDE.md          # Entwickler-Guide
```

### Datenfluss

```
Website Console → injected.js → postMessage → content.js → Overlay UI
```

### Erfasste Events

- `console.log()`, `console.warn()`, `console.error()`
- `console.info()`, `console.debug()`
- `window.onerror` (Unhandled Errors)
- `window.onunhandledrejection` (Promise Rejections)
- **XMLHttpRequest** Fehler (4xx, 5xx)
- **Fetch API** Fehler (4xx, 5xx, Network Errors)

## Browser-Kompatibilität

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 88+ | ✅ Vollständig unterstützt |
| Edge | 88+ | ✅ Vollständig unterstützt |
| Brave | Latest | ✅ Unterstützt |
| Opera | Latest | ✅ Unterstützt |

## Limitierungen

- Max. 1000 Logs im Speicher (FIFO)
- Nicht verfügbar auf `chrome://`, `edge://`, `about:` Seiten
- Erfordert Page-Reload bei erstmaliger Aktivierung

## Changelog

### v1.2.4 (2026-01-17)
- Version sync across all files

### v1.2.3 (2026-01-17)
- **Neu**: Network Error Monitoring (HTTP 4xx/5xx)
- **Neu**: XMLHttpRequest Fehler werden erfasst
- **Neu**: Fetch API Fehler werden erfasst
- **Fix**: Doppelte Initialisierung verhindert

### v1.2.2 (2026-01-17)
- **Fix**: Alle 8 Resize-Handles funktionieren korrekt
- **Fix**: Separates State-Management für Minimize/Maximize
- **Fix**: Popup-Validierung für System-Seiten
- **Fix**: Fensterposition nach Maximize korrekt wiederhergestellt

### v1.2.1 (2026-01-17)
- Opacity-Slider hinzugefügt
- Verbessertes State-Management

### v1.0.0 (2026-01-17)
- Initial Release

## Roadmap

- [ ] Export als JSON/CSV
- [ ] Suchfunktion
- [ ] Regex-Filter
- [ ] Keyboard Shortcuts
- [ ] Light Theme
- [ ] Network Request Logging

## Lizenz

MIT License - Frei verwendbar für private und kommerzielle Projekte.

## Autor

**Martin Pfeffer**
Senior Software Developer
[celox.io](https://celox.io)

---

Bei Fragen oder Problemen: [Issue erstellen](https://github.com/pepperonas/console-overlay/issues)
