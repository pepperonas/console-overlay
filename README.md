# Console Overlay - Chrome Extension

Live Console Output Overlay für Chrome/Edge - Capture und kopiere Console Logs komfortabel!

## Features

✨ **Live Console Monitoring**
- Erfasst console.log, warn, error, info, debug in Echtzeit
- Zeigt unbehandelte Fehler und Promise Rejections
- Timestamps für jeden Log-Eintrag

🪟 **Vollwertiges Fenster**
- Drag & Drop zum Verschieben
- Resize-Handle zum Größe ändern
- Minimieren / Maximieren
- Schließen-Button
- Fensterposition wird gespeichert

🎯 **Intelligentes Filtering**
- Filter nach Log-Typ (Log, Info, Warn, Error, Debug)
- Farbcodierte Log-Typen
- Auto-Scroll zu neuen Einträgen

📋 **Einfaches Kopieren**
- Einzelne Logs per Klick kopieren
- "Copy All" für alle gefilterten Logs
- Timestamps inkludiert

🎨 **Modernes Dark Theme**
- VS Code inspiriertes Design
- Professionelle Benutzeroberfläche
- Smooth Animations

## Installation

### Entwicklermodus

1. Chrome/Edge öffnen
2. Navigiere zu `chrome://extensions/` (oder `edge://extensions/`)
3. Aktiviere "Entwicklermodus" (oben rechts)
4. Klicke auf "Entpackte Erweiterung laden"
5. Wähle den `console-overlay` Ordner aus

### Als .zip

Alternativ kannst du den Ordner als .zip packen und über "Erweiterungen verwalten" installieren.

## Verwendung

### Aktivierung

1. Klicke auf das Extension-Icon in der Toolbar
2. Aktiviere den Toggle-Switch "Enable Overlay"
3. Das Overlay erscheint unten rechts auf der Seite

### Fenster-Bedienung

**Verschieben:**
- Ziehe das Fenster an der Titelleiste

**Größe ändern:**
- Ziehe am Resize-Handle (unten rechts)
- Minimum: 400x300px

**Maximieren:**
- Klick auf das □ Symbol
- Oder: Doppelklick auf die Titelleiste

**Minimieren:**
- Klick auf das − Symbol
- Zeigt nur die Titelleiste

**Schließen:**
- Klick auf das × Symbol
- Oder: Deaktiviere den Toggle im Popup

### Logs verwalten

**Filter anwenden:**
- Nutze die Checkboxen in der Toolbar
- Log / Info / Warn / Error / Debug

**Logs kopieren:**
- 📋 Symbol bei einzelnen Logs
- "Copy All" Button für alle gefilterten Logs

**Logs löschen:**
- "Clear" Button in der Toolbar

## Tastenkombinationen

- **Doppelklick auf Titelleiste:** Maximieren/Wiederherstellen
- **Strg+C auf Log:** Kopiert den Log-Text (im Overlay)

## Technische Details

### Architektur

```
manifest.json          → Extension Configuration
background.js          → Service Worker
content.js            → Main Logic & Overlay Management
injected.js           → Console Interception
overlay.css           → Styling
popup.html/js         → Extension Control Panel
```

### Console Interception

Das Plugin injiziert ein Script in die Seite, das die nativen Console-Methoden wrapped:
- `console.log()` → weiterhin funktionsfähig
- Zusätzlich: Nachricht an Content Script
- Keine Performance-Einbußen

### Erfasste Events

- `console.log()`
- `console.warn()`
- `console.error()`
- `console.info()`
- `console.debug()`
- `window.onerror` (Unhandled Errors)
- `window.onunhandledrejection` (Promise Rejections)

### Storage

Das Plugin speichert:
- Fensterposition
- Fenstergröße
- Minimiert/Maximiert Status
- Aktivierungsstatus

Gespeichert in `chrome.storage.local` - bleibt über Sessions hinweg erhalten.

## Limitations

- Max. 1000 Logs im Speicher (älteste werden automatisch entfernt)
- Funktioniert nur auf Webseiten (nicht auf chrome:// oder edge:// Seiten)
- Erfordert Reload bei erstmaliger Aktivierung

## Browser-Kompatibilität

✅ **Chrome** 88+
✅ **Edge** 88+
✅ **Brave** (Chromium-basiert)
✅ **Opera** (Chromium-basiert)

## Entwicklung

### Projekt-Struktur

```
console-overlay/
├── manifest.json
├── background.js
├── content.js
├── injected.js
├── overlay.css
├── popup.html
├── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Debug-Modus

Console Output des Extensions:
1. Rechtsklick auf Extension Icon → "Inspect Popup"
2. Oder: chrome://extensions → "Details" → "Hintergrundseite prüfen"

## Changelog

### Version 1.2.2 (2026-01-17)
- Fix: Alle 8 Resize-Handles (nw, n, ne, w, e, sw, s, se) funktionieren jetzt korrekt
- Fix: Minimize/Maximize State-Management getrennt (verhindert State-Überschreibung)
- Fix: Popup zeigt Fehlermeldung auf chrome:// und edge:// Seiten
- Fix: Fensterposition wird korrekt wiederhergestellt nach Maximize

### Version 1.2.1 (2026-01-17)
- Opacity-Slider hinzugefügt
- Verbessertes State-Management

### Version 1.0.0 (2026-01-17)
- Initial Release
- Live Console Monitoring
- Drag & Drop Window
- Resize Functionality
- Minimize/Maximize
- Log Filtering
- Copy Functionality
- Dark Theme
- State Persistence

## Roadmap

- [ ] Exportiere Logs als JSON/CSV
- [ ] Suchfunktion in Logs
- [ ] Regular Expression Filtering
- [ ] Keyboard Shortcuts
- [ ] Themes (Light/Dark/Custom)
- [ ] Network Request Logging
- [ ] Performance Metrics

## Lizenz

MIT License - Frei verwendbar für private und kommerzielle Projekte.

## Kontakt

**Martin Pfeffer**  
Senior Software Developer  
celox.io

Bei Fragen oder Problemen, erstelle ein Issue oder kontaktiere mich direkt.

---

**© 2026 Martin Pfeffer | celox.io**
